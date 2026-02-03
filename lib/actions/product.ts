'use server'

import {
  getAllRecords,
  getRecordById,
  insertRecord,
  updateRecord,
  deleteRecord,
  deleteRecords,
  getSupabaseAdminClient,
} from '@/lib/actions/supabase'
import type {
  Product,
  ProductInsert,
  ProductUpdate,
  ProductWithDetails,
  ProductListResponse,
} from '@/lib/models/product'

export async function fetchProductsAction(params?: {
  page?: number
  page_size?: number
  business_id?: string
  category_id?: string
  type?: 'SUPPLY' | 'RETAIL'
  is_active?: boolean
  low_stock_only?: boolean
}): Promise<ProductListResponse> {
  try {
    const client = await getSupabaseAdminClient()
    let query = client
      .from('products')
      .select(`
        *,
        category:product_categories(id, name, icon_key),
        unit_of_measure:unit_of_measures(id, name, abbreviation)
      `)
      .order('created_at', { ascending: false })

    if (params?.business_id) {
      query = query.eq('business_id', params.business_id)
    }

    if (params?.category_id) {
      query = query.eq('category_id', params.category_id)
    }

    if (params?.type) {
      query = query.eq('type', params.type)
    }

    if (params?.is_active !== undefined) {
      query = query.eq('is_active', params.is_active)
    }

    const { data: products, error } = await query

    if (error) {
      console.error('Error fetching products:', error)
      return { data: [], total: 0, total_pages: 0 }
    }

    let filteredProducts = products || []

    if (params?.low_stock_only) {
      filteredProducts = filteredProducts.filter(
        (p: any) => p.current_stock <= p.min_stock
      )
    }

    const page = params?.page || 1
    const pageSize = params?.page_size || 20
    const start = (page - 1) * pageSize
    const end = start + pageSize

    const paginatedData = filteredProducts.slice(start, end)
    const totalPages = Math.ceil(filteredProducts.length / pageSize)

    return {
      data: paginatedData as ProductWithDetails[],
      total: filteredProducts.length,
      total_pages: totalPages,
    }
  } catch (error) {
    console.error('Error fetching products:', error)
    return { data: [], total: 0, total_pages: 0 }
  }
}

export async function getProductByIdAction(
  id: string
): Promise<ProductWithDetails | null> {
  try {
    const client = await getSupabaseAdminClient()
    const { data, error } = await client
      .from('products')
      .select(`
        *,
        category:product_categories(id, name, icon_key),
        unit_of_measure:unit_of_measures(id, name, abbreviation)
      `)
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching product:', error)
      return null
    }

    return data as ProductWithDetails
  } catch (error) {
    console.error('Error fetching product:', error)
    return null
  }
}

export async function createProductAction(
  data: ProductInsert
): Promise<{ success: boolean; data?: Product; error?: string }> {
  try {
    const product = await insertRecord<Product>('products', data)

    if (!product) {
      return { success: false, error: 'Error al crear el producto' }
    }

    return { success: true, data: product }
  } catch (error: any) {
    console.error('Error creating product:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}

export async function updateProductAction(
  id: string,
  data: ProductUpdate
): Promise<{ success: boolean; data?: Product; error?: string }> {
  try {
    const product = await updateRecord<Product>('products', id, data)

    if (!product) {
      return { success: false, error: 'Error al actualizar el producto' }
    }

    return { success: true, data: product }
  } catch (error: any) {
    console.error('Error updating product:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}

export async function deleteProductAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await deleteRecord('products', id)
    return { success: true }
  } catch (error: any) {
    console.error('Error deleting product:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}

export async function deleteProductsAction(
  ids: string[]
): Promise<{ success: boolean; deletedCount: number; error?: string }> {
  try {
    return await deleteRecords('products', ids)
  } catch (error: any) {
    console.error('Error batch deleting products:', error)
    return { success: false, deletedCount: 0, error: error.message }
  }
}

export async function fetchLowStockProductsAction(
  businessId: string
): Promise<ProductWithDetails[]> {
  try {
    const client = await getSupabaseAdminClient()
    const { data, error } = await client
      .from('products')
      .select(`
        *,
        category:product_categories(id, name, icon_key),
        unit_of_measure:unit_of_measures(id, name, abbreviation)
      `)
      .eq('business_id', businessId)
      .eq('is_active', true)
      .lte('current_stock', 'min_stock')

    if (error) {
      console.error('Error fetching low stock products:', error)
      return []
    }

    return (data || []).filter(
      (p: any) => p.current_stock <= p.min_stock
    ) as ProductWithDetails[]
  } catch (error) {
    console.error('Error fetching low stock products:', error)
    return []
  }
}

export async function updateProductStockAction(
  id: string,
  newStock: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = await getSupabaseAdminClient()
    const { error } = await client
      .from('products')
      .update({ current_stock: newStock, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error updating product stock:', error)
    return { success: false, error: error.message }
  }
}
