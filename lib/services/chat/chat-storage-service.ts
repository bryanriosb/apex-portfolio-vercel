'use client'

import { createBrowserClient } from '@supabase/ssr'

export class ChatStorageService {
  private supabase

  constructor() {
    this.supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }

  /**
   * Sube una imagen al bucket de Supabase Storage
   * @param file - Archivo de imagen a subir
   * @param conversationId - ID de la conversación
   * @returns URL pública de la imagen subida
   */
  async uploadChatImage(
    file: File,
    conversationId: string
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      // Validar que sea una imagen
      if (!file.type.startsWith('image/')) {
        return {
          success: false,
          error: 'El archivo debe ser una imagen',
        }
      }

      // Validar tamaño (máximo 5MB)
      const maxSize = 5 * 1024 * 1024 // 5MB
      if (file.size > maxSize) {
        return {
          success: false,
          error: 'La imagen no debe superar los 5MB',
        }
      }

      // Generar nombre único para el archivo
      const timestamp = Date.now()
      const fileExt = file.name.split('.').pop()
      const fileName = `${conversationId}/${timestamp}.${fileExt}`

      // Subir archivo al bucket 'chat-media'
      const { data, error } = await this.supabase.storage
        .from('chat-media')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (error) {
        console.error('Error uploading image:', error)
        return {
          success: false,
          error: error.message,
        }
      }

      // Obtener URL pública
      const {
        data: { publicUrl },
      } = this.supabase.storage.from('chat-media').getPublicUrl(data.path)

      return {
        success: true,
        url: publicUrl,
      }
    } catch (error) {
      console.error('Error in uploadChatImage:', error)
      return {
        success: false,
        error: 'Error al subir la imagen',
      }
    }
  }

  /**
   * Elimina una imagen del bucket
   * @param imageUrl - URL de la imagen a eliminar
   */
  async deleteChatImage(
    imageUrl: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Extraer el path del archivo de la URL
      const url = new URL(imageUrl)
      const pathParts = url.pathname.split('chat-media/')
      if (pathParts.length < 2) {
        return {
          success: false,
          error: 'URL de imagen inválida',
        }
      }

      const filePath = pathParts[1]

      const { error } = await this.supabase.storage
        .from('chat-media')
        .remove([filePath])

      if (error) {
        console.error('Error deleting image:', error)
        return {
          success: false,
          error: error.message,
        }
      }

      return {
        success: true,
      }
    } catch (error) {
      console.error('Error in deleteChatImage:', error)
      return {
        success: false,
        error: 'Error al eliminar la imagen',
      }
    }
  }
}

export default ChatStorageService
