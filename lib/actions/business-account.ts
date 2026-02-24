'use server'

import { getSupabaseClient, getSupabaseAdminClient } from './supabase'
import type {
  BusinessAccount,
  BusinessAccountInsert,
  BusinessAccountUpdate,
} from '@/lib/models/business-account/business-account'
import { getCurrentUser } from '@/lib/services/auth/supabase-auth'
import { USER_ROLES } from '@/const/roles'
import { userRoles } from '../types/enums'

export interface BusinessAccountListResponse {
  data: BusinessAccount[]
  total: number
  total_pages: number
}

export async function fetchBusinessAccountsAction(params?: {
  page?: number
  page_size?: number
  company_name?: string[]
}): Promise<BusinessAccountListResponse> {
  try {
    const page = params?.page || 1
    const pageSize = params?.page_size || 10
    const offset = (page - 1) * pageSize

    // Obtener usuario actual (de NextAuth)
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return { data: [], total: 0, total_pages: 0 }
    }

    // Verificar si el usuario tiene permisos para ver cuentas
    const canViewAccounts = currentUser.role === USER_ROLES.COMPANY_ADMIN ||
      currentUser.role === USER_ROLES.BUSINESS_ADMIN

    if (!canViewAccounts) {
      return { data: [], total: 0, total_pages: 0 }
    }

    const client = await getSupabaseAdminClient() // Usar admin para bypass RLS

    let query = client.from('business_accounts').select('*', { count: 'exact' })

    // Si es business_admin, filtrar solo su cuenta asociada
    if (currentUser.role === USER_ROLES.BUSINESS_ADMIN && currentUser.business_account_id) {
      query = query.eq('id', currentUser.business_account_id)
    }
    // Si es company_admin, puede ver todas las cuentas (sin filtro adicional)

    if (params?.company_name && params.company_name.length > 0) {
      const searchTerm = params.company_name[0]
      query = query.ilike('company_name', `%${searchTerm}%`)
    }

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1)

    const { data, error, count } = await query

    if (error) throw error

    const total = count || 0
    const totalPages = Math.ceil(total / pageSize)

    // Asegurar que los datos son objetos planos serializables
    const plainData = data ? JSON.parse(JSON.stringify(data)) : []

    return {
      data: plainData,
      total,
      total_pages: totalPages,
    }
  } catch (error) {
    console.error('Error fetching business accounts:', error)
    return {
      data: [],
      total: 0,
      total_pages: 0,
    }
  }
}

export async function getBusinessAccountAction(
  id: string
): Promise<BusinessAccount | null> {
  try {
    const client = await getSupabaseAdminClient()
    const { data, error } = await client
      .from('business_accounts')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }
    return data
  } catch (error) {
    console.error('Error fetching business account:', error)
    return null
  }
}

export async function createBusinessAccountAction(
  data: BusinessAccountInsert,
  startTrial: boolean = true
): Promise<{ data: BusinessAccount | null; error: string | null }> {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || currentUser.role !== USER_ROLES.COMPANY_ADMIN) {
      return { data: null, error: 'No tienes permisos para crear cuentas de negocio' }
    }

    const client = await getSupabaseAdminClient()
    const { data: account, error } = await client
      .from('business_accounts')
      .insert(data)
      .select()
      .single()

    if (error) throw error

    if (startTrial && account) {
      const { error: trialError } = await client.rpc('start_trial_for_account', {
        p_business_account_id: account.id,
        p_custom_trial_days: data.custom_trial_days ?? null,
      })

      if (trialError) {
        console.error('Error starting trial for new account:', trialError)
      } else {
        const { data: updatedAccount } = await client
          .from('business_accounts')
          .select()
          .eq('id', account.id)
          .single()

        if (updatedAccount) {
          return { data: updatedAccount, error: null }
        }
      }
    }

    return { data: account, error: null }
  } catch (error: any) {
    return { data: null, error: error.message }
  }
}

