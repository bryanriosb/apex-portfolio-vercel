'use server'

import { getSupabaseAdminClient, getAllRecords } from '@/lib/actions/supabase'
import type {
  InventoryMovement,
  InventoryMovementInsert,
  InventoryMovementWithProduct,
} from '@/lib/models/product'
import type { InventoryMovementType } from '@/lib/types/enums'

export interface InventoryMovementListResponse {
  data: InventoryMovementWithProduct[]
  total: number
  total_pages: number
}

export async function fetchInventoryMovementsAction(params?: {
  page?: number
  page_size?: number
  business_id?: string
  product_id?: string
  movement_type?: InventoryMovementType
  start_date?: string
  end_date?: string
}): Promise<InventoryMovementListResponse> {
  try {
    const supabase = await getSupabaseAdminClient()
    let query = supabase
      .from('inventory_movements')
      .select(
        `
        *,
        product:products(
          id,
          name,
          sku,
          type,
          unit_of_measure:unit_of_measures(
            id,
            name,
            abbreviation
          )
        )
      `,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })

    if (params?.business_id) {
      query = query.eq('business_id', params.business_id)
    }

    if (params?.product_id) {
      query = query.eq('product_id', params.product_id)
    }

    if (params?.movement_type) {
      query = query.eq('movement_type', params.movement_type)
    }

    if (params?.start_date) {
      query = query.gte('created_at', params.start_date)
    }

    if (params?.end_date) {
      query = query.lte('created_at', params.end_date)
    }

    const page = params?.page || 1
    const pageSize = params?.page_size || 20
    const start = (page - 1) * pageSize
    const end = start + pageSize - 1

    query = query.range(start, end)

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching inventory movements:', error)
      return { data: [], total: 0, total_pages: 0 }
    }

    return {
      data: (data || []) as InventoryMovementWithProduct[],
      total: count || 0,
      total_pages: Math.ceil((count || 0) / pageSize),
    }
  } catch (error) {
    console.error('Error fetching inventory movements:', error)
    return { data: [], total: 0, total_pages: 0 }
  }
}

