import { NotificationThresholdService } from './notification-threshold-service'
import { AttachmentRulesService } from './attachment-rules-service'
import type { NotificationThreshold } from '@/lib/models/collection/notification-threshold'
import type { ResolvedAttachment } from '@/lib/models/collection/attachment-rule'

export interface ProcessedClient {
  execution_id?: string
  customer_id?: string | null
  invoices?: any[] | null
  custom_data?: Record<string, any>
  status?: string
  email_template_id?: string
  threshold_id?: string
  attachments?: ResolvedAttachment[]
}

export interface ClientProcessorParams {
  clients: any[]
  business_account_id: string
  execution_id?: string
}

/**
 * Service for processing collection clients with threshold-based template assignment
 */
export const ClientProcessor = {
  /**
   * Process clients and assign templates based on days overdue
   */
  async processClientsWithThresholds(
    params: ClientProcessorParams
  ): Promise<ProcessedClient[]> {
    const processedClients: ProcessedClient[] = []

    for (const clientData of params.clients) {
      try {
        // Get days_overdue from custom_data (pre-calculated from CSV)
        const daysOverdue = clientData.custom_data?.total_days_overdue || 0

        // Determine threshold based on days
        const threshold =
          await NotificationThresholdService.getThresholdForDays(
            params.business_account_id,
            daysOverdue
          )

        if (!threshold) {
          console.warn(`No threshold found for ${daysOverdue} days`)
          // Still include the client but without specific template
          processedClients.push({
            execution_id: params.execution_id,
            customer_id: clientData.customer?.id,
            invoices: clientData.invoices,
            custom_data: {
              ...clientData.custom_data,
              days_overdue: daysOverdue,
            },
            status: 'pending',
          })
          continue
        }

        // Resolve attachments based on rules
        const attachments = await AttachmentRulesService.resolveAttachmentsForClient(
          {
            business_account_id: params.business_account_id,
            threshold_id: threshold.id,
            customer_category_id: clientData.customer?.category_id,
            customer_id: clientData.customer?.id,
            days_overdue: daysOverdue,
            invoice_amount: clientData.custom_data?.total_amount_due,
          }
        )

        // Create processed client with threshold-specific template
        processedClients.push({
          execution_id: params.execution_id,
          customer_id: clientData.customer?.id,
          invoices: clientData.invoices,
          email_template_id: threshold.email_template_id,
          threshold_id: threshold.id,
          custom_data: {
            ...clientData.custom_data,
            days_overdue: daysOverdue,
            threshold_name: threshold.name,
          },
          status: 'pending',
          attachments,
        })
      } catch (error) {
        console.error('Error processing client:', error)
        // Include client even if processing failed
        processedClients.push({
          execution_id: params.execution_id,
          customer_id: clientData.customer?.id,
          invoices: clientData.invoices,
          custom_data: clientData.custom_data,
          status: 'pending',
        })
      }
    }

    return processedClients
  },

  /**
   * Get threshold info for a list of clients (for preview/debugging)
   */
  async getThresholdsForClients(
    clients: any[],
    businessAccountId: string
  ): Promise<
    Map<
      string,
      {
        client: any
        threshold: NotificationThreshold | null
        daysOverdue: number
      }
    >
  > {
    const results = new Map()

    for (const client of clients) {
      const daysOverdue = client.custom_data?.total_days_overdue || 0
      const threshold =
        await NotificationThresholdService.getThresholdForDays(
          businessAccountId,
          daysOverdue
        )

      const key = client.customer?.id || client.id || Math.random().toString()
      results.set(key, {
        client,
        threshold,
        daysOverdue,
      })
    }

    return results
  },
}
