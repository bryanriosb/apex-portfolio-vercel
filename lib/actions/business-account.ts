'use server'

import { getSupabaseClient, getSupabaseAdminClient } from './supabase'
import type {
  BusinessAccount,
  BusinessAccountInsert,
  BusinessAccountUpdate,
} from '@/lib/models/business-account/business-account'
import type {
  BusinessAccountMember,
  BusinessAccountMemberInsert,
  BusinessAccountMemberUpdate,
} from '@/lib/models/business-account/business-account-member'
import { userRoles } from '../types/enums'
import { getCurrentUser } from '@/lib/services/auth/supabase-auth'
import { USER_ROLES } from '@/const/roles'

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

    // 0. Obtener todos los miembros antes de eliminar para eliminar sus usuarios de auth
    const { data: members } = await client
      .from('business_account_members')
      .select('user_profile_id, users_profile!inner(user_id)')
      .eq('business_account_id', id)

    const userIds = members?.map((m: any) => m.users_profile.user_id).filter(Boolean) || []

    // 1. Eliminar todas las sucursales asociadas
    const { error: businessesError } = await client
      .from('businesses')
      .delete()
      .eq('business_account_id', id)

    if (businessesError) {
      console.error('Error deleting businesses:', businessesError)
      throw new Error(`Error al eliminar sucursales: ${businessesError.message}`)
    }

    // 2. Eliminar todos los miembros de la cuenta
    const { error: membersError } = await client
      .from('business_account_members')
      .delete()
      .eq('business_account_id', id)

    if (membersError) {
      console.error('Error deleting members:', membersError)
      throw new Error(`Error al eliminar miembros: ${membersError.message}`)
    }

    // 3. Eliminar users_profile de los miembros
    if (members && members.length > 0) {
      const profileIds = members.map((m: any) => m.user_profile_id).filter(Boolean)
      if (profileIds.length > 0) {
        const { error: profilesError } = await client
          .from('users_profile')
          .delete()
          .in('id', profileIds)

        if (profilesError) {
          console.error('Error deleting user profiles:', profilesError)
          throw new Error(`Error al eliminar perfiles de usuario: ${profilesError.message}`)
        }
      }
    }

    // 4. Eliminar usuarios de Supabase Auth
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

    // 5. Finalmente eliminar la cuenta
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

    // 0. Obtener todos los miembros antes de eliminar para eliminar sus usuarios de auth
    const { data: members } = await client
      .from('business_account_members')
      .select('user_profile_id, users_profile!inner(user_id)')
      .in('business_account_id', ids)

    const userIds = members?.map((m: any) => m.users_profile.user_id).filter(Boolean) || []

    // 1. Eliminar todas las sucursales asociadas a estas cuentas
    const { error: businessesError } = await client
      .from('businesses')
      .delete()
      .in('business_account_id', ids)

    if (businessesError) {
      console.error('Error deleting businesses:', businessesError)
      throw new Error(`Error al eliminar sucursales: ${businessesError.message}`)
    }

    // 2. Eliminar todos los miembros de estas cuentas
    const { error: membersError } = await client
      .from('business_account_members')
      .delete()
      .in('business_account_id', ids)

    if (membersError) {
      console.error('Error deleting members:', membersError)
      throw new Error(`Error al eliminar miembros: ${membersError.message}`)
    }

    // 3. Eliminar users_profile de los miembros
    if (members && members.length > 0) {
      const profileIds = members.map((m: any) => m.user_profile_id).filter(Boolean)
      if (profileIds.length > 0) {
        const { error: profilesError } = await client
          .from('users_profile')
          .delete()
          .in('id', profileIds)

        if (profilesError) {
          console.error('Error deleting user profiles:', profilesError)
          throw new Error(`Error al eliminar perfiles de usuario: ${profilesError.message}`)
        }
      }
    }

    // 4. Eliminar usuarios de Supabase Auth
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

    // 5. Finalmente eliminar las cuentas
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

export async function addAccountMemberAction(
  data: BusinessAccountMemberInsert
): Promise<{ data: BusinessAccountMember | null; error: string | null }> {
  try {
    // Usar cliente admin para bypass RLS al agregar miembros
    // La validación de permisos se hace a nivel de aplicación
    const client = await getSupabaseAdminClient()
    const { data: member, error } = await client
      .from('business_account_members')
      .insert(data)
      .select()
      .single()

    if (error) throw error

    return { data: member, error: null }
  } catch (error: any) {
    return { data: null, error: error.message }
  }
}

export async function updateAccountMemberAction(
  id: string,
  data: BusinessAccountMemberUpdate
): Promise<{ data: BusinessAccountMember | null; error: string | null }> {
  try {
    const client = await getSupabaseClient()
    const { data: member, error } = await client
      .from('business_account_members')
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return { data: member, error: null }
  } catch (error: any) {
    return { data: null, error: error.message }
  }
}

