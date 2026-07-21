'use server'

import { getSupabaseAdminClient } from '@/lib/actions/supabase'
import { USER_ROLES, type UserRole } from '@/const/roles'
import {
  requireRole,
  requireAccountAccess,
  resolveAccountScope,
} from '@/lib/auth/tenant-guard'
import type { User } from '@supabase/supabase-js'
import type {
  AccountUser,
  AccountUserInsert,
  AccountUserUpdate,
  AccountUserListResponse,
  AccountUserBusiness,
} from '@/lib/models/account-user/account-user'

/**
 * Roles gestionables desde el CRUD de usuarios. `customer` se excluye:
 * los clientes tienen su propio flujo.
 */
const MANAGED_ROLES: UserRole[] = [
  USER_ROLES.COMPANY_ADMIN,
  USER_ROLES.BUSINESS_ADMIN,
  USER_ROLES.PROFESSIONAL,
  USER_ROLES.EMPLOYEE,
]

function metadataOf(u: User): Record<string, any> {
  return { ...(u.app_metadata ?? {}), ...(u.user_metadata ?? {}) }
}

function toAccountUser(
  u: User,
  accountNames: Map<string, string>
): AccountUser {
  const meta = metadataOf(u)
  const businesses: AccountUserBusiness[] = Array.isArray(meta.businesses)
    ? meta.businesses
    : []
  return {
    id: u.id,
    email: u.email ?? '',
    name: meta.full_name || meta.name || null,
    phone: u.phone || null,
    role: meta.role || null,
    business_account_id: meta.business_account_id || null,
    business_account_name: meta.business_account_id
      ? (accountNames.get(meta.business_account_id) ?? null)
      : null,
    business_id: meta.business_id || null,
    businesses,
    // Legacy sin flag: se asume acceso total si tiene más de una sucursal
    all_businesses: meta.all_businesses ?? businesses.length !== 1,
    email_confirmed_at: u.email_confirmed_at ?? null,
    last_sign_in_at: u.last_sign_in_at ?? null,
    created_at: u.created_at,
    updated_at: u.updated_at ?? null,
  }
}

/**
 * Lista los usuarios de auth.users con rol de aplicación (no customers).
 * company_admin ve todos; el resto solo los de su cuenta.
 */
export async function fetchAccountUsersAction(params?: {
  page?: number
  page_size?: number
  search?: string
  role?: string | string[]
  business_account_id?: string
}): Promise<AccountUserListResponse> {
  try {
    await requireRole(USER_ROLES.COMPANY_ADMIN, USER_ROLES.BUSINESS_ADMIN)
    const { businessAccountId } = await resolveAccountScope(
      params?.business_account_id
    )

    const client = await getSupabaseAdminClient()
    const [{ data: usersData, error: usersError }, { data: accounts }] =
      await Promise.all([
        client.auth.admin.listUsers({ perPage: 1000 }),
        client.from('business_accounts').select('id, company_name'),
      ])

    if (usersError) throw usersError

    const accountNames = new Map<string, string>(
      (accounts ?? []).map((a) => [a.id, a.company_name])
    )

    let users = (usersData?.users ?? []).filter((u) => {
      const meta = metadataOf(u)
      if (!MANAGED_ROLES.includes(meta.role)) return false
      if (businessAccountId && meta.business_account_id !== businessAccountId)
        return false
      return true
    })

    const roleFilter = params?.role
      ? Array.isArray(params.role)
        ? params.role
        : [params.role]
      : null
    if (roleFilter && roleFilter.length > 0) {
      users = users.filter((u) => roleFilter.includes(metadataOf(u).role))
    }

    if (params?.search) {
      const term = params.search.toLowerCase()
      users = users.filter((u) => {
        const meta = metadataOf(u)
        const name = (meta.full_name || meta.name || '').toLowerCase()
        return (u.email ?? '').toLowerCase().includes(term) || name.includes(term)
      })
    }

    users.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    const page = params?.page || 1
    const pageSize = params?.page_size || 7
    const start = (page - 1) * pageSize
    const paginated = users.slice(start, start + pageSize)

    return {
      data: paginated.map((u) => toAccountUser(u, accountNames)),
      total: users.length,
      total_pages: Math.ceil(users.length / pageSize),
    }
  } catch (error) {
    console.error('Error fetching account users:', error)
    return { data: [], total: 0, total_pages: 0 }
  }
}

