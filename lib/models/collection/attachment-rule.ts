export type AttachmentRuleType = 
  | 'global'
  | 'threshold'
  | 'customer_category'
  | 'customer'
  | 'execution'

export interface AttachmentRuleConditions {
  min_amount?: number
  max_amount?: number
}

export interface AttachmentRule {
  id: string
  attachment_id: string
  business_account_id: string
  rule_type: AttachmentRuleType
  rule_entity_id?: string | null
  is_required: boolean
  display_order: number
  conditions: AttachmentRuleConditions
  created_at: string
  updated_at: string
}

export interface AttachmentRuleInsert {
  attachment_id: string
  business_account_id: string
  rule_type: AttachmentRuleType
  rule_entity_id?: string | null
  is_required?: boolean
  display_order?: number
  conditions?: AttachmentRuleConditions
}

export interface ResolvedAttachment {
  attachment_id: string
  attachment_name: string
  storage_path: string
  storage_bucket: string
  document_type: string
  is_required: boolean
  rule_type: string
  display_order: number
}
