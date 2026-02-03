import {
  fetchInvoicesAction,
  getInvoiceByIdAction,
  getInvoiceByAppointmentAction,
  getNextInvoiceNumberAction,
  createInvoiceAction,
  updateInvoiceAction,
  deleteInvoiceAction,
  createInvoiceFromAppointmentAction,
} from '@/lib/actions/invoice'
import type { Invoice, InvoiceInsert, InvoiceUpdate } from '@/lib/models/invoice/invoice'

export interface InvoiceListResponse {
  data: Invoice[]
  total: number
  total_pages: number
}

export default class InvoiceService {
  async fetchItems(params?: {
    page?: number
    page_size?: number
    business_id?: string
    status?: string
    search?: string
  }): Promise<InvoiceListResponse> {
    try {
      return await fetchInvoicesAction(params)
    } catch (error) {
      console.error('Error fetching invoices:', error)
      throw error
    }
  }

  async getById(id: string): Promise<Invoice | null> {
    try {
      return await getInvoiceByIdAction(id)
    } catch (error) {
      console.error('Error fetching invoice by ID:', error)
      throw error
    }
  }

  async getByAppointment(appointmentId: string): Promise<Invoice | null> {
    try {
      return await getInvoiceByAppointmentAction(appointmentId)
    } catch (error) {
      console.error('Error fetching invoice by appointment:', error)
      return null
    }
  }

  async getNextInvoiceNumber(businessId: string): Promise<string> {
    try {
      return await getNextInvoiceNumberAction(businessId)
    } catch (error) {
      console.error('Error getting next invoice number:', error)
      throw error
    }
  }

  async createItem(
    data: InvoiceInsert
  ): Promise<{ success: boolean; data?: Invoice; error?: string }> {
    try {
      return await createInvoiceAction(data)
    } catch (error: any) {
      console.error('Error creating invoice:', error)
      throw error
    }
  }

  async updateItem(
    id: string,
    data: InvoiceUpdate
  ): Promise<{ success: boolean; data?: Invoice; error?: string }> {
    try {
      return await updateInvoiceAction(id, data)
    } catch (error: any) {
      console.error('Error updating invoice:', error)
      throw error
    }
  }

  async destroyItem(id: string): Promise<void> {
    try {
      const result = await deleteInvoiceAction(id)
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete invoice')
      }
    } catch (error) {
      console.error('Error deleting invoice:', error)
      throw new Error(`Failed to destroy invoice: ${error}`)
    }
  }

  async createFromAppointment(
    appointmentId: string,
    businessData: {
      business_name: string
      business_address?: string
      business_phone?: string
      business_nit?: string
    }
  ): Promise<{ success: boolean; data?: Invoice; error?: string }> {
    try {
      return await createInvoiceFromAppointmentAction(appointmentId, businessData)
    } catch (error: any) {
      console.error('Error creating invoice from appointment:', error)
      return { success: false, error: error.message }
    }
  }
}
