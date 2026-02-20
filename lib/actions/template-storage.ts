'use server'

import { getSupabaseAdminClient } from '@/lib/actions/supabase'

export type TemplateType = 'plans' | 'customers' | 'services' | 'specialists' | 'products'

export async function uploadTemplateAction(
  formData: FormData
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const file = formData.get('file') as File
    const type = formData.get('type') as TemplateType

    if (!file) {
      return { success: false, error: 'No se proporcionó archivo' }
    }

    if (!type) {
      return { success: false, error: 'No se proporcionó tipo de plantilla' }
    }

    // Validar que sea un archivo Excel
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
    ]

    if (!allowedTypes.includes(file.type)) {
      return { success: false, error: 'El archivo debe ser un documento Excel (.xlsx o .xls)' }
    }

    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return { success: false, error: 'La plantilla no debe superar los 10MB' }
    }

    const supabase = await getSupabaseAdminClient()

    const timestamp = Date.now()
    const fileExt = file.name.split('.').pop()
    const fileName = `${type}/${timestamp}.${fileExt}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { data, error } = await supabase.storage
      .from('import-templates')
      .upload(fileName, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      })

    if (error) {
      console.error('Error uploading template:', error)
      return { success: false, error: error.message }
    }

    const { data: { publicUrl } } = supabase.storage
      .from('import-templates')
      .getPublicUrl(data.path)

    return { success: true, url: publicUrl }
  } catch (error: any) {
    console.error('Error in uploadTemplateAction:', error)
    return { success: false, error: 'Error al subir la plantilla' }
  }
}

export async function deleteTemplateAction(
  templateUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const url = new URL(templateUrl)
    const pathParts = url.pathname.split('import-templates/')
    if (pathParts.length < 2) {
      return { success: false, error: 'URL de plantilla inválida' }
    }

    const filePath = pathParts[1]
    const supabase = await getSupabaseAdminClient()

    const { error } = await supabase.storage
      .from('import-templates')
      .remove([filePath])

    if (error) {
      console.error('Error deleting template:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error in deleteTemplateAction:', error)
    return { success: false, error: 'Error al eliminar la plantilla' }
  }
}

export async function listTemplatesAction(
  type: TemplateType
): Promise<{ success: boolean; data?: any[]; error?: string }> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { data, error } = await supabase.storage
      .from('import-templates')
      .list(type, {
        limit: 100,
        sortBy: { column: 'created_at', order: 'desc' },
      })

    if (error) {
      console.error('Error listing templates:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data: data || [] }
  } catch (error: any) {
    console.error('Error in listTemplatesAction:', error)
    return { success: false, error: 'Error al listar plantillas' }
  }
}