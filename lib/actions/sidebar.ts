import { getAllModuleAccessAction } from './plan'
import { USER_ROLES, type UserRole } from '@/const/roles'

/**
 * Obtiene la lista de códigos de módulos accesibles para el usuario
 * Se ejecuta en el servidor para determinar qué módulos mostrar
 */
export async function getAccessibleModules(
  businessAccountId: string | null,
  userRole: UserRole
): Promise<string[]> {
  // COMPANY_ADMIN tiene acceso completo sin verificación de plan
  if (userRole === USER_ROLES.COMPANY_ADMIN) {
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

  // Si no hay business account, mostrar solo módulos básicos
  if (!businessAccountId) {
    return ['dashboard', 'appointments', 'services', 'settings']
  }

  // Obtener acceso a módulos del plan
  const moduleAccess = await getAllModuleAccessAction(businessAccountId)

  // Convertir el objeto de acceso a array de códigos de módulos accesibles
  const accessibleModules = Object.entries(moduleAccess)
    .filter(([_, hasAccess]) => hasAccess === true)
    .map(([moduleCode, _]) => moduleCode)

  return accessibleModules
}