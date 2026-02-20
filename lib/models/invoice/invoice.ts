import type { InvoiceStatus, PaymentMethod } from '@/lib/types/enums'

export interface InvoiceItem {
  service_id: string | null
  name: string
  quantity: number
  unit_price_cents: number
  total_cents: number
  tax_rate: number | null
  tax_cents: number
}

export interface Invoice {
  id: string
  business_id: string
  appointment_id: string | null
  invoice_number: string
  customer_name: string
  customer_email: string | null
  customer_phone: string | null
  customer_identification_type: string | null
  customer_identification_number: string | null
  customer_address: string | null
  business_name: string
  business_address: string | null
  business_phone: string | null
  business_nit: string | null
  subtotal_cents: number
  tax_rate: number
  tax_cents: number
  discount_cents: number
  total_cents: number
  status: InvoiceStatus
  payment_method: PaymentMethod | null
  items: InvoiceItem[]
  notes: string | null
  issued_at: string | null
  paid_at: string | null
  created_at: string
  updated_at: string
}

export class Invoice implements Invoice {
  id: string
  business_id: string
  appointment_id: string | null
  invoice_number: string
  customer_name: string
  customer_email: string | null
  customer_phone: string | null
  customer_identification_type: string | null
  customer_identification_number: string | null
  customer_address: string | null
  business_name: string
  business_address: string | null
  business_phone: string | null
  business_nit: string | null
  subtotal_cents: number
  tax_rate: number
  tax_cents: number
  discount_cents: number
  total_cents: number
  status: InvoiceStatus
  payment_method: PaymentMethod | null
  items: InvoiceItem[]
  notes: string | null
  issued_at: string | null
  paid_at: string | null
  created_at: string
  updated_at: string

  constructor(data: Invoice) {
    this.id = data.id
    this.business_id = data.business_id
    this.appointment_id = data.appointment_id
    this.invoice_number = data.invoice_number
    this.customer_name = data.customer_name
    this.customer_email = data.customer_email
    this.customer_phone = data.customer_phone
    this.customer_identification_type = data.customer_identification_type
    this.customer_identification_number = data.customer_identification_number
    this.customer_address = data.customer_address
    this.business_name = data.business_name
    this.business_address = data.business_address
    this.business_phone = data.business_phone
    this.business_nit = data.business_nit
    this.subtotal_cents = data.subtotal_cents
    this.tax_rate = data.tax_rate
    this.tax_cents = data.tax_cents
    this.discount_cents = data.discount_cents
    this.total_cents = data.total_cents
    this.status = data.status
    this.payment_method = data.payment_method
    this.items = data.items
    this.notes = data.notes
    this.issued_at = data.issued_at
    this.paid_at = data.paid_at
    this.created_at = data.created_at
    this.updated_at = data.updated_at
  }

  get subtotal(): number {
    return this.subtotal_cents / 100
  }

  get tax(): number {
    return this.tax_cents / 100
  }

  get discount(): number {
    return this.discount_cents / 100
  }

  get total(): number {
    return this.total_cents / 100
  }

  get isPaid(): boolean {
    return this.status === 'PAID'
  }

  get isEditable(): boolean {
    return this.status === 'DRAFT'
  }

  // Precios ya incluyen IVA - calcular base desde el total
  static calculateSubtotal(totalCents: number, taxRate: number): number {
    return Math.round(totalCents / (1 + taxRate / 100))
  }

  static calculateTax(totalCents: number, taxRate: number): number {
    const subtotal = Math.round(totalCents / (1 + taxRate / 100))
    return totalCents - subtotal
  }
}

export interface InvoiceInsert {
  business_id: string
  appointment_id?: string | null
  invoice_number: string
  customer_name: string
  customer_email?: string | null
  customer_phone?: string | null
  customer_identification_type?: string | null
  customer_identification_number?: string | null
  customer_address?: string | null
  business_name: string
  business_address?: string | null
  business_phone?: string | null
  business_nit?: string | null
  subtotal_cents: number
  tax_rate?: number
  tax_cents: number
  discount_cents?: number
  total_cents: number
  status?: InvoiceStatus
  payment_method?: PaymentMethod | null
  items: InvoiceItem[]
  notes?: string | null
  issued_at?: string | null
}

export interface InvoiceUpdate {
  customer_name?: string
  customer_email?: string | null
  customer_phone?: string | null
  customer_identification_type?: string | null
  customer_identification_number?: string | null
  customer_address?: string | null
  subtotal_cents?: number
  tax_rate?: number
  tax_cents?: number
  discount_cents?: number
  total_cents?: number
  status?: InvoiceStatus
  payment_method?: PaymentMethod | null
  items?: InvoiceItem[]
  notes?: string | null
  issued_at?: string | null
  paid_at?: string | null
}
