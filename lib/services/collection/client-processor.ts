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
  business_id: string
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
        // Get days_overdue from client.total (set during file parsing)
        const daysOverdue = clientData.total?.total_days_overdue || 0

        console.log(`[ClientProcessor] Processing client ${clientData.nit || clientData.customer?.nit}, daysOverdue: ${daysOverdue}, business_id: ${params.business_id}`)

        // Determine threshold based on days
        const threshold =
          await NotificationThresholdService.getThresholdForDays(
            params.business_id,
            daysOverdue
          )

        console.log(`[ClientProcessor] daysOverdue: ${daysOverdue}, Threshold found:`, threshold ? {
          id: threshold.id,
          name: threshold.name,
          days_from: threshold.days_from,
          days_to: threshold.days_to,
          email_template_id: threshold.email_template_id
        } : 'NULL')

        if (!threshold) {
          console.warn(`No threshold found for ${daysOverdue} days`)
          // Still include the client but without specific template
          processedClients.push({
            execution_id: params.execution_id,
            customer_id: clientData.customer?.id,
            invoices: clientData.invoices,
            custom_data: {
              nit: clientData.nit,
              total_amount_due: clientData.total?.total_amount_due,
              total_days_overdue: clientData.total?.total_days_overdue,
              total_invoices: clientData.total?.total_invoices,
              days_overdue: daysOverdue,
              // Include customer data for email rendering in worker
              email: clientData.customer?.email,
              full_name: clientData.customer?.full_name,
              phone: clientData.customer?.phone,
              company_name: clientData.customer?.company_name,
            },
            status: 'pending',
          })
          continue
        }

        // Resolve attachments based on rules
        const attachments = await AttachmentRulesService.resolveAttachmentsForClient(
          {
            business_id: params.business_id,
            threshold_id: threshold.id,
            customer_category_id: clientData.customer?.category_id,
            customer_id: clientData.customer?.id,
            days_overdue: daysOverdue,
            invoice_amount: clientData.total?.total_amount_due,
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
            nit: clientData.nit,
            total_amount_due: clientData.total?.total_amount_due,
            total_days_overdue: clientData.total?.total_days_overdue,
            total_invoices: clientData.total?.total_invoices,
            days_overdue: daysOverdue,
            threshold_name: threshold.name,
            // Include customer data for email rendering in worker
            email: clientData.customer?.email,
            full_name: clientData.customer?.full_name,
            phone: clientData.customer?.phone,
            company_name: clientData.customer?.company_name,
          },
          status: 'pending',
          attachments,
        })
      } catch (error) {
        console.error('Error processing client:', error)
        // Include client even if processing failed - use fallback template
        const fallbackThreshold = await NotificationThresholdService.getThresholdForDays(
          params.business_id,
          clientData.total?.total_days_overdue || 0
        )
        
        processedClients.push({
          execution_id: params.execution_id,
          customer_id: clientData.customer?.id,
          invoices: clientData.invoices,
          email_template_id: fallbackThreshold?.email_template_id,
          threshold_id: fallbackThreshold?.id,
          custom_data: {
            nit: clientData.nit,
            total_amount_due: clientData.total?.total_amount_due,
            total_days_overdue: clientData.total?.total_days_overdue,
            total_invoices: clientData.total?.total_invoices,
            days_overdue: clientData.total?.total_days_overdue || 0,
            // Include customer data for email rendering in worker
            email: clientData.customer?.email,
            full_name: clientData.customer?.full_name,
            phone: clientData.customer?.phone,
            company_name: clientData.customer?.company_name,
          },
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
