'use server'

import { getCurrentUser } from '@/lib/services/auth/supabase-auth'
import { getAllModuleAccessAction } from '@/lib/actions/plan'
import { type ModuleName } from '@/lib/config/module-access'
import { USER_ROLES } from '@/const/roles'

export interface ModuleAccessValidationResult {
  hasAccess: boolean
  reason?: string
  redirectTo?: string
}

/**
 * Valida el acceso a un módulo en el servidor
 * Esta función debe ser llamada en las Server Actions o API Routes
 * para verificar que el usuario tiene acceso al módulo solicitado
 *
 * @example
 * ```ts
 * export async function createMedicalRecordAction(data: any) {
 *   const access = await validateModuleAccess('medical_records')
 *   if (!access.hasAccess) {
 *     return { success: false, error: access.reason }
 *   }
 *   // ... continuar con la lógica
 * }
 * ```
 */
export async function validateModuleAccess(
  module: ModuleName
): Promise<ModuleAccessValidationResult> {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return {
        hasAccess: false,
        reason: 'Usuario no autenticado',
        redirectTo: '/auth/sign-in',
      }
    }

    // COMPANY_ADMIN tiene acceso completo a todos los módulos
    if (currentUser.role === USER_ROLES.COMPANY_ADMIN) {
      return { hasAccess: true }
    }

    // Verificar que el usuario tenga business_account_id
    if (!currentUser.business_account_id) {
      return {
        hasAccess: false,
        reason: 'No se pudo identificar tu cuenta de negocio',
      }
    }

    // Obtener módulos accesibles desde BD (100% dependiente de plan_module_access)
    const moduleAccess = await getAllModuleAccessAction(currentUser.business_account_id)

    // Verificar si el módulo está en la lista de accesibles
    const hasAccess = moduleAccess[module] === true

    if (!hasAccess) {
      return {
        hasAccess: false,
        reason: 'No tienes acceso a este módulo. Actualiza tu plan para obtener acceso.',
        redirectTo: '/admin',
      }
    }

    return { hasAccess: true }
  } catch (error) {
    console.error('Error validating module access:', error)
    return {
      hasAccess: false,
      reason: 'Error al validar el acceso al módulo',
    }
  }
}

// NOTA: Las funciones auxiliares getBusinessTypeForAccount y getSubscriptionPlanForAccount
// se eliminaron porque el sistema ahora es 100% dependiente de plan_module_access
// y no necesita consultar tipos de negocio o planes de suscripción por separado.
