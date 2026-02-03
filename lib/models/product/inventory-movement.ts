import { InventoryMovementType } from '@/lib/types/enums'

export interface InventoryMovement {
  id: string
  product_id: string
  business_id: string
  movement_type: InventoryMovementType
  quantity: number
  stock_before: number
  stock_after: number
  appointment_id: string | null
  sale_id: string | null
  transfer_to_business_id: string | null
  unit_cost_cents: number | null
  notes: string | null
  created_at: string
  created_by: string | null
}

export interface InventoryMovementInsert {
  product_id: string
  business_id: string
  movement_type: InventoryMovementType
  quantity: number
  stock_before?: number
  stock_after?: number
  appointment_id?: string | null
  sale_id?: string | null
  transfer_to_business_id?: string | null
  unit_cost_cents?: number | null
  notes?: string | null
  created_by?: string | null
}

export interface InventoryMovementWithProduct extends InventoryMovement {
  product: {
    id: string
    name: string
    sku: string | null
    unit_of_measure?: {
      abbreviation: string
    } | null
  }
}

export interface InventoryMovementListResponse {
  data: InventoryMovementWithProduct[]
  total: number
  total_pages: number
}
