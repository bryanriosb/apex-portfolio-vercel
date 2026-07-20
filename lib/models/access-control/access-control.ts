/**
 * Permisos reservados a la plataforma: un administrador de tenant
 * (business_admin) es super-usuario DENTRO de su cuenta, pero jamás puede
 * otorgar estos códigos — hacerlo escalaría privilegios de plataforma (AC-6).
 * Módulo client-safe: lo consumen tanto server actions como la UI.
 */
export const PLATFORM_RESERVED_ENTITIES = ['plan', 'system'] as const
export const PLATFORM_RESERVED_CODES = ['*', 'account.delete'] as const

export function isPlatformReservedPermission(code: string): boolean {
  if ((PLATFORM_RESERVED_CODES as readonly string[]).includes(code)) {
    return true
  }
  const [entity] = code.split('.')
  return (PLATFORM_RESERVED_ENTITIES as readonly string[]).includes(entity)
}

export interface RbacRole {
  id: string
  business_account_id: string | null
  name: string
  description: string | null
  is_system: boolean
  created_at: string
  updated_at: string
  /** Conteo opcional cuando el listado lo incluye. */
  permissions_count?: number
}

export interface RbacRoleInsert {
  name: string
  description?: string | null
  /** Solo company_admin puede fijarlo (NULL = rol global). */
  business_account_id?: string | null
}

export interface RbacRoleUpdate {
  name?: string
  description?: string | null
}

export interface RbacPermission {
  id: string
  code: string
  entity: string
  action: string
  description: string | null
  created_at: string
}

export interface RbacPermissionInsert {
  code: string
  description?: string | null
}

export interface RbacUserRole {
  user_id: string
  role_id: string
  business_account_id: string
  business_id: string | null
  granted_by: string | null
  granted_at: string
  expires_at: string | null
  role?: RbacRole
}

/** Miembro de una cuenta con sus roles RBAC para la página de asignaciones. */
export interface AccountMember {
  user_id: string
  email: string
  name: string | null
  /** Rol legacy de user_metadata (informativo durante la transición). */
  legacy_role: string | null
  roles: RbacUserRole[]
}

export interface RbacAuditEntry {
  id: string
  occurred_at: string
  table_name: string
  operation: string
  actor: string | null
  business_account_id: string | null
  row_data: Record<string, unknown>
}

/** Persona resuelta (actor o usuario destino) para mostrar en auditoría. */
export interface RbacAuditPerson {
  id: string
  name: string | null
  email: string | null
}

/**
 * Diccionarios id → nombre legible que acompañan a los eventos de auditoría.
 * Permiten traducir los UUID crudos de `row_data`/`actor` a algo que una
 * persona no técnica pueda leer (AC-2).
 */
export interface RbacAuditLookups {
  roles: Record<string, string>
  permissions: Record<string, string>
  businesses: Record<string, string>
  accounts: Record<string, string>
  users: Record<string, RbacAuditPerson>
}
