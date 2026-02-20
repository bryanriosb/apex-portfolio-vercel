export interface InvoiceSettings {
  id: string
  business_id: string
  prefix: string
  next_number: number
  created_at: string
  updated_at: string
}

export interface InvoiceSettingsInsert {
  business_id: string
  prefix?: string
  next_number?: number
}

export interface InvoiceSettingsUpdate {
  prefix?: string
  next_number?: number
}
