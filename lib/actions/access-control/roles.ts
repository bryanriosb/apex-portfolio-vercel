'use server'

import { getSupabaseAdminClient } from '@/lib/actions/supabase'
import { USER_ROLES } from '@/const/roles'
import {
  requireRole,
  requireCompanyAdmin,
  requireAccountAccess,
  resolveAccountScope,
  AccessDeniedError,
} from '@/lib/auth/tenant-guard'
import { assertCanGrantPermissions } from '@/lib/auth/rbac'

import type {
  RbacRole,
  RbacRoleInsert,
  RbacRoleUpdate,
  RbacPermission,
} from '@/lib/models/access-control/access-control'
import type { AuthUser } from '@/lib/services/auth/supabase-auth'

/**
 * Carga un rol y verifica que la sesión pueda ADMINISTRARLO:
 * - Roles del sistema (`is_system`): inmutables para todos.
 * - Roles globales: solo company_admin.
 * - Roles de tenant: admins de esa cuenta (o company_admin).
 */
async function requireManageableRole(roleId: string): Promise<{
  role: RbacRole
  user: AuthUser
}> {
  const client = await getSupabaseAdminClient()
  const { data: role } = await client
    .from('rbac_roles')
    .select('*')
    .eq('id', roleId)
    .maybeSingle()

  if (!role) {
    throw new AccessDeniedError('Rol no encontrado', 404)
  }

  if (role.is_system) {
    throw new AccessDeniedError('Los roles del sistema no se pueden modificar')
  }

  if (role.business_account_id === null) {
    const user = await requireCompanyAdmin()
    return { role, user }
  }

  const user = await requireRole(USER_ROLES.COMPANY_ADMIN, USER_ROLES.BUSINESS_ADMIN)
  await requireAccountAccess(role.business_account_id)
  return { role, user }
}

/**
 * Lista roles visibles para la sesión: globales (solo lectura para tenants)
 * + los del tenant en alcance. company_admin sin filtro ve todos.
 */
export async function fetchRolesAction(params?: {
  businessAccountId?: string
}): Promise<{ data: RbacRole[]; error: string | null }> {
  try {
    const { businessAccountId } = await resolveAccountScope(
      params?.businessAccountId
    )

    const client = await getSupabaseAdminClient()
    let query = client
      .from('rbac_roles')
      .select('*, rbac_role_permissions(count)')
      .order('is_system', { ascending: false })
      .order('name')

    if (businessAccountId) {
      query = query.or(
        `business_account_id.is.null,business_account_id.eq.${businessAccountId}`
      )
    }

    const { data, error } = await query
    if (error) throw error

    const roles: RbacRole[] = (data ?? []).map((row: any) => ({
      ...row,
      permissions_count: row.rbac_role_permissions?.[0]?.count ?? 0,
      rbac_role_permissions: undefined,
    }))

    return { data: roles, error: null }
  } catch (error: any) {
    console.error('Error fetching roles:', error)
    return { data: [], error: error.message }
  }
}

export async function createRoleAction(
  input: RbacRoleInsert
): Promise<{ data: RbacRole | null; error: string | null }> {
  try {
    const user = await requireRole(
      USER_ROLES.COMPANY_ADMIN,
      USER_ROLES.BUSINESS_ADMIN
    )

    // Un rol global (business_account_id NULL) solo puede crearlo la
    // plataforma; los tenants crean roles dentro de su cuenta.
    let targetAccountId: string | null
    if (user.role === USER_ROLES.COMPANY_ADMIN) {
      targetAccountId = input.business_account_id ?? null
    } else {
      const { businessAccountId } = await requireAccountAccess(
        input.business_account_id ?? undefined
      )
      targetAccountId = businessAccountId
    }

    const client = await getSupabaseAdminClient()
    const { data, error } = await client
      .from('rbac_roles')
      .insert({
        name: input.name.trim(),
        description: input.description ?? null,
        business_account_id: targetAccountId,
        is_system: false,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return { data: null, error: 'Ya existe un rol con ese nombre' }
      }
      throw error
    }

    return { data, error: null }
  } catch (error: any) {
    console.error('Error creating role:', error)
    return { data: null, error: error.message }
  }
}

