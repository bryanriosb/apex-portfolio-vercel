import type { BusinessType } from '@/lib/types/enums'

export interface Business {
  id: string
  business_account_id: string
  name: string
  description: string | null
  address: string
  city: string
  state: string
  location: string | null // Geography point
  phone_number: string | null
  nit: string | null
  gallery_cover_image_url: string | null
  type: BusinessType
  avg_rating: number
  review_count: number
  logo_url: string | null
  created_at: string
  updated_at: string
}

export class Business implements Business {
  id: string
  business_account_id: string
  name: string
  description: string | null
  address: string
  city: string
  state: string
  location: string | null
  phone_number: string | null
  nit: string | null
  gallery_cover_image_url: string | null
  type: BusinessType
  avg_rating: number
  review_count: number
  logo_url: string | null
  created_at: string
  updated_at: string

  constructor(data: Business) {
    this.id = data.id
    this.business_account_id = data.business_account_id
    this.name = data.name
    this.description = data.description
    this.address = data.address
    this.city = data.city
    this.location = data.location
    this.state = data.state
    this.phone_number = data.phone_number
    this.nit = data.nit
    this.gallery_cover_image_url = data.gallery_cover_image_url
    this.type = data.type
    this.avg_rating = data.avg_rating
    this.review_count = data.review_count
    this.logo_url = data.logo_url
    this.created_at = data.created_at
    this.updated_at = data.updated_at
  }
}

export interface BusinessInsert {
  business_account_id: string
  name: string
  description?: string | null
  address: string
  city: string
  state: string
  location?: string | null
  phone_number?: string | null
  nit?: string | null
  gallery_cover_image_url?: string | null
  type?: BusinessType
  logo_url?: string | null
}

export interface BusinessUpdate {
  name?: string
  description?: string | null
  address?: string
  city?: string
  state?: string
  location?: string | null
  phone_number?: string | null
  nit?: string | null
  gallery_cover_image_url?: string | null
  type?: BusinessType
  avg_rating?: number
  review_count?: number
  logo_url?: string | null
}

export interface BusinessWithAccount extends Business {
  business_account: {
    company_name: string
  } | null
}