export async function createInventoryMovementAction(
  data: InventoryMovementInsert
): Promise<{ success: boolean; data?: InventoryMovement; error?: string }> {
  try {
    const supabase = await getSupabaseAdminClient()

    // Get current stock
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('current_stock')
      .eq('id', data.product_id)
      .single()

    if (productError || !product) {
      return { success: false, error: 'Producto no encontrado' }
    }

    const stockBefore = product.current_stock
    let stockAfter: number

    // Calculate new stock based on movement type
    switch (data.movement_type) {
      case 'ENTRY':
        stockAfter = stockBefore + data.quantity
        break
      case 'CONSUMPTION':
      case 'SALE':
      case 'WASTE':
        stockAfter = stockBefore - data.quantity
        break
      case 'ADJUSTMENT':
        // For adjustments, quantity is the new absolute value
        stockAfter = data.quantity
        break
      case 'TRANSFER':
        stockAfter = stockBefore - data.quantity
        break
      default:
        stockAfter = stockBefore
    }

    // Prevent negative stock (warn but allow)
    if (stockAfter < 0) {
      console.warn(`Stock will be negative for product ${data.product_id}`)
    }

    // Create movement record
    const movementData = {
      ...data,
      stock_before: stockBefore,
      stock_after: stockAfter,
    }

    const { data: movement, error: movementError } = await supabase
      .from('inventory_movements')
      .insert(movementData)
      .select()
      .single()

    if (movementError) {
      return { success: false, error: movementError.message }
    }

    // Update product stock
    const { error: updateError } = await supabase
      .from('products')
      .update({ current_stock: stockAfter, updated_at: new Date().toISOString() })
      .eq('id', data.product_id)

    if (updateError) {
      console.error('Error updating product stock:', updateError)
      // Movement was created but stock update failed - log for manual fix
    }

    return { success: true, data: movement as InventoryMovement }
  } catch (error: any) {
    console.error('Error creating inventory movement:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}

export async function createBulkConsumptionAction(
  appointmentId: string,
  businessId: string,
  supplies: Array<{
    product_id: string
    quantity: number
    unit_price_cents: number
  }>,
  createdBy?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await getSupabaseAdminClient()

    for (const supply of supplies) {
      // Get current stock
      const { data: product } = await supabase
        .from('products')
        .select('current_stock')
        .eq('id', supply.product_id)
        .single()

      if (!product) continue

      const stockBefore = product.current_stock
      const stockAfter = stockBefore - supply.quantity

      // Create movement
      await supabase.from('inventory_movements').insert({
        product_id: supply.product_id,
        business_id: businessId,
        movement_type: 'CONSUMPTION',
        quantity: supply.quantity,
        stock_before: stockBefore,
        stock_after: stockAfter,
        appointment_id: appointmentId,
        unit_cost_cents: supply.unit_price_cents,
        notes: 'Consumo automático por cita completada',
        created_by: createdBy,
      })

      // Update stock
      await supabase
        .from('products')
        .update({ current_stock: stockAfter, updated_at: new Date().toISOString() })
        .eq('id', supply.product_id)
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error creating bulk consumption:', error)
    return { success: false, error: error.message }
  }
}

export async function fetchLowStockProductsAction(
  businessId: string
): Promise<{ data: any[]; count: number }> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { data, error, count } = await supabase
      .from('products')
      .select(
        `
        id,
        name,
        sku,
        type,
        current_stock,
        min_stock,
        unit_of_measure:unit_of_measures(abbreviation)
      `,
        { count: 'exact' }
      )
      .eq('business_id', businessId)
      .eq('is_active', true)
      .lte('current_stock', supabase.rpc('get_min_stock_column'))

    // Alternative approach since we can't use column reference directly
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select(
        `
        id,
        name,
        sku,
        type,
        current_stock,
        min_stock,
        unit_of_measure:unit_of_measures(abbreviation)
      `
      )
      .eq('business_id', businessId)
      .eq('is_active', true)

    if (productsError) {
      console.error('Error fetching low stock products:', productsError)
      return { data: [], count: 0 }
    }

    // Filter in JS since Supabase can't compare columns directly in simple queries
    const lowStock = (products || []).filter(
      (p) => p.current_stock <= p.min_stock
    )

    return { data: lowStock, count: lowStock.length }
  } catch (error) {
    console.error('Error fetching low stock products:', error)
    return { data: [], count: 0 }
  }
}

export async function adjustStockAction(
  productId: string,
  businessId: string,
  newStock: number,
  notes: string,
  createdBy?: string
): Promise<{ success: boolean; error?: string }> {
  return createInventoryMovementAction({
    product_id: productId,
    business_id: businessId,
    movement_type: 'ADJUSTMENT',
    quantity: newStock,
    notes,
    created_by: createdBy,
  })
}

export async function getInventoryStatsAction(
  businessId: string
): Promise<{ activeProducts: number; movementsThisMonth: number }> {
  try {
    const supabase = await getSupabaseAdminClient()

    // Get active products count
    const { count: activeProducts } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .eq('is_active', true)

    // Get movements this month
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { count: movementsThisMonth } = await supabase
      .from('inventory_movements')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .gte('created_at', startOfMonth.toISOString())

    return {
      activeProducts: activeProducts || 0,
      movementsThisMonth: movementsThisMonth || 0,
    }
  } catch (error) {
    console.error('Error fetching inventory stats:', error)
    return { activeProducts: 0, movementsThisMonth: 0 }
  }
}

export interface StockValidationItem {
  product_id: string
  quantity_required: number
}

export interface StockValidationResult {
  valid: boolean
  insufficientStock: Array<{
    product_id: string
    product_name: string
    current_stock: number
    quantity_required: number
    shortage: number
  }>
}

export async function validateStockForSuppliesAction(
  supplies: StockValidationItem[]
): Promise<StockValidationResult> {
  try {
    if (!supplies || supplies.length === 0) {
      return { valid: true, insufficientStock: [] }
    }

    const supabase = await getSupabaseAdminClient()
    const productIds = supplies.map((s) => s.product_id)

    const { data: products, error } = await supabase
      .from('products')
      .select('id, name, current_stock')
      .in('id', productIds)

    if (error) {
      console.error('Error validating stock:', error)
      return { valid: false, insufficientStock: [] }
    }

    const productMap = new Map(products?.map((p) => [p.id, p]) || [])
    const insufficientStock: StockValidationResult['insufficientStock'] = []

    for (const supply of supplies) {
      const product = productMap.get(supply.product_id)
      if (!product) continue

      if (product.current_stock < supply.quantity_required) {
        insufficientStock.push({
          product_id: product.id,
          product_name: product.name,
          current_stock: product.current_stock,
          quantity_required: supply.quantity_required,
          shortage: supply.quantity_required - product.current_stock,
        })
      }
    }

    return {
      valid: insufficientStock.length === 0,
      insufficientStock,
    }
  } catch (error) {
    console.error('Error validating stock:', error)
    return { valid: false, insufficientStock: [] }
  }
}