export async function updateBusinessAccountAction(
  id: string,
  data: BusinessAccountUpdate
): Promise<{ data: BusinessAccount | null; error: string | null }> {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return { data: null, error: 'Usuario no autenticado' }
    }

    // Si es business_admin, solo puede actualizar datos de contacto
    if (currentUser.role === USER_ROLES.BUSINESS_ADMIN) {
      // Validar que solo se estén actualizando campos de contacto
      const allowedFields = ['contact_name', 'contact_email', 'contact_phone']
      const attemptedFields = Object.keys(data)
      const unauthorizedFields = attemptedFields.filter(
        field => !allowedFields.includes(field)
      )

      if (unauthorizedFields.length > 0) {
        return {
          data: null,
          error: 'Solo puedes actualizar la información de contacto (nombre, email, teléfono)'
        }
      }

      // Filtrar solo los campos permitidos
      const filteredData: BusinessAccountUpdate = {}
      if (data.contact_name !== undefined) filteredData.contact_name = data.contact_name
      if (data.contact_email !== undefined) filteredData.contact_email = data.contact_email
      if (data.contact_phone !== undefined) filteredData.contact_phone = data.contact_phone

      const client = await getSupabaseClient()
      const { data: account, error } = await client
        .from('business_accounts')
        .update(filteredData)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return { data: account, error: null }
    }

    // Si es company_admin, puede actualizar todo
    if (currentUser.role === USER_ROLES.COMPANY_ADMIN) {
      const client = await getSupabaseClient()
      const { data: account, error } = await client
        .from('business_accounts')
        .update(data)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return { data: account, error: null }
    }

    return { data: null, error: 'No tienes permisos para editar cuentas de negocio' }
  } catch (error: any) {
    return { data: null, error: error.message }
  }
}

export async function deleteBusinessAccountAction(
  id: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || currentUser.role !== USER_ROLES.COMPANY_ADMIN) {
      return { success: false, error: 'No tienes permisos para eliminar cuentas de negocio' }
    }

    const client = await getSupabaseAdminClient()

    // 0. Obtener todos los usuarios asociados a esta cuenta buscando sus metadatos
    const { data: usersData, error: usersError } = await client.auth.admin.listUsers()

    // Filtramos los que pertenecen a la cuenta
    const userIds = usersData?.users
      ?.filter(u => u.user_metadata?.business_account_id === id)
      ?.map(u => u.id) || []

    // 1. Eliminar todas las sucursales asociadas
    const { error: businessesError } = await client
      .from('businesses')
      .delete()
      .eq('business_account_id', id)

    if (businessesError) {
      console.error('Error deleting businesses:', businessesError)
      throw new Error(`Error al eliminar sucursales: ${businessesError.message}`)
    }

    // 2. Eliminar usuarios de Supabase Auth
    if (userIds.length > 0) {
      for (const userId of userIds) {
        try {
          await client.auth.admin.deleteUser(userId)
        } catch (authError) {
          console.error(`Error deleting auth user ${userId}:`, authError)
          // Continuar con los demás usuarios aunque uno falle
        }
      }
    }

    // 3. Finalmente eliminar la cuenta
    const { error: accountError } = await client
      .from('business_accounts')
      .delete()
      .eq('id', id)

    if (accountError) {
      console.error('Error deleting account:', accountError)
      throw new Error(`Error al eliminar cuenta: ${accountError.message}`)
    }

    return { success: true, error: null }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function deleteBusinessAccountsAction(
  ids: string[]
): Promise<{ success: boolean; deletedCount: number; error: string | null }> {
  if (!ids.length) {
    return { success: true, deletedCount: 0, error: null }
  }

  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || currentUser.role !== USER_ROLES.COMPANY_ADMIN) {
      return { success: false, deletedCount: 0, error: 'No tienes permisos para eliminar cuentas de negocio' }
    }

    const client = await getSupabaseAdminClient()

    // 0. Obtener todos los usuarios asociados filtrando por business_account_id
    const { data: usersData } = await client.auth.admin.listUsers()

    const userIds = usersData?.users
      ?.filter(u => ids.includes(u.user_metadata?.business_account_id))
      ?.map(u => u.id) || []

    // 1. Eliminar todas las sucursales asociadas a estas cuentas
    const { error: businessesError } = await client
      .from('businesses')
      .delete()
      .in('business_account_id', ids)

    if (businessesError) {
      console.error('Error deleting businesses:', businessesError)
      throw new Error(`Error al eliminar sucursales: ${businessesError.message}`)
    }

    // 2. Eliminar usuarios de Supabase Auth
    if (userIds.length > 0) {
      for (const userId of userIds) {
        try {
          await client.auth.admin.deleteUser(userId)
        } catch (authError) {
          console.error(`Error deleting auth user ${userId}:`, authError)
        }
      }
    }

    // 3. Finalmente eliminar las cuentas
    const { error: accountsError } = await client
      .from('business_accounts')
      .delete()
      .in('id', ids)

    if (accountsError) {
      console.error('Error deleting accounts:', accountsError)
      throw new Error(`Error al eliminar cuentas: ${accountsError.message}`)
    }

    return { success: true, deletedCount: ids.length, error: null }
  } catch (error: any) {
    return { success: false, deletedCount: 0, error: error.message }
  }
}

