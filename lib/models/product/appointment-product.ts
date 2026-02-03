export interface AppointmentProduct {
  id: string
  appointment_id: string
  product_id: string
  quantity: number
  unit_price_cents: number
  total_price_cents: number
  created_at: string
}

export interface AppointmentProductInsert {
  appointment_id: string
  product_id: string
  quantity: number
  unit_price_cents: number
  total_price_cents: number
}

export interface AppointmentProductWithDetails extends AppointmentProduct {
  product: {
    id: string
    name: string
    image_url: string | null
  }
}

export interface SelectedProduct {
  product_id: string
  name: string
  quantity: number
  unit_price_cents: number
  image_url: string | null
}
