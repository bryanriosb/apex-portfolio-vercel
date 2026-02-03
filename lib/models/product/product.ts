import { ProductType } from '@/lib/types/enums'

export interface ProductCategory {
  id: string
  name: string
  description: string | null
  icon_key: string | null
}

export interface UnitOfMeasure {
  id: string
  name: string
  abbreviation: string
}

export interface Product {
  id: string
  business_id: string
  category_id: string | null
  unit_of_measure_id: string | null
  name: string
  description: string | null
  sku: string | null
  barcode: string | null
  type: ProductType
  cost_price_cents: number
  sale_price_cents: number
  current_stock: number
  min_stock: number
  max_stock: number | null
  image_url: string | null
  is_active: boolean
  tax_rate: number | null
  created_at: string
  updated_at: string
}

export class ProductModel implements Product {
  id: string
  business_id: string
  category_id: string | null
  unit_of_measure_id: string | null
  name: string
  description: string | null
  sku: string | null
  barcode: string | null
  type: ProductType
  cost_price_cents: number
  sale_price_cents: number
  current_stock: number
  min_stock: number
  max_stock: number | null
  image_url: string | null
  is_active: boolean
  tax_rate: number | null
  created_at: string
  updated_at: string

  constructor(data: Product) {
    this.id = data.id
    this.business_id = data.business_id
    this.category_id = data.category_id
    this.unit_of_measure_id = data.unit_of_measure_id
    this.name = data.name
    this.description = data.description
    this.sku = data.sku
    this.barcode = data.barcode
    this.type = data.type
    this.cost_price_cents = data.cost_price_cents
    this.sale_price_cents = data.sale_price_cents
    this.current_stock = data.current_stock
    this.min_stock = data.min_stock
    this.max_stock = data.max_stock
    this.image_url = data.image_url
    this.is_active = data.is_active
    this.tax_rate = data.tax_rate
    this.created_at = data.created_at
    this.updated_at = data.updated_at
  }

  get costPrice(): number {
    return this.cost_price_cents / 100
  }

  get salePrice(): number {
    return this.sale_price_cents / 100
  }

  get isLowStock(): boolean {
    return this.current_stock <= this.min_stock
  }

  get isOutOfStock(): boolean {
    return this.current_stock <= 0
  }

  get isSupply(): boolean {
    return this.type === 'SUPPLY'
  }

  get isRetail(): boolean {
    return this.type === 'RETAIL'
  }
}

export interface ProductInsert {
  business_id: string
  category_id?: string | null
  unit_of_measure_id?: string | null
  name: string
  description?: string | null
  sku?: string | null
  barcode?: string | null
  type: ProductType
  cost_price_cents: number
  sale_price_cents?: number
  current_stock?: number
  min_stock?: number
  max_stock?: number | null
  image_url?: string | null
  is_active?: boolean
  tax_rate?: number | null
}

export interface ProductUpdate {
  category_id?: string | null
  unit_of_measure_id?: string | null
  name?: string
  description?: string | null
  sku?: string | null
  barcode?: string | null
  type?: ProductType
  cost_price_cents?: number
  sale_price_cents?: number
  min_stock?: number
  max_stock?: number | null
  image_url?: string | null
  is_active?: boolean
  tax_rate?: number | null
}

export interface ProductWithDetails extends Product {
  category?: ProductCategory | null
  unit_of_measure?: UnitOfMeasure | null
}

export interface ProductListResponse {
  data: ProductWithDetails[]
  total: number
  total_pages: number
}
