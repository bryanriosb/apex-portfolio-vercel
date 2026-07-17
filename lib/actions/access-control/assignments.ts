'use server'

import { getSupabaseAdminClient } from '@/lib/actions/supabase'
import { USER_ROLES } from '@/const/roles'
import {
  requireRole,
  requireAccountAccess,
  requireBusinessAccess,
  AccessDeniedError,
} from '@/lib/auth/tenant-guard'
import { assertCanGrantPermissions } from '@/lib/auth/rbac'

import type {
  AccountMember,
  RbacUserRole,
} from '@/lib/models/access-control/access-control'

/**
 * Miembros de la cuenta con sus roles RBAC. La cuenta efectiva sale de la
 * sesión (company_admin puede consultar cualquiera).
 */
export async function fetchAccountMembersAction(params?: {
  businessAccountId?: string
}): Promise<{ data: AccountMember[]; error: string | null }> {
  try {
    await requireRole(USER_ROLES.COMPANY_ADMIN, USER_ROLES.BUSINESS_ADMIN)
    const { businessAccountId } = await requireAccountAccess(
      params?.businessAccountId
    )

    const client = await getSupabaseAdminClient()

    const [{ data: usersData, error: usersError }, { data: assignments, error: rolesError }] =
      await Promise.all([
        client.auth.admin.listUsers({ perPage: 1000 }),
        client
          .from('rbac_user_roles')
          .select('*, role:rbac_roles(*)')
          .eq('business_account_id', businessAccountId),
      ])

    if (usersError) throw usersError
    if (rolesError) throw rolesError

    const byUser = new Map<string, RbacUserRole[]>()
    for (const assignment of assignments ?? []) {
      const list = byUser.get(assignment.user_id) ?? []
      list.push(assignment)
      byUser.set(assignment.user_id, list)
    }

    const members: AccountMember[] = (usersData?.users ?? [])
      .filter((u) => {
        const accountId =
          u.app_metadata?.business_account_id ||
          u.user_metadata?.business_account_id
        return accountId === businessAccountId
      })
      .map((u) => ({
        user_id: u.id,
        email: u.email ?? '',
        name: u.user_metadata?.name || u.user_metadata?.full_name || null,
        legacy_role: u.user_metadata?.role || u.app_metadata?.role || null,
        roles: byUser.get(u.id) ?? [],
      }))

    return { data: members, error: null }
  } catch (error: any) {
    console.error('Error fetching account members:', error)
    return { data: [], error: error.message }
  }
}

/**
 * Asigna un rol a un usuario dentro de la cuenta de la sesión.
 * AC-6: el otorgante debe poseer todos los permisos del rol que asigna
 * (company_admin exento). AC-2: queda registrado quién/cuándo/expiración.
 */
export async function assignRoleAction(input: {
  userId: string
  roleId: string
  businessAccountId?: string
  businessId?: string | null
  expiresAt?: string | null
}): Promise<{ success: boolean; error: string | null }> {
  try {
    const user = await requireRole(
      USER_ROLES.COMPANY_ADMIN,
      USER_ROLES.BUSINESS_ADMIN
    )
    const { businessAccountId } = await requireAccountAccess(
      input.businessAccountId
    )

    if (input.businessId) {
      await requireBusinessAccess(input.businessId)
    }

    const client = await getSupabaseAdminClient()

    // El rol debe ser global o pertenecer a ESTA cuenta.
    const { data: role } = await client
      .from('rbac_roles')
      .select('id, name, business_account_id')
      .eq('id', input.roleId)
      .maybeSingle()

    if (!role) {
      return { success: false, error: 'Rol no encontrado' }
    }
    if (role.business_account_id && role.business_account_id !== businessAccountId) {
      throw new AccessDeniedError('El rol pertenece a otra cuenta')
    }

    // El usuario destino debe ser miembro de la cuenta.
    const { data: targetUser, error: targetError } =
      await client.auth.admin.getUserById(input.userId)
    if (targetError || !targetUser?.user) {
      return { success: false, error: 'Usuario no encontrado' }
    }
    const targetAccountId =
      targetUser.user.app_metadata?.business_account_id ||
      targetUser.user.user_metadata?.business_account_id
    if (targetAccountId !== businessAccountId) {
      throw new AccessDeniedError('El usuario no pertenece a esta cuenta')
    }

    // Anti-escalación: un business_admin no puede asignar roles que
    // contengan permisos de plataforma (p. ej. el rol company_admin con '*').
    if (user.role !== USER_ROLES.COMPANY_ADMIN) {
      const { data: rolePerms } = await client
        .from('rbac_role_permissions')
        .select('permission:rbac_permissions(code)')
        .eq('role_id', input.roleId)

      const codes = (rolePerms ?? [])
        .map((row: any) => row.permission?.code)
        .filter(Boolean)

      await assertCanGrantPermissions(user, businessAccountId, codes)
    }

    const { error } = await client.from('rbac_user_roles').upsert(
      {
        user_id: input.userId,
        role_id: input.roleId,
        business_account_id: businessAccountId,
        business_id: input.businessId ?? null,
        granted_by: user.id,
        expires_at: input.expiresAt ?? null,
      },
      { onConflict: 'user_id,role_id,business_account_id' }
    )

    if (error) throw error
    return { success: true, error: null }
  } catch (error: any) {
    console.error('Error assigning role:', error)
    return { success: false, error: error.message }
  }
}

export async function revokeRoleAction(input: {
  userId: string
  roleId: string
  businessAccountId?: string
}): Promise<{ success: boolean; error: string | null }> {
  try {
    const user = await requireRole(
      USER_ROLES.COMPANY_ADMIN,
      USER_ROLES.BUSINESS_ADMIN
    )
    const { businessAccountId } = await requireAccountAccess(
      input.businessAccountId
    )

    // Nadie puede revocarse a sí mismo su último rol de administración por
    // accidente (lockout): se exige que otro admin lo haga.
    if (
      user.id === input.userId &&
      user.role !== USER_ROLES.COMPANY_ADMIN
    ) {
      return {
        success: false,
        error: 'No puedes revocar tus propios roles; pídelo a otro administrador',
      }
    }

    const client = await getSupabaseAdminClient()
    const { error } = await client
      .from('rbac_user_roles')
      .delete()
      .eq('user_id', input.userId)
      .eq('role_id', input.roleId)
      .eq('business_account_id', businessAccountId)

    if (error) throw error
    return { success: true, error: null }
  } catch (error: any) {
    console.error('Error revoking role:', error)
    return { success: false, error: error.message }
  }
}
