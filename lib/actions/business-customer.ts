'use server'

import {
  getRecordById,
  insertRecord,
  updateRecord,
  deleteRecord,
  getSupabaseAdminClient,
} from '@/lib/actions/supabase'
import type {
  BusinessCustomer,
  BusinessCustomerInsert,
  BusinessCustomerUpdate,
  CreateCustomerInput,
} from '@/lib/models/customer/business-customer'

export interface BusinessCustomerListResponse {
  data: BusinessCustomer[]
  total: number
  total_pages: number
}

export async function fetchBusinessCustomersAction(params?: {
  page?: number
  page_size?: number
  business_id?: string
  search?: string
  status?: string
  category?: string
}): Promise<BusinessCustomerListResponse> {
  try {
    if (!params?.business_id) {
      return { data: [], total: 0, total_pages: 0 }
    }

    const supabase = await getSupabaseAdminClient()

    let query = supabase
      .from('business_customers')
      .select(`*,category_name:customer_categories(name)`, {
        count: 'exact',
      })
      .eq('business_id', params.business_id)
      .order('full_name', { ascending: true })

    if (params.status) {
      query = query.eq('status', params.status)
    }

    if (params.category) {
      query = query.eq('category', params.category)
    }

    if (params.search) {
      const searchTerm = `%${params.search}%`
      query = query.or(
        `full_name.ilike.${searchTerm},company_name.ilike.${searchTerm},phone.ilike.${searchTerm},nit.ilike.${searchTerm}`
      )
    }

    const page = params.page || 1
    const pageSize = params.page_size || 20
    const start = (page - 1) * pageSize
    const end = start + pageSize - 1

    query = query.range(start, end)

    const { data, error, count } = await query

    if (error) throw error

    console.log('data', data)

    return {
      data: data || [],
      total: count || 0,
      total_pages: Math.ceil((count || 0) / pageSize),
    }
  } catch (error) {
    console.error('Error fetching business customers:', error)
    return { data: [], total: 0, total_pages: 0 }
  }
}

export async function getBusinessCustomerByIdAction(
  id: string
): Promise<BusinessCustomer | null> {
  try {
    return await getRecordById<BusinessCustomer>('business_customers', id)
  } catch (error) {
    console.error('Error fetching business customer:', error)
    return null
  }
}

export async function getBusinessCustomerByNitAction(
  businessId: string,
  nit: string
): Promise<BusinessCustomer | null> {
  try {
    const supabase = await getSupabaseAdminClient()
    const { data, error } = await supabase
      .from('business_customers')
      .select('*')
      .eq('business_id', businessId)
      .eq('nit', nit)
      .maybeSingle()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching business customer by NIT:', error)
    return null
  }
}

