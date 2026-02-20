'use server'

import {
  getRecordById,
  insertRecord,
  updateRecord,
  deleteRecord,
  getSupabaseAdminClient,
} from '@/lib/actions/supabase'
import type {
  AttachmentRule,
  AttachmentRuleInsert,
  AttachmentRuleType,
  ResolvedAttachment,
} from '@/lib/models/collection/attachment-rule'

export interface AttachmentRuleListResponse {
  data: AttachmentRule[]
  total: number
}

/**
 * Fetch all attachment rules for a business account
 */
export async function fetchAttachmentRulesAction(
  businessAccountId: string
): Promise<AttachmentRuleListResponse> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { data, error, count } = await supabase
      .from('attachment_rules')
      .select(
        `*,
        attachment:attachment_id(id, name, file_type, storage_path, storage_bucket)`,
        { count: 'exact' }
      )
      .eq('business_account_id', businessAccountId)
      .order('display_order', { ascending: true })

    if (error) throw error

    return {
      data: data || [],
      total: count || 0,
    }
  } catch (error) {
    console.error('Error fetching attachment rules:', error)
    return { data: [], total: 0 }
  }
}

/**
 * Fetch rules by attachment ID
 */
export async function fetchRulesByAttachmentAction(
  attachmentId: string
): Promise<AttachmentRule[]> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { data, error } = await supabase
      .from('attachment_rules')
      .select('*')
      .eq('attachment_id', attachmentId)
      .order('display_order', { ascending: true })

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('Error fetching rules by attachment:', error)
    return []
  }
}

/**
 * Get rule by ID
 */
export async function getAttachmentRuleByIdAction(
  id: string
): Promise<AttachmentRule | null> {
  try {
    return await getRecordById<AttachmentRule>('attachment_rules', id)
  } catch (error) {
    console.error('Error fetching attachment rule:', error)
    return null
  }
}

/**
 * Create attachment rule
 */
export async function createAttachmentRuleAction(
  data: AttachmentRuleInsert
): Promise<{ success: boolean; data?: AttachmentRule; error?: string }> {
  try {
    const rule = await insertRecord<AttachmentRule>('attachment_rules', {
      ...data,
      is_required: data.is_required ?? false,
      display_order: data.display_order || 0,
      conditions: data.conditions || {},
    })

    if (!rule) {
      return { success: false, error: 'Error al crear la regla' }
    }

    return { success: true, data: rule }
  } catch (error: any) {
    console.error('Error creating attachment rule:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}

/**
 * Update attachment rule
 */
export async function updateAttachmentRuleAction(
  id: string,
  data: Partial<AttachmentRuleInsert>
): Promise<{ success: boolean; data?: AttachmentRule; error?: string }> {
  try {
    const rule = await updateRecord<AttachmentRule>('attachment_rules', id, data)

    if (!rule) {
      return { success: false, error: 'Error al actualizar la regla' }
    }

    return { success: true, data: rule }
  } catch (error: any) {
    console.error('Error updating attachment rule:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}

/**
 * Delete attachment rule
 */
export async function deleteAttachmentRuleAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await deleteRecord('attachment_rules', id)
    return { success: true }
  } catch (error: any) {
    console.error('Error deleting attachment rule:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}

/**
 * Resolve attachments for a client based on rules using RPC
 */
export async function resolveAttachmentsForClientAction(params: {
  business_account_id: string
  threshold_id?: string
  customer_category_id?: string
  customer_id?: string
  days_overdue?: number
  invoice_amount?: number
}): Promise<ResolvedAttachment[]> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { data, error } = await supabase.rpc('resolve_attachments_by_rules', {
      p_business_account_id: params.business_account_id,
      p_threshold_id: params.threshold_id,
      p_customer_category_id: params.customer_category_id,
      p_customer_id: params.customer_id,
      p_days_overdue: params.days_overdue,
      p_invoice_amount: params.invoice_amount,
    })

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('Error resolving attachments:', error)
    return []
  }
}

/**
 * Batch create/update rules for an attachment
 * Replaces all existing rules with new ones
 */
export async function saveAttachmentRulesAction(
  attachmentId: string,
  businessAccountId: string,
  rules: Omit<AttachmentRuleInsert, 'attachment_id' | 'business_account_id'>[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await getSupabaseAdminClient()

    // Delete existing rules for this attachment
    await supabase.from('attachment_rules').delete().eq('attachment_id', attachmentId)

    // Insert new rules
    if (rules.length > 0) {
      const rulesToInsert = rules.map((rule, index) => ({
        ...rule,
        attachment_id: attachmentId,
        business_account_id: businessAccountId,
        display_order: rule.display_order ?? index,
      }))

      const { error } = await supabase.from('attachment_rules').insert(rulesToInsert)

      if (error) throw error
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error saving attachment rules:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}

/**
 * Get global rules only
 */
export async function fetchGlobalAttachmentRulesAction(
  businessAccountId: string
): Promise<AttachmentRule[]> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { data, error } = await supabase
      .from('attachment_rules')
      .select(
        `*,
        attachment:attachment_id(id, name, file_type, storage_path, storage_bucket)`
      )
      .eq('business_account_id', businessAccountId)
      .eq('rule_type', 'global')
      .order('display_order', { ascending: true })

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('Error fetching global rules:', error)
    return []
  }
}
