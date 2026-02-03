import { ServiceType } from '@/lib/types/enums'

export interface ServiceCategory {
  id: string
  name: string
  icon_key: string | null
}

export interface Service {
  id: string
  business_id: string
  category_id: string | null
  name: string
  description: string | null
  price_cents: number
  duration_minutes: number
  is_featured: boolean
  image_url: string | null
  tax_rate: number | null
  service_type: ServiceType
  created_at: string
  updated_at: string
}

export class Service implements Service {
  id: string
  business_id: string
  category_id: string | null
  name: string
  description: string | null
  price_cents: number
  duration_minutes: number
  is_featured: boolean
  image_url: string | null
  tax_rate: number | null
  service_type: ServiceType
  created_at: string
  updated_at: string

  constructor(data: Service) {
    this.id = data.id
    this.business_id = data.business_id
    this.category_id = data.category_id
    this.name = data.name
    this.description = data.description
    this.price_cents = data.price_cents
    this.duration_minutes = data.duration_minutes
    this.is_featured = data.is_featured
    this.image_url = data.image_url
    this.tax_rate = data.tax_rate
    this.service_type = data.service_type
    this.created_at = data.created_at
    this.updated_at = data.updated_at
  }

  get price(): number {
    return this.price_cents / 100
  }

  get hasTax(): boolean {
    return this.tax_rate !== null && this.tax_rate > 0
  }
}

export interface ServiceInsert {
  business_id: string
  category_id?: string | null
  name: string
  description?: string | null
  price_cents: number
  duration_minutes: number
  is_featured?: boolean
  image_url?: string | null
  tax_rate?: number | null
  service_type?: ServiceType
}

export interface ServiceUpdate {
  business_id?: string
  category_id?: string | null
  name?: string
  description?: string | null
  price_cents?: number
  duration_minutes?: number
  is_featured?: boolean
  image_url?: string | null
  tax_rate?: number | null
  service_type?: ServiceType
}

export interface ServiceWithCategory extends Service {
  category?: ServiceCategory | null
}

export interface AppointmentService {
  id: string
  appointment_id: string
  service_id: string
  specialist_id: string | null
  price_at_booking_cents: number
  duration_minutes: number
  start_time: string | null
  end_time: string | null
}

export interface AppointmentServiceWithDetails extends AppointmentService {
  service: Service
  specialist?: {
    id: string
    first_name: string
    last_name: string | null
    specialty: string | null
    profile_picture_url: string | null
  } | null
}
