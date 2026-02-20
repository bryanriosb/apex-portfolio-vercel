'use server'

import { getSupabaseAdminClient } from '@/lib/actions/supabase'
import type {
  FormTemplate,
  FormTemplateInsert,
  FormTemplateUpdate,
} from '@/lib/models/form-template/form-template'

export interface FormTemplateListResponse {
  data: FormTemplate[]
  total: number
}

export async function fetchFormTemplatesAction(params: {
  business_id: string
  is_active?: boolean
}): Promise<FormTemplateListResponse> {
  try {
    const supabase = await getSupabaseAdminClient()

    let query = supabase
      .from('form_templates')
      .select('*', { count: 'exact' })
      .eq('business_id', params.business_id)
      .order('is_default', { ascending: false })
      .order('name', { ascending: true })

    if (params.is_active !== undefined) {
      query = query.eq('is_active', params.is_active)
    }

    const { data, error, count } = await query

    if (error) throw error

    return {
      data: (data || []) as FormTemplate[],
      total: count || 0,
    }
  } catch (error) {
    console.error('Error fetching form templates:', error)
    return { data: [], total: 0 }
  }
}

export async function getFormTemplateByIdAction(
  id: string
): Promise<FormTemplate | null> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { data, error } = await supabase
      .from('form_templates')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data as FormTemplate
  } catch (error) {
    console.error('Error fetching form template:', error)
    return null
  }
}

export async function getDefaultFormTemplateAction(
  businessId: string
): Promise<FormTemplate | null> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { data, error } = await supabase
      .from('form_templates')
      .select('*')
      .eq('business_id', businessId)
      .eq('is_default', true)
      .eq('is_active', true)
      .maybeSingle()

    if (error) throw error
    return data as FormTemplate | null
  } catch (error) {
    console.error('Error fetching default form template:', error)
    return null
  }
}

export async function createFormTemplateAction(
  data: FormTemplateInsert
): Promise<{ success: boolean; data?: FormTemplate; error?: string }> {
  try {
    const supabase = await getSupabaseAdminClient()

    // Si es default, quitar default de otros
    if (data.is_default) {
      await supabase
        .from('form_templates')
        .update({ is_default: false })
        .eq('business_id', data.business_id)
        .eq('is_default', true)
    }

    const { data: template, error } = await supabase
      .from('form_templates')
      .insert(data)
      .select()
      .single()

    if (error) throw error

    return { success: true, data: template as FormTemplate }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    console.error('Error creating form template:', error)
    return { success: false, error: errorMessage }
  }
}

export async function updateFormTemplateAction(
  id: string,
  data: FormTemplateUpdate
): Promise<{ success: boolean; data?: FormTemplate; error?: string }> {
  try {
    const supabase = await getSupabaseAdminClient()

    // Si es default, quitar default de otros
    if (data.is_default) {
      const { data: current } = await supabase
        .from('form_templates')
        .select('business_id')
        .eq('id', id)
        .single()

      if (current) {
        await supabase
          .from('form_templates')
          .update({ is_default: false })
          .eq('business_id', current.business_id)
          .eq('is_default', true)
          .neq('id', id)
      }
    }

    const { data: template, error } = await supabase
      .from('form_templates')
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return { success: true, data: template as FormTemplate }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    console.error('Error updating form template:', error)
    return { success: false, error: errorMessage }
  }
}

export async function deleteFormTemplateAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await getSupabaseAdminClient()

    // Soft delete: desactivar en lugar de eliminar
    const { error } = await supabase
      .from('form_templates')
      .update({ is_active: false, is_default: false })
      .eq('id', id)

    if (error) throw error

    return { success: true }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    console.error('Error deleting form template:', error)
    return { success: false, error: errorMessage }
  }
}
