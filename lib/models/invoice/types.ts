export type InvoiceStatus = 'draft' | 'pending' | 'paid' | 'partial' | 'cancelled'

export interface Invoice {
  id: string
  erp_id: string
  amount_due: number
  amount_total: number
  invoice_number: string
  invoice_date: string
  due_date: string
  days_overdue: number
  status: InvoiceStatus
  metadata?: string | null
  client_id?: string | null
  client_name?: string | null
  client_tax_id?: string | null
  created_at: string
  updated_at: string
}

export interface InvoiceListParams {
  page?: number
  per_page?: number
  status?: InvoiceStatus
  client_id?: string
  from_date?: string
  to_date?: string
  search?: string
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

export interface InvoiceCreatePayload {
  erp_id: string
  amount_due: number
  amount_total: number
  invoice_number: string
  invoice_date: string
  due_date: string
  status?: InvoiceStatus
  metadata?: string
  client_id?: string
}

export interface InvoiceUpdatePayload {
  amount_due?: number
  amount_total?: number
  status?: InvoiceStatus
  due_date?: string
  days_overdue?: number
  metadata?: string
  priority_score?: number
  invoice_number?: string
}

export interface InvoicesPaginatedResponse {
  items: Invoice[]
  total: number
  page: number
  per_page: number
}
