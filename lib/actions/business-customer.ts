'use server'

import {
  getRecordById,
  insertRecord,
  getSupabaseAdminClient,
} from '@/lib/actions/supabase'
import {
  createCustomerAuthUser,
} from '@/lib/actions/customer-auth'
import type {
  BusinessCustomer,
  BusinessCustomerInsert,
  BusinessCustomerUpdate,
  CreateCustomerInput,
} from '@/lib/models/customer/business-customer'
import {
  requireAccountAccess,
  requireBusinessAccess,
  requireUser,
} from '@/lib/auth/tenant-guard'

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
    await requireBusinessAccess(params?.business_id)

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
    await requireUser()

    const customer = await getRecordById<BusinessCustomer>(
      'business_customers',
      id
    )

    if (!customer) return null

    // Autorización por pertenencia: el cliente debe ser de una sucursal
    // accesible desde la sesión (el ID llega del cliente y no es confiable)
    await requireBusinessAccess(customer.business_id)

    return customer
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
    await requireBusinessAccess(businessId)

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
    await requireBusinessAccess(data.business_id)

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
    await requireUser()

    // El lote puede mezclar sucursales: se valida acceso a cada una
    for (const businessId of new Set(inputs.map((input) => input.business_id))) {
      await requireBusinessAccess(businessId)
    }

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
        // Deduplicar emails del input (case-insensitive)
        if (input.emails && input.emails.length > 0) {
          const emailSet = new Set<string>()
          input.emails = input.emails.filter(email => {
            const lowerEmail = email.toLowerCase()
            if (emailSet.has(lowerEmail)) {
              return false
            }
            emailSet.add(lowerEmail)
            return true
          })
        }
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
  authCreated?: boolean
}> {
  const supabase = await getSupabaseAdminClient()
  
  let userId: string | null = null
  let isNewUser = false
  let generatedPassword: string | null = null

  try {
    await requireBusinessAccess(input.business_id)

    // Verificar si ya existe el cliente
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

    // 1. Crear el business_customer primero (sin user_id aún)
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

    if (customerError || !businessCustomer) {
      throw customerError || new Error('Error al crear el cliente')
    }

    // 2. Si se solicita crear cuenta de usuario y hay email
    if (input.create_user_account && input.emails && input.emails.length > 0) {
      const primaryEmail = input.emails[0]
      
      const authResult = await createCustomerAuthUser({
        email: primaryEmail,
        password: input.password,
        fullName: input.full_name || '',
        businessId: input.business_id,
        businessCustomerId: businessCustomer.id,
        phone: input.phone,
        generatePassword: !input.password,
      })
      
      if (authResult.success && authResult.userId) {
        userId = authResult.userId
        isNewUser = authResult.isNewUser || false
        generatedPassword = authResult.generatedPassword || input.password || null
        
        // 3. Actualizar el business_customer con el user_id
        const { error: updateError } = await supabase
          .from('business_customers')
          .update({ user_id: userId })
          .eq('id', businessCustomer.id)
        
        if (updateError) {
          console.warn('[createFullCustomer] Error actualizando user_id:', updateError.message)
        }
        
        // Enviar email de bienvenida si se solicitó y es usuario nuevo
        if (input.send_welcome_email && isNewUser && generatedPassword) {
          const { sendCustomerWelcomeEmail } = await import('./customer-auth')
          await sendCustomerWelcomeEmail({
            email: primaryEmail,
            fullName: input.full_name || '',
            password: generatedPassword,
            businessName: input.company_name || undefined,
          })
        }
      } else if (!authResult.success) {
        // Si falla la creación del usuario, loguear pero continuar sin cuenta
        console.warn('[createFullCustomer] No se pudo crear cuenta de usuario:', authResult.error)
      }
    }

    // 4. Obtener el customer actualizado
    const { data: updatedCustomer } = await supabase
      .from('business_customers')
      .select('*')
      .eq('id', businessCustomer.id)
      .single()

    return {
      success: true,
      data: updatedCustomer || businessCustomer,
      isNew: true,
      authCreated: !!userId,
    }
  } catch (error: any) {
    // Rollback en caso de error
    if (userId && isNewUser) {
      await supabase.auth.admin.deleteUser(userId)
    }
    
    console.error('Error in createFullCustomer:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}

export async function updateBusinessCustomerAction(
  id: string,
  data: BusinessCustomerUpdate
): Promise<{ success: boolean; data?: BusinessCustomer; error?: string }> {
  try {
    await requireUser()

    const supabase = await getSupabaseAdminClient()

    // 1. Obtener el customer actual para verificar si tiene user_id
    const { data: existingCustomer, error: fetchError } = await supabase
      .from('business_customers')
      .select('id, user_id, emails, business_id')
      .eq('id', id)
      .single()

    if (fetchError || !existingCustomer) {
      return { success: false, error: 'Cliente no encontrado' }
    }

    // Autorización por pertenencia: solo sucursales accesibles desde la sesión
    await requireBusinessAccess(existingCustomer.business_id)

    // 2. Actualizar el business_customer
    const { data: customer, error: updateError } = await supabase
      .from('business_customers')
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (updateError || !customer) {
      return { success: false, error: updateError?.message || 'Error al actualizar el cliente' }
    }
    
    // 3. Si tiene usuario auth, sincronizar datos
    if (existingCustomer.user_id) {
      const { updateCustomerAuthUser } = await import('./customer-auth')
      
      const primaryEmail = data.emails?.[0] || existingCustomer.emails?.[0]
      
      await updateCustomerAuthUser({
        userId: existingCustomer.user_id,
        email: primaryEmail,
        fullName: data.full_name ?? undefined,
        phone: data.phone,
        businessCustomerId: id,
      })
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
    await requireUser()

    const supabase = await getSupabaseAdminClient()

    // 1. Obtener el customer para verificar si tiene user_id
    const { data: customer, error: fetchError } = await supabase
      .from('business_customers')
      .select('user_id, business_id')
      .eq('id', id)
      .single()

    if (fetchError) {
      console.error('Error fetching customer for deletion:', fetchError)
      return { success: false, error: 'Error al obtener el cliente' }
    }

    // Autorización por pertenencia: solo sucursales accesibles desde la sesión
    await requireBusinessAccess(customer?.business_id)

    // 2. Eliminar el registro de business_customers
    const { error: deleteError } = await supabase
      .from('business_customers')
      .delete()
      .eq('id', id)
    
    if (deleteError) {
      console.error('Error deleting business customer:', deleteError)
      return { success: false, error: deleteError.message || 'Error al eliminar el cliente' }
    }
    
    // 3. Si tenía usuario auth, eliminarlo también
    if (customer?.user_id) {
      const { deleteCustomerAuthUser } = await import('./customer-auth')
      const authResult = await deleteCustomerAuthUser(customer.user_id)
      
      if (!authResult.success) {
        console.warn(`[deleteBusinessCustomer] Cliente eliminado pero falló la eliminación del usuario auth: ${authResult.error}`)
        // No retornamos error porque el customer ya fue eliminado
      }
    }
    
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
    await requireBusinessAccess(businessId)

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
    await requireBusinessAccess(businessId)

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
    await requireAccountAccess(businessAccountId)

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
    await requireUser()

    const supabase = await getSupabaseAdminClient()

    // 1. Obtener los customers para verificar user_ids
    const { data: customers, error: fetchError } = await supabase
      .from('business_customers')
      .select('id, user_id, business_id')
      .in('id', ids)

    if (fetchError) {
      console.error('Error fetching customers for batch deletion:', fetchError)
      return { success: false, deletedCount: 0, error: 'Error al obtener los clientes' }
    }

    // Autorización por pertenencia: cada sucursal del lote debe ser
    // accesible desde la sesión antes de borrar nada (fail-closed)
    for (const businessId of new Set(
      (customers ?? []).map((customer) => customer.business_id)
    )) {
      await requireBusinessAccess(businessId)
    }

    // 2. Eliminar los registros de business_customers
    const { error: deleteError } = await supabase
      .from('business_customers')
      .delete()
      .in('id', ids)

    if (deleteError) {
      console.error('Error batch deleting business customers:', deleteError)
      return { success: false, deletedCount: 0, error: deleteError.message }
    }
    
    // 3. Eliminar los usuarios auth asociados
    const userIds = customers
      ?.filter(c => c.user_id)
      .map(c => c.user_id) || []
    
    if (userIds.length > 0) {
      const { deleteCustomerAuthUser } = await import('./customer-auth')
      
      for (const userId of userIds) {
        if (userId) {
          try {
            await deleteCustomerAuthUser(userId)
          } catch (authError) {
            console.warn(`[deleteBusinessCustomers] Error eliminando usuario auth ${userId}:`, authError)
            // Continuar con los demás usuarios
          }
        }
      }
    }

    return { success: true, deletedCount: ids.length }
  } catch (error: any) {
    console.error('Error batch deleting business customers:', error)
    return { success: false, deletedCount: 0, error: error.message }
  }
}

export async function getCustomerCountAction(businessId: string): Promise<number> {
  try {
    await requireBusinessAccess(businessId)

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
