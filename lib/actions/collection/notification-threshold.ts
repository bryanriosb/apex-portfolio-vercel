'use server'

import {
  getRecordById,
  insertRecord,
  updateRecord,
  deleteRecord,
  getSupabaseAdminClient,
} from '@/lib/actions/supabase'
import type {
  NotificationThreshold,
  NotificationThresholdInsert,
  NotificationThresholdUpdate,
} from '@/lib/models/collection/notification-threshold'

export interface ThresholdListResponse {
  data: NotificationThreshold[]
  total: number
}

/**
 * Fetch all thresholds for a business
 */
export async function fetchThresholdsAction(
  businessId: string
): Promise<ThresholdListResponse> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { data, error, count } = await supabase
      .from('notification_thresholds')
      .select(
        `*,
        email_template:email_template_id(id, name, subject)`,
        { count: 'exact' }
      )
      .eq('business_id', businessId)
      .eq('is_active', true)
      .order('days_from', { ascending: true })

    if (error) throw error

    return {
      data: data || [],
      total: count || 0,
    }
  } catch (error) {
    console.error('Error fetching thresholds:', error)
    return { data: [], total: 0 }
  }
}

/**
 * Get threshold by ID with template relation
 */
export async function getThresholdByIdAction(
  id: string
): Promise<NotificationThreshold | null> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { data, error } = await supabase
      .from('notification_thresholds')
      .select(
        `*,
        email_template:email_template_id(id, name, subject, content_plain, content_html)`
      )
      .eq('id', id)
      .single()

    if (error) throw error

    return data
  } catch (error) {
    console.error('Error fetching threshold:', error)
    return null
  }
}

/**
 * Create threshold with validation for overlapping ranges
 */
export async function createThresholdAction(
  data: NotificationThresholdInsert
): Promise<{ success: boolean; data?: NotificationThreshold; error?: string }> {
  try {
    const supabase = await getSupabaseAdminClient()

    // Validate no overlapping ranges
    const overlapCheck = await supabase
      .from('notification_thresholds')
      .select('id, name, days_from, days_to')
      .eq('business_id', data.business_id)
      .eq('is_active', true)
      .or(
        `and(days_from.lte.${data.days_to || 999999},days_to.gte.${data.days_from}),and(days_from.gte.${data.days_from},days_from.lte.${data.days_to || 999999})`
      )

    if (overlapCheck.error) throw overlapCheck.error

    if (overlapCheck.data && overlapCheck.data.length > 0) {
      return {
        success: false,
        error: `El rango de días se solapa con: ${overlapCheck.data.map((t) => t.name).join(', ')}`,
      }
    }

    const threshold = await insertRecord<NotificationThreshold>(
      'notification_thresholds',
      {
        ...data,
        is_active: data.is_active !== undefined ? data.is_active : true,
        display_order: data.display_order || 0,
      }
    )

    if (!threshold) {
      return { success: false, error: 'Error al crear el umbral' }
    }

    return { success: true, data: threshold }
  } catch (error: any) {
    console.error('Error creating threshold:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}

/**
 * Update threshold with overlap validation
 */
export async function updateThresholdAction(
  id: string,
  data: NotificationThresholdUpdate,
  businessId: string
): Promise<{ success: boolean; data?: NotificationThreshold; error?: string }> {
  try {
    const supabase = await getSupabaseAdminClient()

    // Validate no overlapping ranges (excluding current threshold)
    if (data.days_from !== undefined || data.days_to !== undefined) {
      const currentThreshold = await getThresholdByIdAction(id)
      if (!currentThreshold) {
        return { success: false, error: 'Umbral no encontrado' }
      }

      const daysFrom = data.days_from ?? currentThreshold.days_from
      const daysTo = data.days_to ?? currentThreshold.days_to

      const overlapCheck = await supabase
        .from('notification_thresholds')
        .select('id, name, days_from, days_to')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .neq('id', id)
        .or(
          `and(days_from.lte.${daysTo || 999999},days_to.gte.${daysFrom}),and(days_from.gte.${daysFrom},days_from.lte.${daysTo || 999999})`
        )

      if (overlapCheck.error) throw overlapCheck.error

      if (overlapCheck.data && overlapCheck.data.length > 0) {
        return {
          success: false,
          error: `El rango de días se solapa con: ${overlapCheck.data.map((t) => t.name).join(', ')}`,
        }
      }
    }

    const threshold = await updateRecord<NotificationThreshold>(
      'notification_thresholds',
      id,
      data
    )

    if (!threshold) {
      return { success: false, error: 'Error al actualizar el umbral' }
    }

    return { success: true, data: threshold }
  } catch (error: any) {
    console.error('Error updating threshold:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}

/**
 * Delete threshold (soft delete by setting is_active = false)
 */
export async function deleteThresholdAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await updateRecord('notification_thresholds', id, { is_active: false })
    return { success: true }
  } catch (error: any) {
    console.error('Error deleting threshold:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}

/**
 * Get threshold for specific days overdue using RPC function
 */
export async function getThresholdForDaysAction(
  businessId: string,
  daysOverdue: number
): Promise<NotificationThreshold | null> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { data, error } = await supabase.rpc('get_threshold_for_days', {
      p_business_id: businessId,
      p_days_overdue: daysOverdue,
    })

    if (error) throw error

    const thresholdBasic = data?.[0]
    if (!thresholdBasic) return null

    // RPC only returns id, name, email_template_id
    // Fetch full threshold data with all fields
    const { data: fullThreshold, error: thresholdError } = await supabase
      .from('notification_thresholds')
      .select('*')
      .eq('id', thresholdBasic.id)
      .single()

    if (thresholdError || !fullThreshold) {
      console.error('Could not fetch full threshold data:', thresholdError)
      return null
    }

    // Fetch template relation separately since RPC doesn't support joins
    const { data: templateData, error: templateError } = await supabase
      .from('collection_templates')
      .select('id, name, subject')
      .eq('id', fullThreshold.email_template_id)
      .single()

    if (templateError) {
      console.warn('Could not fetch template for threshold:', fullThreshold.id)
    }

    return {
      ...fullThreshold,
      email_template: templateData || undefined,
    }
  } catch (error) {
    console.error('Error getting threshold for days:', error)
    return null
  }
}

/**
 * Reorder thresholds by updating display_order
 */
export async function reorderThresholdsAction(
  thresholdIds: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await getSupabaseAdminClient()

    const updates = thresholdIds.map((id, index) =>
      supabase
        .from('notification_thresholds')
        .update({ display_order: index })
        .eq('id', id)
    )

    await Promise.all(updates)

    return { success: true }
  } catch (error: any) {
    console.error('Error reordering thresholds:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}
