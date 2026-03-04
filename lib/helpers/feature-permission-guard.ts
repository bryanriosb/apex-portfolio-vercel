import { checkFeaturePermissionAction } from '@/lib/actions/plan'
import type { FeaturePermission, ModuleCode } from '@/lib/models/plan/feature-permissions'

export interface FeatureGuardResult {
  allowed: boolean
  error?: string
}

export async function requireFeaturePermission(
  businessAccountId: string,
  module: ModuleCode,
  feature: FeaturePermission
): Promise<FeatureGuardResult> {
  const hasPermission = await checkFeaturePermissionAction(
    businessAccountId,
    module,
    feature
  )

  if (!hasPermission) {
    return {
      allowed: false,
      error: `Esta función requiere un plan superior. Por favor actualiza tu plan para acceder a esta funcionalidad.`,
    }
  }

  return { allowed: true }
}

export async function validateFeatureAccess(
  businessAccountId: string | undefined,
  module: ModuleCode,
  feature: FeaturePermission
): Promise<{ success: boolean; error?: string }> {
  if (!businessAccountId) {
    return {
      success: false,
      error: 'No se pudo verificar el acceso. Business account no encontrado.',
    }
  }

  const result = await requireFeaturePermission(businessAccountId, module, feature)

  if (!result.allowed) {
    return {
      success: false,
      error: result.error,
    }
  }

  return { success: true }
}
