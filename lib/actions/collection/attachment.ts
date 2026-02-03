'use server'

import {
  getRecordById,
  insertRecord,
  updateRecord,
  deleteRecord,
  getSupabaseAdminClient,
} from '@/lib/actions/supabase'
import type {
  CollectionAttachment,
  CollectionAttachmentInsert,
  CollectionAttachmentUpdate,
} from '@/lib/models/collection'

export interface AttachmentListResponse {
  data: CollectionAttachment[]
  total: number
  total_pages: number
}

/**
 * Fetch attachments for a business account
 */
export async function fetchAttachmentsAction(params: {
  business_account_id: string
  page?: number
  page_size?: number
  is_active?: boolean
  search?: string
}): Promise<AttachmentListResponse> {
  try {
    const supabase = await getSupabaseAdminClient()

    let query = supabase
      .from('collection_attachments')
      .select('*', { count: 'exact' })
      .eq('business_account_id', params.business_account_id)
      .order('created_at', { ascending: false })

    // Filter by active status
    if (params.is_active !== undefined) {
      query = query.eq('is_active', params.is_active)
    }

    // Search
    if (params.search) {
      const searchTerm = `%${params.search}%`
      query = query.or(
        `name.ilike.${searchTerm},description.ilike.${searchTerm}`
      )
    }

    // Pagination
    const page = params.page || 1
    const pageSize = params.page_size || 20
    const start = (page - 1) * pageSize
    const end = start + pageSize - 1

    query = query.range(start, end)

    const { data, error, count } = await query

    if (error) throw error

    return {
      data: data || [],
      total: count || 0,
      total_pages: Math.ceil((count || 0) / pageSize),
    }
  } catch (error) {
    console.error('Error fetching attachments:', error)
    return { data: [], total: 0, total_pages: 0 }
  }
}

/**
 * Get attachment by ID
 */
export async function getAttachmentByIdAction(
  id: string
): Promise<CollectionAttachment | null> {
  try {
    return await getRecordById<CollectionAttachment>(
      'collection_attachments',
      id
    )
  } catch (error) {
    console.error('Error fetching attachment:', error)
    return null
  }
}

/**
 * Create attachment record (after file upload)
 */
export async function createAttachmentAction(
  data: CollectionAttachmentInsert
): Promise<{ success: boolean; data?: CollectionAttachment; error?: string }> {
  try {
    const attachment = await insertRecord<CollectionAttachment>(
      'collection_attachments',
      {
        ...data,
        is_active: data.is_active !== undefined ? data.is_active : true,
      }
    )

    if (!attachment) {
      return { success: false, error: 'Error al crear el adjunto' }
    }

    return { success: true, data: attachment }
  } catch (error: any) {
    console.error('Error creating attachment:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}

/**
 * Update attachment
 */
export async function updateAttachmentAction(
  id: string,
  data: CollectionAttachmentUpdate
): Promise<{ success: boolean; data?: CollectionAttachment; error?: string }> {
  try {
    const attachment = await updateRecord<CollectionAttachment>(
      'collection_attachments',
      id,
      data
    )

    if (!attachment) {
      return { success: false, error: 'Error al actualizar el adjunto' }
    }

    return { success: true, data: attachment }
  } catch (error: any) {
    console.error('Error updating attachment:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}

/**
 * Delete attachment (file and record)
 */
export async function deleteAttachmentAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get attachment to delete file from storage
    const attachment = await getAttachmentByIdAction(id)

    if (attachment) {
      // Delete from storage
      const supabase = await getSupabaseAdminClient()
      const { error: storageError } = await supabase.storage
        .from(attachment.storage_bucket)
        .remove([attachment.storage_path])

      if (storageError) {
        console.error('Error deleting file from storage:', storageError)
        // Continue to delete record even if file deletion fails
      }
    }

    // Delete record
    await deleteRecord('collection_attachments', id)
    return { success: true }
  } catch (error: any) {
    console.error('Error deleting attachment:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}

/**
 * Get active attachments
 */
export async function getActiveAttachmentsAction(
  businessAccountId: string
): Promise<CollectionAttachment[]> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { data, error } = await supabase
      .from('collection_attachments')
      .select('*')
      .eq('business_account_id', businessAccountId)
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('Error fetching active attachments:', error)
    return []
  }
}

/**
 * Upload attachment file to storage
 */
export async function uploadAttachmentFileAction(
  formData: FormData
): Promise<{ success: boolean; path?: string; error?: string }> {
  try {
    const file = formData.get('file') as File
    const businessAccountId = formData.get('businessAccountId') as string
    const attachmentId = formData.get('attachmentId') as string

    if (!file || !businessAccountId || !attachmentId) {
      return {
        success: false,
        error:
          'Faltan datos requeridos (file, businessAccountId, attachmentId)',
      }
    }

    const supabase = await getSupabaseAdminClient()
    // const fileExt = file.name.split('.').pop() // Unused
    const fileName = `${Date.now()}-${file.name}`
    const path = `${businessAccountId}/${fileName}`

    const { data, error } = await supabase.storage
      .from('collection-attachments')
      .upload(path, file)

    if (error) throw error

    return { success: true, path: data.path }
  } catch (error: any) {
    console.error('Error uploading attachment file:', error)
    return { success: false, error: error.message || 'Error al subir archivo' }
  }
}
