'use server'

import { getSupabaseAdminClient } from '@/lib/actions/supabase'

/**
 * Upload an image to the images/collection bucket
 */
export async function uploadCollectionImageAction(
    formData: FormData
): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
        const file = formData.get('file') as File
        const businessId = formData.get('businessId') as string

        if (!file) {
            return { success: false, error: 'No se proporcionó archivo' }
        }

        if (!businessId) {
            return { success: false, error: 'No se proporcionó business_id' }
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
        if (!allowedTypes.includes(file.type)) {
            return { success: false, error: 'El archivo debe ser una imagen (JPG, PNG, GIF, WEBP)' }
        }

        // Validate file size (5MB max)
        const maxSize = 5 * 1024 * 1024
        if (file.size > maxSize) {
            return { success: false, error: 'La imagen no debe superar los 5MB' }
        }

        const supabase = await getSupabaseAdminClient()

        const timestamp = Date.now()
        const fileExt = file.name.split('.').pop()
        const fileName = `collection/${businessId}/${timestamp}.${fileExt}`

        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        const { data, error } = await supabase.storage
            .from('images')
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
            .from('images')
            .getPublicUrl(data.path)

        return { success: true, url: publicUrl }
    } catch (error: any) {
        console.error('Error in uploadCollectionImageAction:', error)
        return { success: false, error: 'Error al subir la imagen' }
    }
}

/**
 * List all images for a business in the collection bucket
 */
export async function listCollectionImagesAction(
    businessId: string
): Promise<{ success: boolean; images?: string[]; error?: string }> {
    try {
        if (!businessId) {
            return { success: false, error: 'No se proporcionó business_id' }
        }

        const supabase = await getSupabaseAdminClient()

        const { data, error } = await supabase.storage
            .from('images')
            .list(`collection/${businessId}`, {
                limit: 100,
                sortBy: { column: 'created_at', order: 'desc' },
            })

        if (error) {
            console.error('Error listing images:', error)
            return { success: false, error: error.message }
        }

        // Generate public URLs for all images
        const imageUrls = data.map((file) => {
            const { data: { publicUrl } } = supabase.storage
                .from('images')
                .getPublicUrl(`collection/${businessId}/${file.name}`)
            return publicUrl
        })

        return { success: true, images: imageUrls }
    } catch (error: any) {
        console.error('Error in listCollectionImagesAction:', error)
        return { success: false, error: 'Error al listar imágenes' }
    }
}

/**
 * Delete an image from the collection bucket
 */
export async function deleteCollectionImageAction(
    imageUrl: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const url = new URL(imageUrl)
        const pathParts = url.pathname.split('images/')
        if (pathParts.length < 2) {
            return { success: false, error: 'URL de imagen inválida' }
        }

        const filePath = pathParts[1]
        const supabase = await getSupabaseAdminClient()

        const { error } = await supabase.storage
            .from('images')
            .remove([filePath])

        if (error) {
            console.error('Error deleting image:', error)
            return { success: false, error: error.message }
        }

        return { success: true }
    } catch (error: any) {
        console.error('Error in deleteCollectionImageAction:', error)
        return { success: false, error: 'Error al eliminar la imagen' }
    }
}
