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

const DEFAULT_CHUNK_SIZE = 1000

/**
 * Find the matching threshold for a given days overdue value
 * Uses linear search (efficient for small threshold sets, typically < 10)
 */
function findThresholdForDays(
  thresholds: NotificationThreshold[],
  daysOverdue: number
): NotificationThreshold | null {
  for (const threshold of thresholds) {
    const daysFrom = threshold.days_from
    const daysTo = threshold.days_to ?? Infinity
    
    if (daysOverdue >= daysFrom && daysOverdue <= daysTo) {
      return threshold
    }
  }
  return null
}

/**
 * Process clients in chunks to avoid blocking the event loop
 */
async function processInChunks<T, R>(
  items: T[],
  processor: (chunk: T[]) => Promise<R[]>,
  chunkSize: number = DEFAULT_CHUNK_SIZE
): Promise<R[]> {
  const results: R[] = []
  
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize)
    const chunkResults = await processor(chunk)
    results.push(...chunkResults)
    
    // Allow event loop to process other tasks
    if (i + chunkSize < items.length) {
      await new Promise(resolve => setImmediate(resolve))
    }
  }
  
  return results
}

/**
 * Service for processing collection clients with threshold-based template assignment
 */
export const ClientProcessor = {
  /**
   * Process clients and assign templates based on days overdue
   * Optimized for large volumes: 1 DB call for thresholds, batch attachment resolution
   */
  async processClientsWithThresholds(
    params: ClientProcessorParams
  ): Promise<ProcessedClient[]> {
    const processedClients: ProcessedClient[] = []

    console.log(`[ClientProcessor] Starting batch processing of ${params.clients.length} clients`)

    // 1. Fetch all thresholds once (1 DB call instead of N)
    const thresholdsResponse = await NotificationThresholdService.fetchThresholds(
      params.business_id
    )
    const thresholds = thresholdsResponse.data
    console.log(`[ClientProcessor] Fetched ${thresholds.length} thresholds`)

    // Pre-sort thresholds by days_from for consistent matching
    const sortedThresholds = [...thresholds].sort((a, b) => a.days_from - b.days_from)

    // 2. Assign thresholds to all clients in memory
    const clientsWithThresholds = params.clients.map(clientData => {
      const daysOverdue = clientData.total?.total_days_overdue || 0
      const threshold = findThresholdForDays(sortedThresholds, daysOverdue)
      
      return {
        clientData,
        daysOverdue,
        threshold,
      }
    })

    // 3. Batch resolve attachments for all clients with thresholds
    const clientsWithAttachments = await this.resolveAttachmentsBatch(
      clientsWithThresholds,
      params.business_id
    )

    // 4. Build processed client results
    for (const { clientData, daysOverdue, threshold, attachments } of clientsWithAttachments) {
      try {
        if (!threshold) {
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
              emails: clientData.customer?.emails ?? [],
              full_name: clientData.customer?.full_name,
              phone: clientData.customer?.phone,
              company_name: clientData.customer?.company_name,
            },
            status: 'pending',
          })
          continue
        }

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
            emails: clientData.customer?.emails ?? [],
            full_name: clientData.customer?.full_name,
            phone: clientData.customer?.phone,
            company_name: clientData.customer?.company_name,
          },
          status: 'pending',
          attachments,
        })
      } catch (error) {
        console.error('Error processing client:', error)
        // Include client even if processing failed
        const fallbackThreshold = findThresholdForDays(
          sortedThresholds,
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
            emails: clientData.customer?.emails ?? [],
            full_name: clientData.customer?.full_name,
            phone: clientData.customer?.phone,
            company_name: clientData.customer?.company_name,
          },
          status: 'pending',
        })
      }
    }

    console.log(`[ClientProcessor] Processed ${processedClients.length} clients`)
    return processedClients
  },

  /**
   * Batch resolve attachments for multiple clients using the bulk RPC function
   * This reduces N DB calls to 1 DB call
   */
  async resolveAttachmentsBatch(
    clientsWithThresholds: Array<{
      clientData: any
      daysOverdue: number
      threshold: NotificationThreshold | null
    }>,
    businessId: string
  ): Promise<Array<{
    clientData: any
    daysOverdue: number
    threshold: NotificationThreshold | null
    attachments: ResolvedAttachment[]
  }>> {
    // Filter clients that have thresholds
    const clientsNeedingAttachments = clientsWithThresholds.filter(
      c => c.threshold !== null
    )

    if (clientsNeedingAttachments.length === 0) {
      return clientsWithThresholds.map(c => ({ ...c, attachments: [] }))
    }

    // Build batch input for RPC
    const batchInput = clientsNeedingAttachments.map(({ clientData, threshold, daysOverdue }) => ({
      client_id: clientData.customer?.id || clientData.nit,
      threshold_id: threshold?.id,
      customer_category_id: clientData.customer?.category_id,
      customer_id: clientData.customer?.id,
      days_overdue: daysOverdue,
      invoice_amount: clientData.total?.total_amount_due || 0,
    }))

    console.log(`[ClientProcessor] Resolving attachments for ${batchInput.length} clients in batch`)

    // Call batch RPC function
    const attachmentsMap = await AttachmentRulesService.resolveAttachmentsBulk(
      businessId,
      batchInput
    )

    // Map attachments back to clients
    return clientsWithThresholds.map(item => {
      const clientId = item.clientData.customer?.id || item.clientData.nit
      const attachments = attachmentsMap.get(clientId) || []
      return { ...item, attachments }
    })
  },

  /**
   * Get threshold info for a list of clients (for preview/debugging)
   * Optimized: 1 DB call for all thresholds, in-memory matching
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

    // Fetch all thresholds once
    const thresholdsResponse = await NotificationThresholdService.fetchThresholds(
      businessAccountId
    )
    const sortedThresholds = [...thresholdsResponse.data].sort(
      (a, b) => a.days_from - b.days_from
    )

    // Process all clients in memory
    for (const client of clients) {
      const daysOverdue = client.custom_data?.total_days_overdue || 0
      const threshold = findThresholdForDays(sortedThresholds, daysOverdue)

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