/**
 * Resuelve las sucursales de acceso según el alcance elegido:
 * todas las de la cuenta, o únicamente la indicada.
 */
async function resolveBusinessScope(
  client: Awaited<ReturnType<typeof getSupabaseAdminClient>>,
  accountId: string,
  businessId: string | null,
  allBusinesses: boolean
): Promise<{
  businesses: AccountUserBusiness[]
  primaryBusiness: any | null
  error: string | null
}> {
  const { data: businessesData, error } = await client
    .from('businesses')
    .select('*')
    .eq('business_account_id', accountId)

  if (error) return { businesses: [], primaryBusiness: null, error: error.message }

  const all = businessesData ?? []

  if (!allBusinesses) {
    const target = all.find((b) => b.id === businessId)
    if (!target) {
      return {
        businesses: [],
        primaryBusiness: null,
        error: 'La sucursal seleccionada no pertenece a la cuenta',
      }
    }
    return {
      businesses: [
        {
          id: target.id,
          name: target.name,
          business_account_id: accountId,
          timezone: target.timezone ?? null,
        },
      ],
      primaryBusiness: target,
      error: null,
    }
  }

  return {
    businesses: all.map((b) => ({
      id: b.id,
      name: b.name,
      business_account_id: accountId,
      timezone: b.timezone ?? null,
    })),
    primaryBusiness: all[0] ?? null,
    error: null,
  }
}

/**
 * AC-6: un admin no puede otorgar (ni tocar) un rol superior al suyo.
 * Solo company_admin gestiona company_admins.
 */
function assertRoleGrantable(currentRole: UserRole, targetRole: UserRole | null) {
  if (
    targetRole === USER_ROLES.COMPANY_ADMIN &&
    currentRole !== USER_ROLES.COMPANY_ADMIN
  ) {
    throw new Error('No puedes gestionar usuarios con rol superior al tuyo')
  }
}

export async function createAccountUserAction(
  data: AccountUserInsert
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { user: currentUser } = await requireAccountAccess(
      data.business_account_id
    )
    if (
      currentUser.role !== USER_ROLES.COMPANY_ADMIN &&
      currentUser.role !== USER_ROLES.BUSINESS_ADMIN
    ) {
      return { success: false, error: 'No tienes permisos para crear usuarios' }
    }
    assertRoleGrantable(currentUser.role, data.role)
    if (!MANAGED_ROLES.includes(data.role)) {
      return { success: false, error: 'Rol no válido' }
    }

    const client = await getSupabaseAdminClient()

    const { data: accountData, error: accountErr } = await client
      .from('business_accounts')
      .select('*')
      .eq('id', data.business_account_id)
      .single()
    if (accountErr || !accountData) {
      return { success: false, error: 'Cuenta de negocio no encontrada' }
    }

    const scope = await resolveBusinessScope(
      client,
      data.business_account_id,
      data.business_id,
      data.all_businesses
    )
    if (scope.error) return { success: false, error: scope.error }

    const businessMeta = {
      business_account_id: data.business_account_id,
      role: data.role,
      business_id: scope.primaryBusiness?.id || null,
      businesses: scope.businesses,
      all_businesses: data.all_businesses,
    }

    const { data: authData, error: authError } =
      await client.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
        user_metadata: {
          full_name: data.name,
          name: data.name,
          email_verified: true,
          ...businessMeta,
          tenant_name:
            accountData.tenant_name ||
            `${data.email.split('@')[1]?.split('.')[0] || 'default'}-${data.business_account_id.slice(0, 8)}`,
          business_type: scope.primaryBusiness?.type || 'TECHNOLOGY',
          subscription_plan: accountData.subscription_plan || 'trial',
        },
        app_metadata: {
          provider: 'email',
          providers: ['email'],
          ...businessMeta,
        },
      })

    if (authError || !authData.user) {
      return {
        success: false,
        error: authError?.message || 'Error al crear usuario en Auth',
      }
    }

    return { success: true, error: null }
  } catch (error: any) {
    console.error('Error creating account user:', error)
    return { success: false, error: error.message }
  }
}