export async function createBusinessCustomerAction(
  data: BusinessCustomerInsert
): Promise<{ success: boolean; data?: BusinessCustomer; error?: string }> {
  try {
    const customer = await insertRecord<BusinessCustomer>(
      'business_customers',
      {
        ...data,
        status: data.status || 'active',
      }
    )

    if (!customer) {
      return { success: false, error: 'Error al crear el cliente' }
    }

    return { success: true, data: customer }
  } catch (error: any) {
    console.error('Error creating business customer:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}

export async function bulkUpsertFullCustomersAction(
  inputs: CreateCustomerInput[]
): Promise<{
  success: boolean
  data?: any[]
  error?: string
  count?: number
  duplicatesRemoved?: number
}> {
  try {
    const supabase = await getSupabaseAdminClient()

    if (!inputs.length) {
      return { success: true, count: 0, duplicatesRemoved: 0 }
    }

    // Eliminar duplicados dentro del mismo batch basándose en (business_id, nit)
    const seen = new Map<string, CreateCustomerInput>()
    const duplicates: string[] = []
    
    for (const input of inputs) {
      const key = `${input.business_id}:${input.nit}`
      if (seen.has(key)) {
        duplicates.push(input.nit)
      } else {
        seen.set(key, input)
      }
    }

    const uniqueInputs = Array.from(seen.values())
    const duplicatesRemoved = inputs.length - uniqueInputs.length

    if (duplicatesRemoved > 0) {
      console.warn(`[bulkUpsert] Removed ${duplicatesRemoved} duplicates from batch: ${duplicates.join(', ')}`)
    }

    const { data, error } = await supabase
      .from('business_customers')
      .upsert(
        uniqueInputs.map((input) => ({
          business_id: input.business_id,
          company_name: input.company_name || null,
          nit: input.nit,
          full_name: input.full_name,
          emails: input.emails ?? [],
          phone: input.phone || null,
          status: input.status || 'active',
          category: input.category || null,
          notes: input.notes || null,
          preferences: input.preferences || null,
          tags: input.tags || null,
        })),
        {
          onConflict: 'business_id,nit',
          ignoreDuplicates: false,
        }
      )
      .select('id')

    if (error) throw error

    return {
      success: true,
      count: data?.length || 0,
      duplicatesRemoved,
    }
  } catch (error: any) {
    console.error('Error in bulkUpsertFullCustomersAction:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}

export async function createFullCustomerAction(
  input: CreateCustomerInput
): Promise<{
  success: boolean
  data?: BusinessCustomer
  error?: string
  isNew?: boolean
}> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { data: existingCustomer } = await supabase
      .from('business_customers')
      .select('*')
      .eq('business_id', input.business_id)
      .eq('nit', input.nit)
      .maybeSingle()

    if (existingCustomer) {
      return {
        success: true,
        data: existingCustomer,
        isNew: false,
      }
    }

    const { data: businessCustomer, error: customerError } = await supabase
      .from('business_customers')
      .insert({
        business_id: input.business_id,
        company_name: input.company_name || null,
        nit: input.nit,
        full_name: input.full_name,
        emails: input.emails ?? [],
        phone: input.phone || null,
        status: input.status || 'active',
        category: input.category || null,
        notes: input.notes || null,
        preferences: input.preferences || null,
        tags: input.tags || null,
      })
      .select('*')
      .single()

    if (customerError) throw customerError

    return {
      success: true,
      data: businessCustomer,
      isNew: true,
    }
  } catch (error: any) {
    console.error('Error in createFullCustomer:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}

export async function updateBusinessCustomerAction(
  id: string,
  data: BusinessCustomerUpdate
): Promise<{ success: boolean; data?: BusinessCustomer; error?: string }> {
  try {
    const customer = await updateRecord<BusinessCustomer>(
      'business_customers',
      id,
      data
    )

    if (!customer) {
      return { success: false, error: 'Error al actualizar el cliente' }
    }

    return { success: true, data: customer }
  } catch (error: any) {
    console.error('Error updating business customer:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}

export async function deleteBusinessCustomerAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await deleteRecord('business_customers', id)
    return { success: true }
  } catch (error: any) {
    console.error('Error deleting business customer:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}

export async function searchBusinessCustomersAction(
  businessId: string,
  query: string,
  limit: number = 10
): Promise<BusinessCustomer[]> {
  try {
    const supabase = await getSupabaseAdminClient()
    const searchTerm = `%${query}%`

    const { data, error } = await supabase
      .from('business_customers')
      .select('*')
      .eq('business_id', businessId)
      .or(
        `full_name.ilike.${searchTerm},company_name.ilike.${searchTerm},phone.ilike.${searchTerm},nit.ilike.${searchTerm}`
      )
      .order('full_name', { ascending: true })
      .limit(limit)

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('Error searching business customers:', error)
    return []
  }
}

export async function getRecentBusinessCustomersAction(
  businessId: string,
  limit: number = 10
): Promise<BusinessCustomer[]> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { data, error } = await supabase
      .from('business_customers')
      .select('*')
      .eq('business_id', businessId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('Error fetching recent business customers:', error)
    return []
  }
}

export async function fetchCustomerCategoriesAction(
  businessAccountId: string
): Promise<{ success: boolean; data?: any[]; error?: string }> {
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
    return { success: false, error: error.message }
  }
}

export async function deleteBusinessCustomersAction(
  ids: string[]
): Promise<{ success: boolean; deletedCount: number; error?: string }> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { error } = await supabase
      .from('business_customers')
      .delete()
      .in('id', ids)

    if (error) throw error

    return { success: true, deletedCount: ids.length }
  } catch (error: any) {
    console.error('Error batch deleting business customers:', error)
    return { success: false, deletedCount: 0, error: error.message }
  }
}

export async function getCustomerCountAction(businessId: string): Promise<number> {
  try {
    const supabase = await getSupabaseAdminClient()
    const { count } = await supabase
      .from('business_customers')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId)
    return count ?? 0
  } catch (error) {
    console.error('Error counting business customers:', error)
    return 0
  }
}
