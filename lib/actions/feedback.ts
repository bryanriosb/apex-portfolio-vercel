'use server'

import { getSupabaseAdminClient } from '@/lib/actions/supabase'
import {
  Feedback,
  CreateFeedback,
  FeedbackInsert,
  FeedbackUpdate,
  FeedbackType,
} from '@/lib/models/feedback'
import { revalidatePath } from 'next/cache'

export async function createFeedbackAction(
  businessId: string,
  feedbackData: CreateFeedback
): Promise<{ success: boolean; data?: Feedback; error?: string }> {
  try {
    const supabase = await getSupabaseAdminClient()

    const feedbackInsert: FeedbackInsert = {
      business_id: businessId,
      type: feedbackData.type,
      title: feedbackData.title,
      description: feedbackData.description,
      severity: feedbackData.severity,
      status: 'open',
      priority: feedbackData.priority || 1,
      attachment_urls: feedbackData.attachment_urls || [],
      metadata: feedbackData.metadata || {},
    }

    const { data, error } = await supabase
      .from('feedback')
      .insert(feedbackInsert)
      .select()
      .single()

    if (error) {
      console.error('Error creating feedback:', error)
      return { success: false, error: 'No se pudo crear el reporte' }
    }

    revalidatePath('/dashboard')
    return { success: true, data }
  } catch (error) {
    console.error('Error in createFeedbackAction:', error)
    return { success: false, error: 'Error interno del servidor' }
  }
}

export async function getFeedbackListAction(
  businessId: string,
  filters?: {
    type?: FeedbackType
    status?: string
    severity?: string
    limit?: number
    offset?: number
  }
): Promise<{
  success: boolean
  data?: Feedback[]
  error?: string
  count?: number
}> {
  try {
    const supabase = await getSupabaseAdminClient()

    let query = supabase
      .from('feedback')
      .select('*', { count: 'exact' })
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })

    if (filters?.type) {
      query = query.eq('type', filters.type)
    }
    if (filters?.status) {
      query = query.eq('status', filters.status)
    }
    if (filters?.severity) {
      query = query.eq('severity', filters.severity)
    }

    if (filters?.limit) {
      query = query.limit(filters.limit)
    }
    if (filters?.offset) {
      query = query.range(
        filters.offset,
        filters.offset + (filters.limit || 10) - 1
      )
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching feedback:', error)
      return { success: false, error: 'No se pudo cargar la lista de reportes' }
    }

    return { success: true, data: data || [], count: count || 0 }
  } catch (error) {
    console.error('Error in getFeedbackListAction:', error)
    return { success: false, error: 'Error interno del servidor' }
  }
}

export async function getFeedbackByIdAction(
  feedbackId: string
): Promise<{ success: boolean; data?: Feedback; error?: string }> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { data, error } = await supabase
      .from('feedback')
      .select('*')
      .eq('id', feedbackId)
      .single()

    if (error) {
      console.error('Error fetching feedback:', error)
      return { success: false, error: 'No se encontró el reporte' }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Error in getFeedbackByIdAction:', error)
    return { success: false, error: 'Error interno del servidor' }
  }
}

export async function updateFeedbackAction(
  feedbackId: string,
  updateData: FeedbackUpdate
): Promise<{ success: boolean; data?: Feedback; error?: string }> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { data, error } = await supabase
      .from('feedback')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', feedbackId)
      .select()
      .single()

    if (error) {
      console.error('Error updating feedback:', error)
      return { success: false, error: 'No se pudo actualizar el reporte' }
    }

    revalidatePath('/dashboard')
    return { success: true, data }
  } catch (error) {
    console.error('Error in updateFeedbackAction:', error)
    return { success: false, error: 'Error interno del servidor' }
  }
}

export async function deleteFeedbackAction(
  feedbackId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { error } = await supabase
      .from('feedback')
      .delete()
      .eq('id', feedbackId)

    if (error) {
      console.error('Error deleting feedback:', error)
      return { success: false, error: 'No se pudo eliminar el reporte' }
    }

    revalidatePath('/dashboard')
    return { success: true }
  } catch (error) {
    console.error('Error in deleteFeedbackAction:', error)
    return { success: false, error: 'Error interno del servidor' }
  }
}