export async function updateAccountUserAction(
  userId: string,
  data: AccountUserUpdate
): Promise<{ success: boolean; error: string | null }> {
  try {
    const currentUser = await requireRole(
      USER_ROLES.COMPANY_ADMIN,
      USER_ROLES.BUSINESS_ADMIN
    )

    const client = await getSupabaseAdminClient()
    const { data: targetData, error: targetErr } =
      await client.auth.admin.getUserById(userId)
    if (targetErr || !targetData.user) {
      return { success: false, error: 'Usuario no encontrado' }
    }

    const targetMeta = metadataOf(targetData.user)
    // Valida tenant: el objetivo debe pertenecer a una cuenta accesible
    await requireAccountAccess(targetMeta.business_account_id)
    // No editar usuarios de rol superior ni promover por encima del propio
    assertRoleGrantable(currentUser.role, targetMeta.role)
    if (data.role !== undefined) {
      assertRoleGrantable(currentUser.role, data.role)
      if (!MANAGED_ROLES.includes(data.role)) {
        return { success: false, error: 'Rol no válido' }
      }
    }

    const userMetadata: Record<string, any> = {}
    const appMetadata: Record<string, any> = {}

    if (data.name !== undefined) {
      userMetadata.full_name = data.name
      userMetadata.name = data.name
    }
    if (data.role !== undefined) {
      userMetadata.role = data.role
      appMetadata.role = data.role
    }

    if (data.all_businesses !== undefined || data.business_id !== undefined) {
      const allBusinesses =
        data.all_businesses ?? (targetMeta.all_businesses || false)
      const scope = await resolveBusinessScope(
        client,
        targetMeta.business_account_id,
        data.business_id ?? targetMeta.business_id,
        allBusinesses
      )
      if (scope.error) return { success: false, error: scope.error }

      userMetadata.business_id = scope.primaryBusiness?.id || null
      userMetadata.businesses = scope.businesses
      userMetadata.all_businesses = allBusinesses
      appMetadata.business_id = scope.primaryBusiness?.id || null
      appMetadata.businesses = scope.businesses
      appMetadata.all_businesses = allBusinesses
    }

    const updatePayload: Record<string, any> = {}
    if (Object.keys(userMetadata).length > 0) {
      // updateUserById hace merge superficial con la metadata existente
      updatePayload.user_metadata = userMetadata
      updatePayload.app_metadata = appMetadata
    }
    if (data.password) {
      updatePayload.password = data.password
    }

    if (Object.keys(updatePayload).length === 0) {
      return { success: true, error: null }
    }

    const { error: updateError } = await client.auth.admin.updateUserById(
      userId,
      updatePayload
    )
    if (updateError) {
      return { success: false, error: updateError.message }
    }

    return { success: true, error: null }
  } catch (error: any) {
    console.error('Error updating account user:', error)
    return { success: false, error: error.message }
  }
}

export async function deleteAccountUserAction(
  userId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const currentUser = await requireRole(
      USER_ROLES.COMPANY_ADMIN,
      USER_ROLES.BUSINESS_ADMIN
    )
    if (currentUser.id === userId) {
      return { success: false, error: 'No puedes eliminar tu propio usuario' }
    }

    const client = await getSupabaseAdminClient()
    const { data: targetData, error: targetErr } =
      await client.auth.admin.getUserById(userId)
    if (targetErr || !targetData.user) {
      return { success: false, error: 'Usuario no encontrado' }
    }

    const targetMeta = metadataOf(targetData.user)
    await requireAccountAccess(targetMeta.business_account_id)
    assertRoleGrantable(currentUser.role, targetMeta.role)

    const { error } = await client.auth.admin.deleteUser(userId)
    if (error) return { success: false, error: error.message }

    return { success: true, error: null }
  } catch (error: any) {
    console.error('Error deleting account user:', error)
    return { success: false, error: error.message }
  }
}

export async function deleteAccountUsersAction(
  userIds: string[]
): Promise<{ success: boolean; deletedCount: number; error: string | null }> {
  let deletedCount = 0
  try {
    for (const id of userIds) {
      const result = await deleteAccountUserAction(id)
      if (!result.success) {
        return {
          success: deletedCount > 0,
          deletedCount,
          error: result.error,
        }
      }
      deletedCount++
    }
    return { success: true, deletedCount, error: null }
  } catch (error: any) {
    return { success: deletedCount > 0, deletedCount, error: error.message }
  }
}
