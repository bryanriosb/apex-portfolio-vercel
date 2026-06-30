import {
  listInvoicesAction,
  getInvoiceAction,
  createInvoiceAction,
  updateInvoiceAction,
  deleteInvoiceAction,
} from '@/lib/actions/api/invoices'
import type {
  Invoice,
  InvoiceListParams,
  InvoiceCreatePayload,
  InvoiceUpdatePayload,
  InvoicesPaginatedResponse,
} from '@/lib/models/invoice/types'

export interface InvoiceListResponse {
  data: Invoice[]
  total: number
  total_pages: number
}

export default class InvoiceService {
  async fetchItems(
    params?: InvoiceListParams
  ): Promise<InvoiceListResponse> {
    try {
      const response = await listInvoicesAction(params)
      return {
        data: response.items,
        total: response.total,
        total_pages: Math.ceil(response.total / (params?.per_page || 20)),
      }
    } catch (error) {
      console.error('Error fetching invoices:', error)
      throw error
    }
  }

  async getById(id: string): Promise<Invoice | null> {
    try {
      return await getInvoiceAction(id)
    } catch (error) {
      console.error('Error fetching invoice by ID:', error)
      throw error
    }
  }

  async create(
    data: InvoiceCreatePayload
  ): Promise<{ success: boolean; data?: Invoice; error?: string }> {
    try {
      const result = await createInvoiceAction(data)
      return { success: true, data: result }
    } catch (error: any) {
      console.error('Error creating invoice:', error)
      return { success: false, error: error.message }
    }
  }

  async update(
    id: string,
    data: InvoiceUpdatePayload
  ): Promise<{ success: boolean; data?: Invoice; error?: string }> {
    try {
      const result = await updateInvoiceAction(id, data)
      return { success: true, data: result }
    } catch (error: any) {
      console.error('Error updating invoice:', error)
      return { success: false, error: error.message }
    }
  }

  async destroy(id: string): Promise<void> {
    try {
      await deleteInvoiceAction(id)
    } catch (error) {
      console.error('Error deleting invoice:', error)
      throw new Error(`Failed to destroy invoice: ${error}`)
    }
  }

  async destroyMany(
    ids: string[]
  ): Promise<{ success: boolean; deletedCount: number; error?: string }> {
    try {
      let deletedCount = 0
      for (const id of ids) {
        await deleteInvoiceAction(id)
        deletedCount++
      }
      return { success: true, deletedCount }
    } catch (error: any) {
      console.error('Error batch deleting invoices:', error)
      return { success: false, deletedCount: 0, error: error.message }
    }
  }
}
