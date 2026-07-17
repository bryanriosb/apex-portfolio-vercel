import { getServerSession } from 'next-auth'
import { AUTH_OPTIONS } from '@/const/auth'
import { USER_ROLES, type UserRole } from '@/const/roles'
import { getSupabaseAdminClient } from '@/lib/actions/supabase'

import type { AuthUser } from '@/lib/services/auth/supabase-auth'

/**
 * Guard de autorización server-side (NIST SP 800-53 AC-3/AC-6, fail-closed).
 *
 * El tenant efectivo (`business_account_id` / `business_id`) SIEMPRE se
 * deriva de la sesión NextAuth del servidor. Los IDs que llegan como
 * parámetros desde el cliente solo se aceptan si coinciden con la sesión,
 * salvo para `company_admin` (único rol cross-tenant).
 *
 * Este módulo NO lleva 'use server' a propósito: sus exports no deben
 * convertirse en endpoints invocables desde el cliente.
 */

export class AccessDeniedError extends Error {
  readonly status: number

  constructor(message: string, status = 403) {
    super(message)
    this.name = 'AccessDeniedError'
    this.status = status
  }
}

/** Sesión válida o error 401. Nunca retorna un usuario parcial. */
export async function requireUser(): Promise<AuthUser> {
  const session = await getServerSession(AUTH_OPTIONS)
  const user = session?.user as AuthUser | undefined

  if (!user?.id || !user.role) {
    throw new AccessDeniedError('No autenticado', 401)
  }

  return user
}

/**
 * Exige que el rol de la sesión esté en la lista permitida.
 * Comparación por igualdad estricta (previene escalación por subcadena).
 */
export async function requireRole(...roles: UserRole[]): Promise<AuthUser> {
  const user = await requireUser()

  if (!roles.some((role) => role === user.role)) {
    throw new AccessDeniedError(
      'No tienes permisos para realizar esta acción'
    )
  }

  return user
}

/** Atajo para operaciones exclusivas de plataforma. */
export async function requireCompanyAdmin(): Promise<AuthUser> {
  return requireRole(USER_ROLES.COMPANY_ADMIN)
}

export interface AccountContext {
  user: AuthUser
  /** Cuenta sobre la que la acción está autorizada a operar. */
  businessAccountId: string
}

/**
 * Resuelve la cuenta (tenant) efectiva para una acción.
 *
 * - `company_admin`: puede operar sobre la cuenta solicitada (o la propia
 *   si no se solicita ninguna).
 * - Resto de roles: la cuenta efectiva es la de su sesión; si solicitan una
 *   distinta se deniega. Si la sesión no tiene cuenta, se deniega.
 *
 * @param requestedAccountId ID recibido del cliente (no confiable).
 */
export async function requireAccountAccess(
  requestedAccountId?: string | null
): Promise<AccountContext> {
  const user = await requireUser()

  if (user.role === USER_ROLES.COMPANY_ADMIN) {
    const businessAccountId = requestedAccountId || user.business_account_id
    if (!businessAccountId) {
      throw new AccessDeniedError('Cuenta de negocio no especificada', 400)
    }
    return { user, businessAccountId }
  }

  const sessionAccountId = user.business_account_id
  if (!sessionAccountId) {
    throw new AccessDeniedError('Tu sesión no tiene una cuenta de negocio asociada')
  }

  if (requestedAccountId && requestedAccountId !== sessionAccountId) {
    throw new AccessDeniedError('No tienes acceso a esta cuenta de negocio')
  }

  return { user, businessAccountId: sessionAccountId }
}

export interface AccountScope {
  user: AuthUser
  /**
   * Cuenta a la que debe restringirse un listado. `null` únicamente para
   * `company_admin` sin filtro solicitado (alcance global de plataforma).
   */
  businessAccountId: string | null
}

/**
 * Variante de `requireAccountAccess` para acciones de listado: resuelve el
 * alcance de cuenta en lugar de exigir una concreta. Para cualquier rol
 * distinto de `company_admin` el alcance es SIEMPRE la cuenta de su sesión.
 */
export async function resolveAccountScope(
  requestedAccountId?: string | null
): Promise<AccountScope> {
  const user = await requireUser()

  if (user.role === USER_ROLES.COMPANY_ADMIN) {
    return { user, businessAccountId: requestedAccountId || null }
  }

  const sessionAccountId = user.business_account_id
  if (!sessionAccountId) {
    throw new AccessDeniedError('Tu sesión no tiene una cuenta de negocio asociada')
  }

  if (requestedAccountId && requestedAccountId !== sessionAccountId) {
    throw new AccessDeniedError('No tienes acceso a esta cuenta de negocio')
  }

  return { user, businessAccountId: sessionAccountId }
}

export interface BusinessContext {
  user: AuthUser
  /** Sucursal sobre la que la acción está autorizada a operar. */
  businessId: string
}

/**
 * Resuelve la sucursal (business) efectiva para una acción.
 *
 * - `company_admin`: cualquier sucursal.
 * - Resto de roles: la solicitada debe ser su `business_id` o pertenecer a
 *   `businesses[]` de su sesión (soporta el business switcher). Sin
 *   solicitud explícita se usa el `business_id` de la sesión.
 */
export async function requireBusinessAccess(
  requestedBusinessId?: string | null
): Promise<BusinessContext> {
  const user = await requireUser()

  if (user.role === USER_ROLES.COMPANY_ADMIN) {
    const businessId = requestedBusinessId || user.business_id
    if (!businessId) {
      throw new AccessDeniedError('Sucursal no especificada', 400)
    }
    return { user, businessId }
  }

  if (!requestedBusinessId) {
    if (!user.business_id) {
      throw new AccessDeniedError('Tu sesión no tiene una sucursal asociada')
    }
    return { user, businessId: user.business_id }
  }

  const ownedBusinessIds = new Set(
    [user.business_id, ...(user.businesses?.map((b) => b.id) ?? [])].filter(
      Boolean
    ) as string[]
  )

  if (ownedBusinessIds.has(requestedBusinessId)) {
    return { user, businessId: requestedBusinessId }
  }

  // La lista de sucursales de la sesión puede estar desactualizada (p. ej.
  // una sucursal creada después del login). Se verifica contra la BD que la
  // sucursal pertenezca a la cuenta del usuario antes de denegar.
  if (user.business_account_id) {
    const client = await getSupabaseAdminClient()
    const { data } = await client
      .from('businesses')
      .select('id')
      .eq('id', requestedBusinessId)
      .eq('business_account_id', user.business_account_id)
      .maybeSingle()

    if (data) {
      return { user, businessId: requestedBusinessId }
    }
  }

  throw new AccessDeniedError('No tienes acceso a esta sucursal')
}

/**
 * Convierte un fallo de guard en el shape `{ success: false, error }` que
 * usan las server actions existentes; relanza cualquier otro error.
 */
export function toActionError(err: unknown): { success: false; error: string } {
  if (err instanceof AccessDeniedError) {
    return { success: false, error: err.message }
  }
  throw err
}
