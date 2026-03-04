'use server'

import { getSupabaseAdminClient } from '@/lib/actions/supabase'
import type { PlanLimits } from '@/lib/store/unified-permissions-store'

interface UnifiedPermissionsData {
  planId: string | null
  planCode: string | null
  moduleAccess: Record<string, boolean>
  featurePermissions: Record<string, Record<string, boolean>>
  featureMetadata: Record<string, Record<string, any>>
  planLimits: PlanLimits | null
  currentUsage: {
    appointments_per_month: number
    products: number
    services: number
    customers: number
    specialists: number
    users: number
    businesses: number
  }
}

async function getCurrentUsageCounts(businessAccountId: string) {
  const client = await getSupabaseAdminClient()
  
  // Obtener todos los conteos en paralelo para mejor performance
  const [
    appointmentsResult,
    productsResult,
    servicesResult,
    customersResult,
    specialistsResult,
    usersResult,
    businessesResult
  ] = await Promise.all([
    client
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessAccountId),
    client
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessAccountId),
    client
      .from('services')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessAccountId),
    client
      .from('business_customers')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessAccountId),
    client
      .from('specialists')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessAccountId),
    client
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessAccountId),
    client
      .from('businesses')
      .select('id', { count: 'exact', head: true })
      .eq('business_account_id', businessAccountId)
  ])
  
  return {
    appointments_per_month: appointmentsResult.count || 0,
    products: productsResult.count || 0,
    services: servicesResult.count || 0,
    customers: customersResult.count || 0,
    specialists: specialistsResult.count || 0,
    users: usersResult.count || 0,
    businesses: businessesResult.count || 0,
  }
}

export async function getUnifiedPermissionsAction(
  businessAccountId: string
): Promise<UnifiedPermissionsData> {
  try {
    const client = await getSupabaseAdminClient()

    // Query única que obtiene TODO lo necesario
    const { data, error } = await client
      .from('business_accounts')
      .select(`
        plan_id,
        plan:plans(
          id,
          code,
          features,
          max_businesses,
          max_users_per_business,
          max_specialists_per_business,
          module_access:plan_module_access(
            can_read,
            can_write,
            can_delete,
            custom_permissions,
            features_metadata,
            module:plan_modules(code)
          )
        )
      `)
      .eq('id', businessAccountId)
      .single()

    if (error) {
      console.error('Error fetching unified permissions:', error)
      throw new Error(`Failed to fetch permissions: ${error.message}`)
    }

    if (!data) {
      throw new Error('Business account not found')
    }

    // Procesar datos
    const plan = data.plan as any
    const moduleAccess: Record<string, boolean> = {}
    const featurePermissions: Record<string, Record<string, boolean>> = {}
    const featureMetadata: Record<string, Record<string, any>> = {}

    if (plan?.module_access) {
      for (const access of plan.module_access) {
        const moduleCode = (access.module as any)?.code
        if (moduleCode) {
          // Módulo accesible si tiene can_read
          moduleAccess[moduleCode] = access.can_read === true

          // Permisos de features personalizados
          if (access.custom_permissions) {
            featurePermissions[moduleCode] = { ...access.custom_permissions }
          }

          // Metadata de features
          if (access.features_metadata) {
            featureMetadata[moduleCode] = { ...access.features_metadata }
          }
        }
      }
    }

    // Procesar límites del plan
    const planLimits: PlanLimits | null = plan ? {
      max_appointments_per_month: plan.features?.max_appointments_per_month || null,
      max_products: plan.features?.max_products || null,
      max_services: plan.features?.max_services || null,
      max_customers: plan.features?.max_customers || null,
      max_storage_mb: plan.features?.max_storage_mb || null,
      max_businesses: plan.max_businesses,
      max_users_per_business: plan.max_users_per_business,
      max_specialists_per_business: plan.max_specialists_per_business,
    } : null

    // Obtener conteos actuales
    const currentUsage = await getCurrentUsageCounts(businessAccountId)

    return {
      planId: plan?.id || null,
      planCode: plan?.code || null,
      moduleAccess,
      featurePermissions,
      featureMetadata,
      planLimits,
      currentUsage,
    }
  } catch (error) {
    console.error('Error in getUnifiedPermissionsAction:', error)
    throw error
  }
}