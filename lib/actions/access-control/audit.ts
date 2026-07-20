'use server'

import { getSupabaseAdminClient } from '@/lib/actions/supabase'
import { USER_ROLES } from '@/const/roles'
import {
  requireRole,
  resolveAccountScope,
} from '@/lib/auth/tenant-guard'

import type {
  RbacAuditEntry,
  RbacAuditLookups,
  RbacAuditPerson,
} from '@/lib/models/access-control/access-control'

const EMPTY_LOOKUPS: RbacAuditLookups = {
  roles: {},
  permissions: {},
  businesses: {},
  accounts: {},
  users: {},
}

/** Extrae un UUID de un campo si tiene pinta de serlo (evita traer nulls). */
function collectId(target: Set<string>, value: unknown) {
  if (typeof value === 'string' && value.length > 0) {
    target.add(value)
  }
}

/**
 * A partir de los eventos crudos, recolecta los identificadores presentes en
 * `row_data`/`actor` y los traduce a nombres legibles: roles, permisos,
 * negocios, cuentas y personas. Así la auditoría deja de mostrar UUID sueltos.
 */
async function buildLookups(
  client: Awaited<ReturnType<typeof getSupabaseAdminClient>>,
  entries: RbacAuditEntry[]
): Promise<RbacAuditLookups> {
  const roleIds = new Set<string>()
  const permissionIds = new Set<string>()
  const businessIds = new Set<string>()
  const accountIds = new Set<string>()
  const userIds = new Set<string>()

  for (const entry of entries) {
    const row = entry.row_data ?? {}
    collectId(userIds, entry.actor)
    collectId(userIds, row.user_id)
    collectId(userIds, row.granted_by)
    collectId(roleIds, row.role_id)
    collectId(permissionIds, row.permission_id)
    collectId(businessIds, row.business_id)
    collectId(accountIds, row.business_account_id)

    // La PK del propio registro depende de la tabla auditada.
    if (entry.table_name === 'rbac_roles') collectId(roleIds, row.id)
    if (entry.table_name === 'rbac_permissions') collectId(permissionIds, row.id)
  }

  const [rolesData, permsData, businessesData, accountsData, usersData] =
    await Promise.all([
      roleIds.size
        ? client.from('rbac_roles').select('id, name').in('id', [...roleIds])
        : Promise.resolve({ data: [] as Array<{ id: string; name: string }> }),
      permissionIds.size
        ? client
            .from('rbac_permissions')
            .select('id, code')
            .in('id', [...permissionIds])
        : Promise.resolve({ data: [] as Array<{ id: string; code: string }> }),
      businessIds.size
        ? client.from('businesses').select('id, name').in('id', [...businessIds])
        : Promise.resolve({ data: [] as Array<{ id: string; name: string }> }),
      accountIds.size
        ? client
            .from('business_accounts')
            .select('id, company_name')
            .in('id', [...accountIds])
        : Promise.resolve({
            data: [] as Array<{ id: string; company_name: string }>,
          }),
      Promise.all(
        [...userIds].map((id) =>
          client.auth.admin
            .getUserById(id)
            .then(({ data }) => {
              const u = data?.user
              if (!u) return null
              return {
                id,
                name:
                  (u.user_metadata?.name as string) ||
                  (u.user_metadata?.full_name as string) ||
                  null,
                email: u.email ?? null,
              } satisfies RbacAuditPerson
            })
            .catch(() => null)
        )
      ),
    ])

  const lookups: RbacAuditLookups = {
    roles: {},
    permissions: {},
    businesses: {},
    accounts: {},
    users: {},
  }

  for (const r of rolesData.data ?? []) lookups.roles[r.id] = r.name
  for (const p of permsData.data ?? []) lookups.permissions[p.id] = p.code
  for (const b of businessesData.data ?? []) lookups.businesses[b.id] = b.name
  for (const a of accountsData.data ?? [])
    lookups.accounts[a.id] = a.company_name
  for (const u of usersData) if (u) lookups.users[u.id] = u

  return lookups
}

/**
 * Auditoría de cambios RBAC (AC-2): company_admin ve toda la plataforma;
 * business_admin solo los eventos de su cuenta. Junto a los eventos se
 * devuelven diccionarios id → nombre para presentarlos de forma legible.
 */
export async function fetchRbacAuditAction(params?: {
  businessAccountId?: string
  limit?: number
}): Promise<{
  data: RbacAuditEntry[]
  lookups: RbacAuditLookups
  error: string | null
}> {
  try {
    await requireRole(USER_ROLES.COMPANY_ADMIN, USER_ROLES.BUSINESS_ADMIN)
    const { businessAccountId } = await resolveAccountScope(
      params?.businessAccountId
    )

    const client = await getSupabaseAdminClient()
    let query = client
      .from('rbac_audit_log')
      .select('*')
      .order('occurred_at', { ascending: false })
      .limit(Math.min(params?.limit ?? 100, 500))

    if (businessAccountId) {
      query = query.eq('business_account_id', businessAccountId)
    }

    const { data, error } = await query
    if (error) throw error

    const entries = data ?? []
    const lookups = await buildLookups(client, entries)

    return { data: entries, lookups, error: null }
  } catch (error: any) {
    console.error('Error fetching RBAC audit log:', error)
    return { data: [], lookups: EMPTY_LOOKUPS, error: error.message }
  }
}
