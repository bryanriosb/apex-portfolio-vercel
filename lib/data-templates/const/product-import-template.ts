import type { ProductType } from '@/lib/types/enums'

export interface ProductRow {
  name: string
  type: ProductType
  cost_price: number
  description?: string
  sku?: string
  barcode?: string
  category_name?: string
  unit_of_measure_name?: string
  sale_price?: number
  current_stock?: number
  min_stock?: number
  max_stock?: number
  tax_rate?: number
  is_active?: boolean
}

export const DEFAULT_PRODUCT_TEMPLATES: ProductRow[] = [
  {
    name: 'Shampoo Keratina 500ml',
    type: 'SUPPLY',
    cost_price: 25000,
    sale_price: 35000,
    description: 'Shampoo profesional con keratina para cabello maltratado',
    sku: 'SHP-KRT-500',
    category_name: 'Cabello',
    unit_of_measure_name: 'Unidad',
    current_stock: 50,
    min_stock: 10,
    max_stock: 100,
    tax_rate: 0,
    is_active: true,
  },
  {
    name: 'Tinte Castaño Oscuro',
    type: 'SUPPLY',
    cost_price: 15000,
    description: 'Tinte permanente color castaño oscuro',
    sku: 'TNT-CST-OSC',
    barcode: '7501234567890',
    category_name: 'Cabello',
    unit_of_measure_name: 'Tubo',
    current_stock: 30,
    min_stock: 5,
    tax_rate: 0,
    is_active: true,
  },
  {
    name: 'Esmalte Rojo Pasión',
    type: 'RETAIL',
    cost_price: 8000,
    sale_price: 15000,
    description: 'Esmalte de uñas color rojo intenso',
    sku: 'ESM-RJ-001',
    category_name: 'Uñas',
    unit_of_measure_name: 'Frasco',
    current_stock: 25,
    min_stock: 10,
    tax_rate: 19,
    is_active: true,
  },
  {
    name: 'Crema Hidratante Facial 100ml',
    type: 'RETAIL',
    cost_price: 35000,
    sale_price: 65000,
    description: 'Crema hidratante para todo tipo de piel',
    sku: 'CRM-HID-100',
    category_name: 'Cuidado Facial',
    unit_of_measure_name: 'Unidad',
    current_stock: 15,
    min_stock: 5,
    max_stock: 50,
    tax_rate: 19,
    is_active: true,
  },
]