export async function getBusinessAccountByIdAction(
  id: string
): Promise<{ data: BusinessAccount | null; error: string | null }> {
  try {
    const client = await getSupabaseClient()
    const { data: account, error } = await client
      .from('business_accounts')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error

    return { data: account, error: null }
  } catch (error: any) {
    return { data: null, error: error.message }
  }
}

export async function getUserBusinessAccountsAction(
  userId: string
): Promise<{ data: BusinessAccount[] | null; error: string | null }> {
  try {
    const client = await getSupabaseClient()
    const { data: accounts, error } = await client.rpc(
      'get_user_business_accounts',
      { user_uuid: userId }
    )

    if (error) throw error

    return { data: accounts || [], error: null }
  } catch (error: any) {
    return { data: null, error: error.message }
  }
}



export async function isAccountAdminAction(
  userId: string,
  accountId: string
): Promise<{ isAdmin: boolean; error: string | null }> {
  try {
    const client = await getSupabaseClient()
    const { data, error } = await client.rpc('is_account_admin', {
      user_uuid: userId,
      account_uuid: accountId,
    })

    if (error) throw error

    return { isAdmin: data || false, error: null }
  } catch (error: any) {
    return { isAdmin: false, error: error.message }
  }
}

export async function canCreateBusinessInAccountAction(
  accountId: string
): Promise<{ canCreate: boolean; error: string | null }> {
  try {
    const client = await getSupabaseClient()
    const { data, error } = await client.rpc('can_create_business_in_account', {
      account_uuid: accountId,
    })

    if (error) throw error

    return { canCreate: data || false, error: null }
  } catch (error: any) {
    return { canCreate: false, error: error.message }
  }
}

export async function findUserProfileByEmailAction(
  email: string
): Promise<{
  data: { id: string; email: string; full_name: string | null } | null
  error: string | null
}> {
  try {
    const client = await getSupabaseAdminClient()

    // Buscar en auth users
    const { data: { users }, error } = await client.auth.admin.listUsers()

    if (error) throw error

    const foundUser = users?.find(u => u.email === email)

    if (!foundUser) {
      return { data: null, error: 'Usuario no encontrado con ese email' }
    }

    return {
      data: {
        id: foundUser.id,
        email: foundUser.email || '',
        full_name: foundUser.user_metadata?.full_name || foundUser.user_metadata?.name || null
      },
      error: null
    }
  } catch (error: any) {
    return { data: null, error: error.message }
  }
}

export async function createMemberWithAccountAction(data: {
  name: string
  email: string
  password: string
  role: userRoles
  accountId: string
}): Promise<{ success: boolean; error: string | null }> {
  try {
    const client = await getSupabaseAdminClient()

    // 1. Fetch details from the business_account
    const { data: accountData, error: accountErr } = await client.from('business_accounts').select('*').eq('id', data.accountId).single();
    if (accountErr || !accountData) return { success: false, error: 'Cuenta de negocio no encontrada' }

    // Obtenemos los businesses hijos
    const { data: businessesData } = await client.from('businesses').select('*').eq('business_account_id', data.accountId)
    const firstBusiness = businessesData && businessesData.length > 0 ? businessesData[0] : null

    // 2. Create user directamente (sin función SQL)
    const authUserData = {
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        full_name: data.name,
        name: data.name,
        email_verified: true,
        business_account_id: data.accountId,
        role: data.role,
        business_id: firstBusiness?.id || null,
        businesses: businessesData?.map(b => ({
          id: b.id,
          name: b.name,
          business_account_id: data.accountId
        })) || [],
        tenant_name: accountData.tenant_name || `${data.email.split('@')[1]?.split('.')[0] || 'default'}-${data.accountId.slice(0, 8)}`,
        business_type: firstBusiness?.type || 'TECH',
        subscription_plan: accountData.subscription_plan || 'trial',
      },
      app_metadata: {
        provider: 'email',
        providers: ['email'],
        business_account_id: data.accountId,
        role: data.role,
        business_id: firstBusiness?.id || null,
      }
    }

    const { data: authData, error: authError } =
      await client.auth.admin.createUser(authUserData)

    if (authError || !authData.user) {
      return {
        success: false,
        error: authError?.message || 'Error al crear usuario en Auth',
      }
    }

    return { success: true, error: null }
  } catch (error: any) {
    console.error('Error creating member with account:', error)
    return { success: false, error: error.message }
  }
}
