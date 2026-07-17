import { USER_ROLES, type UserRole } from './roles'

/**
 * Mapa ruta → roles permitidos para el gating server-side del middleware
 * (NIST SP 800-53 AC-3). Fuente: `SIDE_*_MENU_ITEMS` de `sidebar-menu.ts`,
 * pero separado para mantener el bundle del middleware edge-safe (sin
 * iconos ni dependencias de UI).
 *
 * Semántica fail-closed: se resuelve por el prefijo más específico y toda
 * ruta bajo `/admin` sin entrada en el mapa se deniega. Una página nueva
 * bajo `/admin` requiere registrar aquí sus roles.
 */

const ALL_STAFF: readonly UserRole[] = [
  USER_ROLES.COMPANY_ADMIN,
  USER_ROLES.BUSINESS_ADMIN,
  USER_ROLES.PROFESSIONAL,
]

const ADMINS: readonly UserRole[] = [
  USER_ROLES.COMPANY_ADMIN,
  USER_ROLES.BUSINESS_ADMIN,
]

const EVERYONE: readonly UserRole[] = [
  USER_ROLES.COMPANY_ADMIN,
  USER_ROLES.BUSINESS_ADMIN,
  USER_ROLES.PROFESSIONAL,
  USER_ROLES.EMPLOYEE,
  USER_ROLES.CUSTOMER,
]

export const ADMIN_ROUTE_ACCESS: Record<string, readonly UserRole[]> = {
  // Landing: la página redirige por rol; debe ser alcanzable por todos.
  '/admin': EVERYONE,

  '/admin/dashboard': ALL_STAFF,
  '/admin/company-dashboard': [USER_ROLES.COMPANY_ADMIN],
  '/admin/customer-dashboard': [USER_ROLES.CUSTOMER],

  '/admin/collection': ALL_STAFF,
  '/admin/collection/settings': ADMINS,

  '/admin/customers': ALL_STAFF,
  '/admin/reports': ADMINS,

  '/admin/agentic': ALL_STAFF,
  '/admin/agentic/settings': ADMINS,
  '/admin/audit': ADMINS,

  '/admin/suscription': ADMINS,
  '/admin/plans': [USER_ROLES.COMPANY_ADMIN],
  '/admin/businesses': ADMINS,
  '/admin/business-accounts': ADMINS,

  '/admin/settings': ADMINS,
  '/admin/settings/trial': [USER_ROLES.COMPANY_ADMIN],
  '/admin/settings/whatsapp': [USER_ROLES.COMPANY_ADMIN],

  '/admin/access-control': ADMINS,
}

/**
 * Resuelve si `role` puede acceder a `pathname` por coincidencia del
 * prefijo más específico del mapa. Sin coincidencia → denegado.
 */
export function isAdminRouteAllowed(
  pathname: string,
  role: string | undefined
): boolean {
  if (!role) return false

  let bestMatch: readonly UserRole[] | null = null
  let bestLength = -1

  for (const [prefix, roles] of Object.entries(ADMIN_ROUTE_ACCESS)) {
    const matches =
      pathname === prefix || pathname.startsWith(`${prefix}/`)
    if (matches && prefix.length > bestLength) {
      bestMatch = roles
      bestLength = prefix.length
    }
  }

  // Igualdad estricta de rol: nunca coincidencia parcial.
  return bestMatch !== null && bestMatch.some((allowed) => allowed === role)
}
