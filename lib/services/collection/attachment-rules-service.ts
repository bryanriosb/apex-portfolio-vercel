import {
  fetchAttachmentRulesAction,
  fetchRulesByAttachmentAction,
  createAttachmentRuleAction,
  updateAttachmentRuleAction,
  deleteAttachmentRuleAction,
  resolveAttachmentsForClientAction,
  saveAttachmentRulesAction,
  fetchGlobalAttachmentRulesAction,
  type AttachmentRuleListResponse,
} from '@/lib/actions/collection/attachment-rules'
import type {
  AttachmentRule,
  AttachmentRuleInsert,
  ResolvedAttachment,
} from '@/lib/models/collection/attachment-rule'

/**
 * Service for Attachment Rules management
 */
export const AttachmentRulesService = {
  async fetchRules(
    businessId: string
  ): Promise<AttachmentRuleListResponse> {
    return await fetchAttachmentRulesAction(businessId)
  },

  async fetchRulesByAttachment(attachmentId: string): Promise<AttachmentRule[]> {
    return await fetchRulesByAttachmentAction(attachmentId)
  },

  async fetchGlobalRules(businessId: string): Promise<AttachmentRule[]> {
    return await fetchGlobalAttachmentRulesAction(businessId)
  },

  async createRule(data: AttachmentRuleInsert): Promise<AttachmentRule> {
    const result = await createAttachmentRuleAction(data)
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Error al crear la regla')
    }
    return result.data
  },

  async updateRule(
    id: string,
    data: Partial<AttachmentRuleInsert>
  ): Promise<AttachmentRule> {
    const result = await updateAttachmentRuleAction(id, data)
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Error al actualizar la regla')
    }
    return result.data
  },

  async deleteRule(id: string): Promise<void> {
    const result = await deleteAttachmentRuleAction(id)
    if (!result.success) {
      throw new Error(result.error || 'Error al eliminar la regla')
    }
  },

  async resolveAttachmentsForClient(params: {
    business_id: string
    threshold_id?: string
    customer_category_id?: string
    customer_id?: string
    days_overdue?: number
    invoice_amount?: number
  }): Promise<ResolvedAttachment[]> {
    return await resolveAttachmentsForClientAction(params)
  },

  async saveRulesForAttachment(
    attachmentId: string,
    businessId: string,
    rules: Omit<AttachmentRuleInsert, 'attachment_id' | 'business_id'>[]
  ): Promise<void> {
    const result = await saveAttachmentRulesAction(
      attachmentId,
      businessId,
      rules
    )
    if (!result.success) {
      throw new Error(result.error || 'Error al guardar las reglas')
    }
  },

  /**
   * Batch resolve attachments for multiple clients
   */
  async resolveAttachmentsForClients(
    clients: any[],
    businessId: string
  ): Promise<Map<string, ResolvedAttachment[]>> {
    const results = new Map<string, ResolvedAttachment[]>()

    for (const client of clients) {
      const attachments = await this.resolveAttachmentsForClient({
        business_id: businessId,
        threshold_id: client.threshold_id,
        customer_category_id: client.customer?.category_id,
        customer_id: client.customer?.id,
        days_overdue: client.custom_data?.total_days_overdue,
        invoice_amount: client.custom_data?.total_amount_due,
      })

      results.set(client.id || client.customer?.id, attachments)
    }

    return results
  },
}
