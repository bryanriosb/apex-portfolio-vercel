import type { PaymentMethod } from '@/lib/types/enums'

export interface AppointmentPayment {
  id: string
  appointment_id: string
  business_id: string
  amount_cents: number
  payment_method: PaymentMethod
  payment_date: string
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface AppointmentPaymentInsert {
  appointment_id: string
  business_id: string
  amount_cents: number
  payment_method: PaymentMethod
  payment_date?: string
  notes?: string | null
  created_by?: string | null
}

export interface AppointmentPaymentUpdate {
  amount_cents?: number
  payment_method?: PaymentMethod
  payment_date?: string
  notes?: string | null
}

export interface AppointmentPaymentWithCreator extends AppointmentPayment {
  creator?: {
    id: string
    user_id: string
    profile_picture_url: string | null
    user?: {
      name?: string
      email?: string
    } | null
  } | null
}