export async function updateRoleAction(
  roleId: string,
  input: RbacRoleUpdate
): Promise<{ data: RbacRole | null; error: string | null }> {
  try {
    await requireManageableRole(roleId)

    const client = await getSupabaseAdminClient()
    const { data, error } = await client
      .from('rbac_roles')
      .update({
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.description !== undefined
          ? { description: input.description }
          : {}),
      })
      .eq('id', roleId)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return { data: null, error: 'Ya existe un rol con ese nombre' }
      }
      throw error
    }

    return { data, error: null }
  } catch (error: any) {
    console.error('Error updating role:', error)
    return { data: null, error: error.message }
  }
}

export async function deleteRoleAction(
  roleId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    await requireManageableRole(roleId)

    const client = await getSupabaseAdminClient()

    // Evitar dejar usuarios sin acceso sin que el admin lo sepa.
    const { count } = await client
      .from('rbac_user_roles')
      .select('user_id', { count: 'exact', head: true })
      .eq('role_id', roleId)

    if (count && count > 0) {
      return {
        success: false,
        error: `El rol tiene ${count} asignación(es) activa(s); revócalas primero`,
      }
    }

    const { error } = await client.from('rbac_roles').delete().eq('id', roleId)
    if (error) throw error

    return { success: true, error: null }
  } catch (error: any) {
    console.error('Error deleting role:', error)
    return { success: false, error: error.message }
  }
}

/** Permisos actuales de un rol (visible para cualquier sesión del tenant). */
export async function getRolePermissionsAction(
  roleId: string
): Promise<{ data: RbacPermission[]; error: string | null }> {
  try {
    const client = await getSupabaseAdminClient()
    const { data: role } = await client
      .from('rbac_roles')
      .select('id, business_account_id')
      .eq('id', roleId)
      .maybeSingle()

    if (!role) {
      return { data: [], error: 'Rol no encontrado' }
    }

    // Roles de tenant solo visibles dentro de su cuenta; los globales, para
    // cualquier sesión autenticada.
    if (role.business_account_id) {
      await requireAccountAccess(role.business_account_id)
    } else {
      await resolveAccountScope()
    }

    const { data, error } = await client
      .from('rbac_role_permissions')
      .select('permission:rbac_permissions(*)')
      .eq('role_id', roleId)

    if (error) throw error

    const permissions = (data ?? [])
      .map((row: any) => row.permission)
      .filter(Boolean)
      .sort((a: RbacPermission, b: RbacPermission) =>
        a.code.localeCompare(b.code)
      )

    return { data: permissions, error: null }
  } catch (error: any) {
    console.error('Error fetching role permissions:', error)
    return { data: [], error: error.message }
  }
}

/**
 * Reemplaza el set de permisos de un rol (AC-6): el otorgante solo puede
 * conceder permisos que él mismo posee (company_admin exento).
 */
export async function setRolePermissionsAction(
  roleId: string,
  permissionIds: string[]
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { role, user } = await requireManageableRole(roleId)

    const client = await getSupabaseAdminClient()

    const { data: permissions, error: permError } = await client
      .from('rbac_permissions')
      .select('id, code')
      .in('id', permissionIds.length > 0 ? permissionIds : ['00000000-0000-0000-0000-000000000000'])

    if (permError) throw permError

    if ((permissions?.length ?? 0) !== permissionIds.length) {
      return { success: false, error: 'Uno o más permisos no existen' }
    }

    if (user.role !== USER_ROLES.COMPANY_ADMIN) {
      const accountForCoverage =
        role.business_account_id ?? user.business_account_id
      if (!accountForCoverage) {
        throw new AccessDeniedError('No se pudo resolver la cuenta del otorgante')
      }
      await assertCanGrantPermissions(
        user,
        accountForCoverage,
        (permissions ?? []).map((p) => p.code)
      )
    }

    // Reemplazo transaccional simple: delete + insert (la auditoría registra
    // ambas operaciones fila a fila).
    const { error: deleteError } = await client
      .from('rbac_role_permissions')
      .delete()
      .eq('role_id', roleId)
    if (deleteError) throw deleteError

    if (permissionIds.length > 0) {
      const { error: insertError } = await client
        .from('rbac_role_permissions')
        .insert(
          permissionIds.map((permissionId) => ({
            role_id: roleId,
            permission_id: permissionId,
            granted_by: user.id,
          }))
        )
      if (insertError) throw insertError
    }

    return { success: true, error: null }
  } catch (error: any) {
    console.error('Error setting role permissions:', error)
    return { success: false, error: error.message }
  }
}
