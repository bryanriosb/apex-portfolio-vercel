import {
  fetchBusinessCustomersAction,
  getBusinessCustomerByIdAction,
  getBusinessCustomerByNitAction,
  createBusinessCustomerAction,
  createFullCustomerAction,
  updateBusinessCustomerAction,
  deleteBusinessCustomerAction,
  deleteBusinessCustomersAction,
  searchBusinessCustomersAction,
  fetchCustomerCategoriesAction,
} from '@/lib/actions/business-customer'
import type {
  BusinessCustomer,
  BusinessCustomerInsert,
  BusinessCustomerUpdate,
  CreateCustomerInput,
} from '@/lib/models/customer/business-customer'

export interface BusinessCustomerListResponse {
  data: BusinessCustomer[]
  total: number
  total_pages: number
}

export default class BusinessCustomerService {
  async fetchItems(params?: {
    page?: number
    page_size?: number
    business_id?: string
    search?: string
    status?: string
    category?: string
  }): Promise<BusinessCustomerListResponse> {
    try {
      return await fetchBusinessCustomersAction(params)
    } catch (error) {
      console.error('Error fetching business customers:', error)
      throw error
    }
  }

  async getById(id: string): Promise<BusinessCustomer | null> {
    try {
      return await getBusinessCustomerByIdAction(id)
    } catch (error) {
      console.error('Error fetching business customer by ID:', error)
      throw error
    }
  }

  async getByNit(
    businessId: string,
    nit: string
  ): Promise<BusinessCustomer | null> {
    try {
      return await getBusinessCustomerByNitAction(businessId, nit)
    } catch (error) {
      console.error('Error fetching business customer by NIT:', error)
      throw error
    }
  }

  async createItem(
    data: BusinessCustomerInsert
  ): Promise<{ success: boolean; data?: BusinessCustomer; error?: string }> {
    try {
      return await createBusinessCustomerAction(data)
    } catch (error: any) {
      console.error('Error creating business customer:', error)
      throw error
    }
  }

  async createFullCustomer(input: CreateCustomerInput): Promise<{
    success: boolean
    data?: BusinessCustomer
    error?: string
    isNew?: boolean
  }> {
    try {
      return await createFullCustomerAction(input)
    } catch (error: any) {
      console.error('Error creating full customer:', error)
      return { success: false, error: error.message }
    }
  }

  async updateItem(
    id: string,
    data: BusinessCustomerUpdate
  ): Promise<{ success: boolean; data?: BusinessCustomer; error?: string }> {
    try {
      return await updateBusinessCustomerAction(id, data)
    } catch (error: any) {
      console.error('Error updating business customer:', error)
      throw error
    }
  }

  async destroyItem(id: string): Promise<void> {
    try {
      const result = await deleteBusinessCustomerAction(id)
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete business customer')
      }
    } catch (error) {
      console.error('Error deleting business customer:', error)
      throw new Error(`Failed to destroy business customer: ${error}`)
    }
  }

  async search(businessId: string, query: string, limit?: number): Promise<BusinessCustomer[]> {
    try {
      return await searchBusinessCustomersAction(businessId, query, limit)
    } catch (error) {
      console.error('Error searching business customers:', error)
      return []
    }
  }

  async fetchCategories(
    businessAccountId: string
  ): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      return await fetchCustomerCategoriesAction(businessAccountId)
    } catch (error: any) {
      console.error('Error fetching customer categories:', error)
      return { success: false, error: error.message }
    }
  }

  async destroyMany(
    ids: string[]
  ): Promise<{ success: boolean; deletedCount: number; error?: string }> {
    try {
      return await deleteBusinessCustomersAction(ids)
    } catch (error: any) {
      console.error('Error batch deleting business customers:', error)
      return { success: false, deletedCount: 0, error: error.message }
    }
  }
}