'use client'

import { uploadImageAction, deleteStorageImageAction, type ImageType } from '@/lib/actions/storage'

export class BusinessStorageService {
  async uploadLogo(
    file: File,
    businessId: string
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    return this._uploadImage(file, businessId, 'logo')
  }

  async uploadGalleryCover(
    file: File,
    businessId: string
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    return this._uploadImage(file, businessId, 'gallery-cover')
  }

  async uploadGalleryImage(
    file: File,
    businessId: string
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    return this._uploadImage(file, businessId, 'gallery')
  }

  async uploadServiceImage(
    file: File,
    businessId: string
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    return this._uploadImage(file, businessId, 'services')
  }

  async uploadSpecialistImage(
    file: File,
    businessId: string
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    return this._uploadImage(file, businessId, 'specialists')
  }

  async uploadProductImage(
    file: File,
    businessId: string
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    return this._uploadImage(file, businessId, 'products')
  }

  async uploadImage(
    file: File,
    businessId: string,
    type: ImageType
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    return this._uploadImage(file, businessId, type)
  }

  private async _uploadImage(
    file: File,
    businessId: string,
    type: ImageType
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    if (!file.type.startsWith('image/')) {
      return { success: false, error: 'El archivo debe ser una imagen' }
    }

    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      return { success: false, error: 'La imagen no debe superar los 5MB' }
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('businessId', businessId)
    formData.append('type', type)

    return uploadImageAction(formData)
  }

  async deleteImage(imageUrl: string): Promise<{ success: boolean; error?: string }> {
    return deleteStorageImageAction(imageUrl)
  }
}

export default BusinessStorageService
