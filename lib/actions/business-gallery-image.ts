'use server'

import {
  getAllRecords,
  insertRecord,
  deleteRecord,
} from '@/lib/actions/supabase'
import type {
  BusinessGalleryImage,
  BusinessGalleryImageInsert,
} from '@/lib/models/business/business-gallery-image'

/**
 * Obtiene todas las imágenes de galería de un negocio
 */
export async function getBusinessGalleryImagesAction(
  businessId: string
): Promise<BusinessGalleryImage[]> {
  try {
    const images = await getAllRecords<BusinessGalleryImage>('business_gallery_images', {
      filters: { business_id: businessId },
      order: { column: 'sort_order', ascending: true },
    })
    return images
  } catch (error) {
    console.error('Error fetching gallery images:', error)
    return []
  }
}

/**
 * Crea una nueva imagen de galería
 */
export async function createBusinessGalleryImageAction(
  data: BusinessGalleryImageInsert
): Promise<{ success: boolean; data?: BusinessGalleryImage; error?: string }> {
  try {
    const image = await insertRecord<BusinessGalleryImage>('business_gallery_images', data)

    if (!image) {
      return { success: false, error: 'Error al crear la imagen de galería' }
    }

    return { success: true, data: image }
  } catch (error: any) {
    console.error('Error creating gallery image:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}

/**
 * Elimina una imagen de galería
 */
export async function deleteBusinessGalleryImageAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await deleteRecord('business_gallery_images', id)
    return { success: true }
  } catch (error: any) {
    console.error('Error deleting gallery image:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}
