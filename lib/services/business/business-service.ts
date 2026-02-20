import {
  fetchBusinessesAction,
  getBusinessByIdAction,
  createBusinessAction,
  updateBusinessAction,
  deleteBusinessAction,
  deleteBusinessesAction,
} from '@/lib/actions/business'
import type { Business, BusinessInsert } from '@/lib/models/business/business'

export interface BusinessListResponse {
  data: Business[]
  total: number
  total_pages: number
}

/**
 * Servicio para gestionar negocios
 * Consume server actions para comunicarse con Supabase
 */
export default class BusinessService {
  /**
   * Obtiene la lista de negocios con paginación
   */
  async fetchItems(params?: {
    page?: number
    page_size?: number
    name?: string[]
    business_account_id?: string
  }): Promise<BusinessListResponse> {
    try {
      return await fetchBusinessesAction(params)
    } catch (error) {
      console.error('Error fetching businesses:', error)
      throw error
    }
  }

  /**
   * Obtiene un negocio por ID
   */
  async getById(id: string): Promise<Business | null> {
    try {
      return await getBusinessByIdAction(id)
    } catch (error) {
      console.error('Error fetching business by ID:', error)
      throw error
    }
  }

  /**
   * Crea un nuevo negocio
   */
  async createItem(data: BusinessInsert): Promise<{ success: boolean; data?: Business; error?: string }> {
    try {
      return await createBusinessAction(data)
    } catch (error: any) {
      console.error('Error creating business:', error)
      throw error
    }
  }

  /**
   * Actualiza un negocio
   */
  async updateItem(
    data: Business | Partial<Business>
  ): Promise<{ success: boolean; data?: Business; error?: string }> {
    try {
      if (!data.id) {
        throw new Error('Business ID is required for update')
      }
      return await updateBusinessAction(data.id, data)
    } catch (error: any) {
      console.error('Error updating business:', error)
      throw error
    }
  }

  /**
   * Elimina un negocio
   */
  async destroyItem(id: string): Promise<void> {
    try {
      const result = await deleteBusinessAction(id)
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete business')
      }
    } catch (error) {
      console.error('Error deleting business:', error)
      throw new Error(`Failed to destroy business: ${error}`)
    }
  }

  async destroyMany(
    ids: string[]
  ): Promise<{ success: boolean; deletedCount: number; error?: string }> {
    try {
      return await deleteBusinessesAction(ids)
    } catch (error: any) {
      console.error('Error batch deleting businesses:', error)
      return { success: false, deletedCount: 0, error: error.message }
    }
  }
}
