import { getSupabaseAdminClient } from '@/lib/actions/supabase'
import { USER_ROLES } from '@/const/roles'
import { AccessDeniedError } from '@/lib/auth/tenant-guard'
import { isPlatformReservedPermission } from '@/lib/models/access-control/access-control'

import type { AuthUser } from '@/lib/services/auth/supabase-auth'

/**
 * Helpers RBAC compartidos por las server actions de Control de Acceso.
 * Sin 'use server' a propósito: no deben ser endpoints invocables.
 */

/** ¿`granted` (exacto, 'entidad.*' o '*') cubre el permiso `requested`? */
export function permissionCovers(granted: string, requested: string): boolean {
  if (granted === '*' || granted === requested) return true
  const [entity] = requested.split('.')
  return granted === `${entity}.*`
}

/** Permisos efectivos del usuario en la cuenta, vía RPC fail-closed. */
export async function getEffectivePermissionCodes(
  userId: string,
  businessAccountId: string
): Promise<string[]> {
  const client = await getSupabaseAdminClient()
  const { data, error } = await client.rpc('rbac_get_user_permissions', {
    p_user_id: userId,
    p_business_account_id: businessAccountId,
  })

  if (error) {
    console.error('Error fetching effective permissions:', error.message)
    return []
  }

  return (data ?? []).map((row: { code: string }) => row.code)
}

/**
 * AC-6 (anti-escalación) con jerarquía de super-usuarios:
 *
 * - `company_admin`: super-usuario de plataforma — otorga cualquier permiso.
 * - `business_admin`: super-usuario de SU cuenta — otorga cualquier permiso
 *   de tenant, pero nunca los reservados a plataforma ('*', `plan.*`,
 *   `system.*`, `account.delete`), que escalarían fuera de su ámbito.
 * - Cualquier otro rol otorgante (futuro): regla de cobertura — solo puede
 *   otorgar permisos que él mismo posee. Fail-closed si no tiene permisos
 *   materializados.
 */
export async function assertCanGrantPermissions(
  granter: AuthUser,
  businessAccountId: string,
  requestedCodes: string[]
): Promise<void> {
  if (granter.role === USER_ROLES.COMPANY_ADMIN) return
  if (requestedCodes.length === 0) return

  if (granter.role === USER_ROLES.BUSINESS_ADMIN) {
    const reserved = requestedCodes.filter(isPlatformReservedPermission)
    if (reserved.length > 0) {
      throw new AccessDeniedError(
        `Permisos reservados a la plataforma, no otorgables por un tenant: ${reserved.join(', ')}`
      )
    }
    return
  }

  const granted = await getEffectivePermissionCodes(granter.id, businessAccountId)

  if (granted.length === 0) {
    throw new AccessDeniedError(
      'Tu usuario no tiene permisos RBAC materializados; contacta al administrador de la plataforma'
    )
  }

  const uncovered = requestedCodes.filter(
    (code) => !granted.some((g) => permissionCovers(g, code))
  )

  if (uncovered.length > 0) {
    throw new AccessDeniedError(
      `No puedes otorgar permisos que no posees: ${uncovered.join(', ')}`
    )
  }
}
