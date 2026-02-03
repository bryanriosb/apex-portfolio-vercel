'use server'

import {
  getSupabaseAdminClient,
  insertRecord,
  updateRecord,
  deleteRecord,
} from '@/lib/actions/supabase'
import type { CustomerCategory } from '@/lib/models/customer/business-customer'

export async function fetchCustomerCategoriesAction(
  businessAccountId: string
): Promise<{ success: boolean; data?: CustomerCategory[]; error?: string }> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { data, error } = await supabase
      .from('customer_categories')
      .select('*')
      .eq('business_account_id', businessAccountId)
      .order('name', { ascending: true })

    if (error) throw error

    return { success: true, data: data || [] }
  } catch (error: any) {
    console.error('Error fetching customer categories:', error)
    return { success: false, error: error.message || 'Error al obtener categorías' }
  }
}

export async function createCustomerCategoryAction(
  businessAccountId: string,
  data: { name: string; description?: string | null }
): Promise<{ success: boolean; data?: CustomerCategory; error?: string }> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { data: category, error } = await supabase
      .from('customer_categories')
      .insert({
        business_account_id: businessAccountId,
        name: data.name.trim(),
        description: data.description?.trim() || null,
      })
      .select('*')
      .single()

    if (error) throw error

    return { success: true, data: category }
  } catch (error: any) {
    console.error('Error creating customer category:', error)
    return { success: false, error: error.message || 'Error al crear categoría' }
  }
}

export async function updateCustomerCategoryAction(
  id: string,
  data: { name?: string; description?: string | null }
): Promise<{ success: boolean; data?: CustomerCategory; error?: string }> {
  try {
    const category = await updateRecord<CustomerCategory>('customer_categories', id, data)

    if (!category) {
      return { success: false, error: 'Error al actualizar la categoría' }
    }

    return { success: true, data: category }
  } catch (error: any) {
    console.error('Error updating customer category:', error)
    return { success: false, error: error.message || 'Error al actualizar categoría' }
  }
}

export async function deleteCustomerCategoryAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await deleteRecord('customer_categories', id)
    return { success: true }
  } catch (error: any) {
    console.error('Error deleting customer category:', error)
    return { success: false, error: error.message || 'Error al eliminar categoría' }
  }
}