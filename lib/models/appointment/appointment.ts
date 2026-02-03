import type { AppointmentStatus, PaymentStatus, PaymentMethod } from '@/lib/types/enums'

export interface Appointment {
  id: string
  users_profile_id: string
  business_id: string
  specialist_id: string
  start_time: string
  end_time: string
  status: AppointmentStatus
  customer_note: string | null
  subtotal_cents: number
  tax_cents: number
  discount_cents: number
  total_price_cents: number
  amount_paid_cents: number
  payment_status: PaymentStatus
  payment_method: PaymentMethod
  created_at: string
  updated_at: string
}

export class Appointment implements Appointment {
  id: string
  users_profile_id: string
  business_id: string
  specialist_id: string
  start_time: string
  end_time: string
  status: AppointmentStatus
  customer_note: string | null
  subtotal_cents: number
  tax_cents: number
  discount_cents: number
  total_price_cents: number
  amount_paid_cents: number
  payment_status: PaymentStatus
  payment_method: PaymentMethod
  created_at: string
  updated_at: string

  constructor(data: Appointment) {
    this.id = data.id
    this.users_profile_id = data.users_profile_id
    this.business_id = data.business_id
    this.specialist_id = data.specialist_id
    this.start_time = data.start_time
    this.end_time = data.end_time
    this.status = data.status
    this.customer_note = data.customer_note
    this.subtotal_cents = data.subtotal_cents
    this.tax_cents = data.tax_cents
    this.discount_cents = data.discount_cents
    this.total_price_cents = data.total_price_cents
    this.amount_paid_cents = data.amount_paid_cents
    this.payment_status = data.payment_status
    this.payment_method = data.payment_method
    this.created_at = data.created_at
    this.updated_at = data.updated_at
  }

  get totalPrice(): number {
    return this.total_price_cents / 100
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

  get amountPaid(): number {
    return this.amount_paid_cents / 100
  }

  get balanceDue(): number {
    return (this.total_price_cents - this.amount_paid_cents) / 100
  }

  get balanceDueCents(): number {
    return this.total_price_cents - this.amount_paid_cents
  }
}

export interface AppointmentInsert {
  users_profile_id: string
  business_id: string
  specialist_id: string
  start_time: string
  end_time: string
  status?: AppointmentStatus
  customer_note?: string | null
  subtotal_cents?: number
  tax_cents?: number
  discount_cents?: number
  total_price_cents?: number
  amount_paid_cents?: number
  payment_status?: PaymentStatus
  payment_method?: PaymentMethod
}

export interface AppointmentUpdate {
  users_profile_id?: string
  business_id?: string
  specialist_id?: string
  start_time?: string
  end_time?: string
  status?: AppointmentStatus
  customer_note?: string | null
  subtotal_cents?: number
  tax_cents?: number
  discount_cents?: number
  total_price_cents?: number
  amount_paid_cents?: number
  payment_status?: PaymentStatus
  payment_method?: PaymentMethod
}

export interface AppointmentWithDetails extends Appointment {
  specialist?: {
    id: string
    first_name: string
    last_name: string | null
    specialty: string | null
    profile_picture_url: string | null
  }
  business?: {
    id: string
    name: string
    logo_url: string | null
  }
  user_profile?: {
    id: string
    user_id: string
    profile_picture_url: string | null
    user?: {
      email?: string
      name?: string
      phone?: string
    } | null
  }
  appointment_services?: Array<{
    id: string
    service_id: string
    specialist_id: string | null
    price_at_booking_cents: number
    duration_minutes: number
    start_time: string | null
    end_time: string | null
    service: {
      id: string
      name: string
      description: string | null
      category_id: string | null
      tax_rate: number | null
      service_category?: {
        id: string
        name: string
        icon_key: string | null
      } | null
    }
    specialist?: {
      id: string
      first_name: string
      last_name: string | null
      specialty: string | null
      profile_picture_url: string | null
    } | null
  }>
  appointment_supplies?: Array<{
    id: string
    product_id: string
    quantity_used: number
    unit_price_cents: number
    total_price_cents: number
    product: {
      id: string
      name: string
      unit_of_measure?: {
        abbreviation: string
      } | null
    }
  }>
}
