export interface AppointmentSupply {
  id: string
  appointment_id: string
  product_id: string
  quantity_used: number
  unit_price_cents: number
  total_price_cents: number
  created_at: string
  created_by: string | null
}

export interface AppointmentSupplyInsert {
  appointment_id: string
  product_id: string
  quantity_used: number
  unit_price_cents: number
  total_price_cents: number
}

export interface AppointmentSupplyWithProduct extends AppointmentSupply {
  product: {
    id: string
    name: string
    unit_of_measure?: {
      abbreviation: string
    } | null
  }
}

export interface SelectedSupply {
  product_id: string
  name: string
  quantity: number
  unit_price_cents: number
  unit_abbreviation: string
  current_stock: number
}
