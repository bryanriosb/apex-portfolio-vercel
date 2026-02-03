'use server'

import { getSupabaseAdminClient } from '@/lib/actions/supabase'

export type ImageType = 'logo' | 'gallery-cover' | 'gallery' | 'services' | 'specialists' | 'products'

export async function uploadImageAction(
  formData: FormData
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const file = formData.get('file') as File
    const businessId = formData.get('businessId') as string
    const type = formData.get('type') as ImageType

    if (!file) {
      return { success: false, error: 'No se proporcionó archivo' }
    }

    if (!businessId) {
      return { success: false, error: 'No se proporcionó business_id' }
    }

    if (!type) {
      return { success: false, error: 'No se proporcionó tipo de imagen' }
    }

    if (!file.type.startsWith('image/')) {
      return { success: false, error: 'El archivo debe ser una imagen' }
    }

    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      return { success: false, error: 'La imagen no debe superar los 5MB' }
    }

    const supabase = await getSupabaseAdminClient()

    const timestamp = Date.now()
    const fileExt = file.name.split('.').pop()
    const fileName = `${businessId}/${type}/${timestamp}.${fileExt}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { data, error } = await supabase.storage
      .from('business-media')
      .upload(fileName, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      })

    if (error) {
      console.error('Error uploading image:', error)
      return { success: false, error: error.message }
    }

    const { data: { publicUrl } } = supabase.storage
      .from('business-media')
      .getPublicUrl(data.path)

    return { success: true, url: publicUrl }
  } catch (error: any) {
    console.error('Error in uploadImageAction:', error)
    return { success: false, error: 'Error al subir la imagen' }
  }
}

export async function deleteStorageImageAction(
  imageUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const url = new URL(imageUrl)
    const pathParts = url.pathname.split('business-media/')
    if (pathParts.length < 2) {
      return { success: false, error: 'URL de imagen inválida' }
    }

    const filePath = pathParts[1]
    const supabase = await getSupabaseAdminClient()

    const { error } = await supabase.storage
      .from('business-media')
      .remove([filePath])

    if (error) {
      console.error('Error deleting image:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error in deleteStorageImageAction:', error)
    return { success: false, error: 'Error al eliminar la imagen' }
  }
}
