'use server'

import {
  getSupabaseAdminClient,
  insertRecord,
  updateRecord,
  deleteRecord,
} from '@/lib/actions/supabase'
import {
  requireAccountAccess,
  resolveAccountScope,
} from '@/lib/auth/tenant-guard'
import type { CustomerCategory } from '@/lib/models/customer/business-customer'

export async function fetchCustomerCategoriesAction(
  businessAccountId: string
): Promise<{ success: boolean; data?: CustomerCategory[]; error?: string }> {
  try {
    // AC-3: la cuenta efectiva se deriva de la sesión (fail-closed)
    const { businessAccountId: accountId } =
      await requireAccountAccess(businessAccountId)

    const supabase = await getSupabaseAdminClient()

    const { data, error } = await supabase
      .from('customer_categories')
      .select('*')
      .eq('business_account_id', accountId)
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
    // AC-3: la cuenta efectiva se deriva de la sesión (fail-closed)
    const { businessAccountId: accountId } =
      await requireAccountAccess(businessAccountId)

    const supabase = await getSupabaseAdminClient()

    const { data: category, error } = await supabase
      .from('customer_categories')
      .insert({
        business_account_id: accountId,
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
    // AC-3: la categoría debe pertenecer a la cuenta de la sesión
    // (alcance null solo para company_admin, único rol cross-tenant)
    const { businessAccountId } = await resolveAccountScope()

    const supabase = await getSupabaseAdminClient()
    let ownershipQuery = supabase
      .from('customer_categories')
      .select('id')
      .eq('id', id)
    if (businessAccountId) {
      ownershipQuery = ownershipQuery.eq('business_account_id', businessAccountId)
    }
    const { data: existing } = await ownershipQuery.maybeSingle()

    if (!existing) {
      return { success: false, error: 'Categoría no encontrada' }
    }

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
    // AC-3: la categoría debe pertenecer a la cuenta de la sesión
    // (alcance null solo para company_admin, único rol cross-tenant)
    const { businessAccountId } = await resolveAccountScope()

    const supabase = await getSupabaseAdminClient()
    let ownershipQuery = supabase
      .from('customer_categories')
      .select('id')
      .eq('id', id)
    if (businessAccountId) {
      ownershipQuery = ownershipQuery.eq('business_account_id', businessAccountId)
    }
    const { data: existing } = await ownershipQuery.maybeSingle()

    if (!existing) {
      return { success: false, error: 'Categoría no encontrada' }
    }

    await deleteRecord('customer_categories', id)
    return { success: true }
  } catch (error: any) {
    console.error('Error deleting customer category:', error)
    return { success: false, error: error.message || 'Error al eliminar categoría' }
  }
}