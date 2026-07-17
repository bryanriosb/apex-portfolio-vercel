import { getAllModuleAccessAction } from './plan'
import { USER_ROLES, type UserRole } from '@/const/roles'
import { requireUser } from '@/lib/auth/tenant-guard'

/**
 * Obtiene la lista de códigos de módulos accesibles para el usuario
 * Se ejecuta en el servidor para determinar qué módulos mostrar
 */
export async function getAccessibleModules(
  businessAccountId: string | null,
  userRole: UserRole
): Promise<string[]> {
  // AC-3/AC-6 (fail-closed): el rol y la cuenta efectivos se derivan SIEMPRE
  // de la sesión del servidor. Los parámetros recibidos no son confiables y
  // solo se usan para detectar divergencias.
  const user = await requireUser()
  const sessionRole = user.role
  const sessionAccountId = user.business_account_id ?? null

  if (
    userRole !== sessionRole ||
    (businessAccountId && businessAccountId !== sessionAccountId)
  ) {
    console.warn(
      '[sidebar] Parámetros divergentes de la sesión; se usa la sesión',
      { requestedRole: userRole, requestedAccountId: businessAccountId }
    )
  }

  // COMPANY_ADMIN tiene acceso completo sin verificación de plan
  if (sessionRole === USER_ROLES.COMPANY_ADMIN) {
    // Retornar todos los códigos de módulos posibles
    return [
      'dashboard',
      'appointments',
      'services',
      'products',
      'inventory',
      'specialists',
      'customers',
      'medical_records',
      'commissions',
      'reports',
      'invoices',
      'ai_assistant',
      'whatsapp',
      'settings'
    ]
  }

  // Si no hay business account en la sesión, mostrar solo módulos básicos
  if (!sessionAccountId) {
    return ['dashboard', 'appointments', 'services', 'settings']
  }

  // Obtener acceso a módulos del plan (cuenta derivada de la sesión)
  const moduleAccess = await getAllModuleAccessAction(sessionAccountId)

  // Convertir el objeto de acceso a array de códigos de módulos accesibles
  const accessibleModules = Object.entries(moduleAccess)
    .filter(([_, hasAccess]) => hasAccess === true)
    .map(([moduleCode, _]) => moduleCode)

  return accessibleModules
}