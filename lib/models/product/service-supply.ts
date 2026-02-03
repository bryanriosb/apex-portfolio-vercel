export interface ServiceSupply {
  id: string
  service_id: string
  product_id: string
  default_quantity: number
  is_required: boolean
  created_at: string
}

export interface ServiceSupplyWithProduct extends ServiceSupply {
  product: {
    id: string
    name: string
    cost_price_cents: number
    current_stock: number
    unit_of_measure?: {
      abbreviation: string
    } | null
  }
}

export interface ServiceSupplyInsert {
  service_id: string
  product_id: string
  default_quantity: number
  is_required?: boolean
}

export interface ServiceSupplyUpdate {
  default_quantity?: number
  is_required?: boolean
}

export interface ServiceWithSupplies {
  id: string
  name: string
  price_cents: number
  duration_minutes: number
  service_supplies?: ServiceSupplyWithProduct[]
}
