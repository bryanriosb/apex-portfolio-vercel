'use server'

import { getAllRecords, getSupabaseAdminClient } from '@/lib/actions/supabase'
import type { ProductCategory, UnitOfMeasure } from '@/lib/models/product'

export async function fetchProductCategoriesAction(): Promise<ProductCategory[]> {
  try {
    return await getAllRecords<ProductCategory>('product_categories', {
      order: { column: 'name', ascending: true },
    })
  } catch (error) {
    console.error('Error fetching product categories:', error)
    return []
  }
}

export async function fetchUnitOfMeasuresAction(): Promise<UnitOfMeasure[]> {
  try {
    return await getAllRecords<UnitOfMeasure>('unit_of_measures', {
      order: { column: 'name', ascending: true },
    })
  } catch (error) {
    console.error('Error fetching unit of measures:', error)
    return []
  }
}

export async function createProductCategoryAction(
  name: string
): Promise<{ success: boolean; data?: ProductCategory; error?: string }> {
  try {
    const supabase = await getSupabaseAdminClient()
    const { data, error } = await supabase
      .from('product_categories')
      .insert({ name })
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data: data as ProductCategory }
  } catch (error: any) {
    console.error('Error creating product category:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}

export async function createUnitOfMeasureAction(
  name: string,
  abbreviation: string
): Promise<{ success: boolean; data?: UnitOfMeasure; error?: string }> {
  try {
    const supabase = await getSupabaseAdminClient()
    const { data, error } = await supabase
      .from('unit_of_measures')
      .insert({ name, abbreviation })
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data: data as UnitOfMeasure }
  } catch (error: any) {
    console.error('Error creating unit of measure:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}
