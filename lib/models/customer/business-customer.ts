export type CustomerStatus = 'active' | 'inactive' | 'vip' | 'blocked'

export interface CustomerCategory {
  id: string
  business_account_id: string
  name: string
  description?: string | null
  created_at: string
  updated_at: string
}

export interface BusinessCustomer {
  id: string
  business_id: string
  company_name?: string | null
  nit: string
  full_name: string
  emails: string[]
  phone?: string | null
  status: CustomerStatus
  category?: string | null
  category_name?: any | null
  notes?: string | null
  preferences?: string | null
  tags?: string[] | null
  created_at: string
  updated_at: string
}

export class BusinessCustomerModel implements BusinessCustomer {
  id: string
  business_id: string
  company_name?: string | null
  nit: string
  full_name: string
  emails: string[]
  phone?: string | null
  status: CustomerStatus
  category?: string | null
  category_name?: string | null
  notes?: string | null
  preferences?: string | null
  tags?: string[] | null
  created_at: string
  updated_at: string

  constructor(data: BusinessCustomer) {
    this.id = data.id
    this.business_id = data.business_id
    this.company_name = data.company_name
    this.nit = data.nit
    this.full_name = data.full_name
    this.emails = data.emails ?? []
    this.phone = data.phone
    this.status = data.status
    this.category = data.category
    this.category_name = data.category_name
    this.notes = data.notes
    this.preferences = data.preferences
    this.tags = data.tags
    this.created_at = data.created_at
    this.updated_at = data.updated_at
  }

  get isVip(): boolean {
    return this.status === 'vip'
  }

  get isActive(): boolean {
    return this.status === 'active' || this.status === 'vip'
  }
}

export interface BusinessCustomerInsert {
  business_id: string
  company_name?: string | null
  nit: string
  full_name: string
  emails: string[]
  phone?: string | null
  status?: CustomerStatus
  category?: string | null
  notes?: string | null
  preferences?: string | null
  tags?: string[] | null
}

export interface BusinessCustomerUpdate {
  company_name?: string | null
  nit?: string
  full_name?: string
  emails?: string[]
  phone?: string | null
  status?: CustomerStatus
  category?: string | null
  notes?: string | null
  preferences?: string | null
  tags?: string[] | null
}

export interface CreateCustomerInput {
  business_id: string
  company_name?: string | null
  nit: string
  full_name: string
  emails: string[]
  phone?: string | null
  status?: CustomerStatus
  category?: string | null
  notes?: string | null
  preferences?: string | null
  tags?: string[] | null
}