export async function removeAccountMemberAction(
  id: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return { success: false, error: 'Usuario no autenticado' }
    }

    const client = await getSupabaseAdminClient()

    // Obtener información del miembro a eliminar
    const { data: memberToDelete, error: memberError } = await client
      .from('business_account_members')
      .select('role, business_account_id')
      .eq('id', id)
      .single()

    if (memberError || !memberToDelete) {
      return { success: false, error: 'Miembro no encontrado' }
    }

    // Contar cuántos administradores/owners hay en la cuenta
    const { data: admins, error: adminError } = await client
      .from('business_account_members')
      .select('id, role')
      .eq('business_account_id', memberToDelete.business_account_id)
      .in('role', ['owner', 'admin'])
      .eq('status', 'active')

    if (adminError) throw adminError

    const adminCount = admins?.length || 0
    const isLastAdmin = adminCount === 1 && (memberToDelete.role === 'owner' || memberToDelete.role === 'admin')

    // Si es el último administrador
    if (isLastAdmin) {
      // Solo company_admin puede eliminar al último administrador
      if (currentUser.role !== USER_ROLES.COMPANY_ADMIN) {
        return {
          success: false,
          error: 'No puedes eliminar al único administrador de la cuenta. Debe haber al menos un administrador.'
        }
      }
    }

    // Si es business_admin intentando eliminar un admin (y hay más de uno)
    if (currentUser.role === USER_ROLES.BUSINESS_ADMIN &&
        (memberToDelete.role === 'owner' || memberToDelete.role === 'admin')) {
      // Verificar que no sea el último admin
      if (adminCount <= 1) {
        return {
          success: false,
          error: 'No puedes eliminar al único administrador de la cuenta.'
        }
      }
    }

    // Proceder con la eliminación
    const { error: deleteError } = await client
      .from('business_account_members')
      .delete()
      .eq('id', id)

    if (deleteError) throw deleteError

    return { success: true, error: null }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getAccountMembersAction(
  accountId: string
): Promise<{ data: any[] | null; error: string | null }> {
  try {
    const client = await getSupabaseAdminClient()

    // Get members with user_profile info
    const { data: members, error } = await client
      .from('business_account_members')
      .select(
        `
        *,
        users_profile:user_profile_id (
          id,
          user_id,
          role
        )
      `
      )
      .eq('business_account_id', accountId)
      .order('created_at', { ascending: false })

    if (error) throw error

    if (!members || members.length === 0) {
      return { data: [], error: null }
    }

    // Get auth user data for each member
    const membersWithAuthData = await Promise.all(
      members.map(async (member: any) => {
        if (!member.users_profile?.user_id) {
          return member
        }

        const { data: authUser } = await client.auth.admin.getUserById(
          member.users_profile.user_id
        )

        return {
          ...member,
          users_profile: {
            ...member.users_profile,
            full_name: authUser.user?.user_metadata?.full_name ||
                       authUser.user?.user_metadata?.name ||
                       'Sin nombre',
            email: authUser.user?.email || 'Sin email',
          },
        }
      })
    )

    return { data: membersWithAuthData, error: null }
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
    const client = await getSupabaseClient()

    // Buscar en users_profile por email
    const { data: profile, error } = await client
      .from('users_profile')
      .select('id, email, full_name')
      .eq('email', email)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return { data: null, error: 'Usuario no encontrado con ese email' }
      }
      throw error
    }

    return { data: profile, error: null }
  } catch (error: any) {
    return { data: null, error: error.message }
  }
}

export async function updateTutorialStartedAction(
  businessAccountId: string,
  tutorialStarted: boolean = true
): Promise<{ success: boolean; error: string | null }> {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return { success: false, error: 'Usuario no autenticado' }
    }

    const client = await getSupabaseClient()
    
    const { data: account, error } = await client
      .from('business_accounts')
      .update({ tutorial_started: tutorialStarted })
      .eq('id', businessAccountId)
      .select('id, tutorial_started')
      .single()

    if (error) throw error

    return { success: true, error: null }
  } catch (error: any) {
    console.error('Error updating tutorial_started:', error)
    return { success: false, error: error.message }
  }
}

export async function createMemberWithAccountAction(data: {
  name: string
  email: string
  password: string
  role: userRoles // Rol del sistema (business_monitor, business_admin)
  accountId: string
}): Promise<{ success: boolean; error: string | null }> {
  try {
    const client = await getSupabaseAdminClient()

    // 1. Create user in Supabase Auth
    const { data: authData, error: authError } =
      await client.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          full_name: data.name,
          name: data.name,
        },
      })

    if (authError || !authData.user) {
      return {
        success: false,
        error: authError?.message || 'Error al crear usuario en Auth',
      }
    }

    // 2. Create users_profile
    const { data: profileData, error: profileError } = await client
      .from('users_profile')
      .insert({
        user_id: authData.user.id,
        role: data.role, // Rol del sistema (business_monitor o business_admin)
      })
      .select()
      .single()

    if (profileError || !profileData) {
      // If profile creation fails, delete the auth user to maintain consistency
      await client.auth.admin.deleteUser(authData.user.id)
      return {
        success: false,
        error: profileError?.message || 'Error al crear perfil de usuario',
      }
    }

    // 3. Create business_account_member
    // El rol en la cuenta es 'admin' si es business_admin, sino 'member'
    const accountMemberRole = data.role === 'business_admin' ? 'admin' : 'member'

    const { error: memberError } = await client
      .from('business_account_members')
      .insert({
        business_account_id: data.accountId,
        user_profile_id: profileData.id,
        role: accountMemberRole, // 'admin' o 'member'
        status: 'active',
      })

    if (memberError) {
      // If member creation fails, delete both profile and auth user
      await client.from('users_profile').delete().eq('id', profileData.id)
      await client.auth.admin.deleteUser(authData.user.id)
      return {
        success: false,
        error: memberError.message || 'Error al agregar miembro a la cuenta',
      }
    }

    return { success: true, error: null }
  } catch (error: any) {
    console.error('Error creating member with account:', error)
    return { success: false, error: error.message }
  }
}
