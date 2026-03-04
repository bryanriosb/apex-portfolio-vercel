'use server'

import {
  getAllRecords,
  getRecordById,
  insertRecord,
  updateRecord,
  deleteRecord,
  deleteRecords,
  getSupabaseAdminClient,
} from '@/lib/actions/supabase'

import type {
  Plan,
  PlanInsert,
  PlanUpdate,
  PlanModule,
  PlanModuleInsert,
  PlanModuleAccess,
  PlanModuleAccessInsert,
  PlanModuleAccessUpdate,
  PlanWithModules,
  PlanStatus,
} from '@/lib/models/plan/plan'
import type { FeaturePermission } from '@/lib/models/plan/feature-permissions'

export interface PlanListResponse {
  data: Plan[]
  total: number
  total_pages: number
}

export async function fetchPlansAction(params?: {
  page?: number
  page_size?: number
  status?: PlanStatus | PlanStatus[]
  name?: string
}): Promise<PlanListResponse> {
  try {
    const plans = await getAllRecords<Plan>('plans', {
      order: { column: 'sort_order', ascending: true },
    })

    let filteredPlans = plans

    if (params?.status) {
      const statusValues = Array.isArray(params.status)
        ? params.status
        : [params.status]
      filteredPlans = filteredPlans.filter((plan) =>
        statusValues.includes(plan.status)
      )
    }

    if (params?.name) {
      const searchTerm = params.name.toLowerCase()
      filteredPlans = filteredPlans.filter((plan) =>
        plan.name.toLowerCase().includes(searchTerm)
      )
    }

    const page = params?.page || 1
    const pageSize = params?.page_size || 20
    const start = (page - 1) * pageSize
    const end = start + pageSize

    const paginatedData = filteredPlans.slice(start, end)
    const totalPages = Math.ceil(filteredPlans.length / pageSize)

    return {
      data: paginatedData,
      total: filteredPlans.length,
      total_pages: totalPages,
    }
  } catch (error) {
    console.error('Error fetching plans:', error)
    return {
      data: [],
      total: 0,
      total_pages: 0,
    }
  }
}

export async function fetchActivePlansAction(): Promise<Plan[]> {
  try {
    const client = await getSupabaseAdminClient()
    const { data, error } = await client
      .from('plans')
      .select('*')
      .eq('status', 'active')
      .order('sort_order', { ascending: true })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching active plans:', error)
    return []
  }
}

export async function getPlanByIdAction(id: string): Promise<Plan | null> {
  try {
    return await getRecordById<Plan>('plans', id)
  } catch (error) {
    console.error('Error fetching plan:', error)
    return null
  }
}

export async function getPlanByCodeAction(code: string): Promise<Plan | null> {
  try {
    const client = await getSupabaseAdminClient()
    const { data, error } = await client
      .from('plans')
      .select('*')
      .eq('code', code)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }
    return data
  } catch (error) {
    console.error('Error fetching plan by code:', error)
    return null
  }
}

export async function getPlanWithModulesAction(
  id: string
): Promise<PlanWithModules | null> {
  try {
    const client = await getSupabaseAdminClient()
    const { data, error } = await client
      .from('plans')
      .select(
        `
        *,
        modules:plan_module_access(
          *,
          module:plan_modules(*)
        )
      `
      )
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching plan with modules:', error)
    return null
  }
}

export async function createPlanAction(
  data: PlanInsert
): Promise<{ success: boolean; data?: Plan; error?: string }> {
  try {
    const existing = await getPlanByCodeAction(data.code)
    if (existing) {
      return { success: false, error: 'Ya existe un plan con este código' }
    }

    const plan = await insertRecord<Plan>('plans', {
      ...data,
      status: data.status || 'active',
      sort_order: data.sort_order || 0,
    })

    if (!plan) {
      return { success: false, error: 'Error al crear el plan' }
    }

    return { success: true, data: plan }
  } catch (error: any) {
    console.error('Error creating plan:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}

export async function updatePlanAction(
  id: string,
  data: PlanUpdate
): Promise<{ success: boolean; data?: Plan; error?: string }> {
  try {
    if (data.code) {
      const existing = await getPlanByCodeAction(data.code)
      if (existing && existing.id !== id) {
        return { success: false, error: 'Ya existe un plan con este código' }
      }
    }

    const plan = await updateRecord<Plan>('plans', id, data)

    if (!plan) {
      return { success: false, error: 'Error al actualizar el plan' }
    }

    return { success: true, data: plan }
  } catch (error: any) {
    console.error('Error updating plan:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}

export async function deletePlanAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = await getSupabaseAdminClient()

    const { data: usageCount } = await client
      .from('business_accounts')
      .select('id', { count: 'exact' })
      .eq('plan_id', id)

    if (usageCount && usageCount.length > 0) {
      return {
        success: false,
        error: 'No se puede eliminar un plan que está siendo usado por cuentas',
      }
    }

    await client.from('plan_module_access').delete().eq('plan_id', id)
    await deleteRecord('plans', id)

    return { success: true }
  } catch (error: any) {
    console.error('Error deleting plan:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}

export async function deletePlansAction(
  ids: string[]
): Promise<{ success: boolean; deletedCount: number; error?: string }> {
  try {
    const client = await getSupabaseAdminClient()

    const { data: usageData } = await client
      .from('business_accounts')
      .select('plan_id')
      .in('plan_id', ids)

    if (usageData && usageData.length > 0) {
      const usedPlanIds = [...new Set(usageData.map((d) => d.plan_id))]
      return {
        success: false,
        deletedCount: 0,
        error: `No se pueden eliminar planes en uso (${usedPlanIds.length} plan(es) tienen cuentas asociadas)`,
      }
    }

    await client.from('plan_module_access').delete().in('plan_id', ids)
    return await deleteRecords('plans', ids)
  } catch (error: any) {
    console.error('Error batch deleting plans:', error)
    return { success: false, deletedCount: 0, error: error.message }
  }
}

// === PLAN MODULES ACTIONS ===

export async function fetchPlanModulesAction(): Promise<PlanModule[]> {
  try {
    return await getAllRecords<PlanModule>('plan_modules', {
      order: { column: 'name', ascending: true },
    })
  } catch (error) {
    console.error('Error fetching plan modules:', error)
    return []
  }
}

export async function fetchActivePlanModulesAction(): Promise<PlanModule[]> {
  try {
    const client = await getSupabaseAdminClient()
    const { data, error } = await client
      .from('plan_modules')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching active plan modules:', error)
    return []
  }
}

export async function createPlanModuleAction(
  data: PlanModuleInsert
): Promise<{ success: boolean; data?: PlanModule; error?: string }> {
  try {
    const module = await insertRecord<PlanModule>('plan_modules', {
      ...data,
      is_active: data.is_active ?? true,
    })

    if (!module) {
      return { success: false, error: 'Error al crear el módulo' }
    }

    return { success: true, data: module }
  } catch (error: any) {
    console.error('Error creating plan module:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}

export async function updatePlanModuleAction(
  id: string,
  data: Partial<PlanModuleInsert>
): Promise<{ success: boolean; data?: PlanModule; error?: string }> {
  try {
    const module = await updateRecord<PlanModule>('plan_modules', id, data)

    if (!module) {
      return { success: false, error: 'Error al actualizar el módulo' }
    }

    return { success: true, data: module }
  } catch (error: any) {
    console.error('Error updating plan module:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}

export async function deletePlanModuleAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = await getSupabaseAdminClient()
    await client.from('plan_module_access').delete().eq('module_id', id)
    await deleteRecord('plan_modules', id)
    return { success: true }
  } catch (error: any) {
    console.error('Error deleting plan module:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}

// === PLAN MODULE ACCESS ACTIONS ===

export async function fetchPlanModuleAccessAction(
  planId: string
): Promise<(PlanModuleAccess & { module: PlanModule })[]> {
  try {
    const client = await getSupabaseAdminClient()
    const { data, error } = await client
      .from('plan_module_access')
      .select('*, module:plan_modules(*)')
      .eq('plan_id', planId)

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching plan module access:', error)
    return []
  }
}

export async function setPlanModuleAccessAction(
  planId: string,
  moduleAccess: PlanModuleAccessInsert[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = await getSupabaseAdminClient()

    await client.from('plan_module_access').delete().eq('plan_id', planId)

    if (moduleAccess.length > 0) {
      const accessData = moduleAccess.map((access) => ({
        plan_id: planId,
        module_id: access.module_id,
        can_read: access.can_read ?? true,
        can_write: access.can_write ?? true,
        can_delete: access.can_delete ?? true,
        custom_permissions: access.custom_permissions ?? null,
        features_metadata: access.features_metadata ?? null,
      }))

      const { error } = await client.from('plan_module_access').insert(accessData)
      if (error) throw error
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error setting plan module access:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}

export async function updatePlanModuleAccessAction(
  id: string,
  data: PlanModuleAccessUpdate
): Promise<{ success: boolean; error?: string }> {
  try {
    await updateRecord('plan_module_access', id, data)
    return { success: true }
  } catch (error: any) {
    console.error('Error updating plan module access:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}

// === UTILITY ACTIONS ===

export async function checkPlanFeatureAction(
  businessAccountId: string,
  feature: string
): Promise<boolean> {
  try {
    const client = await getSupabaseAdminClient()
    const { data: account, error } = await client
      .from('business_accounts')
      .select('plan_id')
      .eq('id', businessAccountId)
      .single()

    if (error || !account?.plan_id) return false

    const plan = await getPlanByIdAction(account.plan_id)
    if (!plan) return false

    return plan.features[feature] === true
  } catch (error) {
    console.error('Error checking plan feature:', error)
    return false
  }
}

export async function checkPlanModuleAccessAction(
  businessAccountId: string,
  moduleCode: string
): Promise<{ hasAccess: boolean; canRead: boolean; canWrite: boolean; canDelete: boolean }> {
  const noAccess = { hasAccess: false, canRead: false, canWrite: false, canDelete: false }

  try {
    const client = await getSupabaseAdminClient()
    const { data: account, error: accountError } = await client
      .from('business_accounts')
      .select('plan_id')
      .eq('id', businessAccountId)
      .single()

    if (accountError || !account?.plan_id) return noAccess

    const { data: moduleAccess, error: accessError } = await client
      .from('plan_module_access')
      .select('*, module:plan_modules!inner(*)')
      .eq('plan_id', account.plan_id)
      .eq('module.code', moduleCode)
      .single()

    if (accessError || !moduleAccess) return noAccess

    return {
      hasAccess: true,
      canRead: moduleAccess.can_read,
      canWrite: moduleAccess.can_write,
      canDelete: moduleAccess.can_delete,
    }
  } catch (error) {
    console.error('Error checking plan module access:', error)
    return noAccess
  }
}

export async function getAllModuleAccessAction(
  businessAccountId: string
): Promise<Record<string, boolean>> {
  try {
    const client = await getSupabaseAdminClient()

    // Obtener la cuenta con el plan y el tipo de negocio
    const { data: account, error: accountError } = await client
      .from('business_accounts')
      .select('plan_id, subscription_plan')
      .eq('id', businessAccountId)
      .single()

    if (accountError || !account) return {}

    // NOTA: Eliminadas validaciones por tipo de negocio y plan de suscripción
    // Ahora el sistema es 100% dependiente de plan_module_access

    // Si hay un plan_id, obtener el acceso basado en el plan
    let planModuleAccess: Record<string, boolean> = {}
    if (account.plan_id) {
      const { data: moduleAccessList } = await client
        .from('plan_module_access')
        .select('*, module:plan_modules!inner(code)')
        .eq('plan_id', account.plan_id)

      if (moduleAccessList) {
        planModuleAccess = moduleAccessList.reduce((acc, access) => {
          const moduleCode = (access.module as any)?.code
          if (moduleCode) {
            acc[moduleCode] = true
          }
          return acc
        }, {} as Record<string, boolean>)
      }
    }

    // SISTEMA SIMPLIFICADO: Solo depender de plan_module_access
    // Si un módulo está en plan_module_access = accesible
    // Si un módulo NO está en plan_module_access = no accesible
    // Eliminadas validaciones hardcodeadas por tipo de negocio/plan

    const finalAccess: Record<string, boolean> = {}

    // Solo incluir módulos que están explícitamente en plan_module_access
    // Los módulos que NO están en la tabla = no accesibles
    Object.keys(planModuleAccess).forEach(moduleKey => {
      finalAccess[moduleKey] = planModuleAccess[moduleKey]
    })

    return finalAccess
  } catch (error) {
    console.error('Error getting all module access:', error)
    return {}
  }
}

// === PLAN ASSIGNMENT ACTIONS ===

export interface BusinessAccountWithPlan {
  id: string
  company_name: string
  contact_name: string
  contact_email: string
  status: string
  plan_id: string | null
  plan: Plan | null
  created_at: string
}

export interface PlanAssignmentListResponse {
  data: BusinessAccountWithPlan[]
  total: number
  total_pages: number
}

export async function fetchBusinessAccountsWithPlansAction(params?: {
  page?: number
  page_size?: number
  company_name?: string
  plan_id?: string | string[]
  has_plan?: 'yes' | 'no'
}): Promise<PlanAssignmentListResponse> {
  try {
    const client = await getSupabaseAdminClient()

    const { data: accounts, error } = await client
      .from('business_accounts')
      .select('id, company_name, contact_name, contact_email, status, plan_id, created_at')
      .order('company_name', { ascending: true })

    if (error) throw error

    let filteredAccounts = accounts || []

    if (params?.company_name) {
      const searchTerm = params.company_name.toLowerCase()
      filteredAccounts = filteredAccounts.filter((acc) =>
        acc.company_name.toLowerCase().includes(searchTerm)
      )
    }

    if (params?.plan_id) {
      const planIds = Array.isArray(params.plan_id) ? params.plan_id : [params.plan_id]
      filteredAccounts = filteredAccounts.filter(
        (acc) => acc.plan_id && planIds.includes(acc.plan_id)
      )
    }

    if (params?.has_plan === 'yes') {
      filteredAccounts = filteredAccounts.filter((acc) => acc.plan_id !== null)
    } else if (params?.has_plan === 'no') {
      filteredAccounts = filteredAccounts.filter((acc) => acc.plan_id === null)
    }

    const plans = await getAllRecords<Plan>('plans', {
      order: { column: 'name', ascending: true },
    })
    const plansMap = new Map(plans.map((p) => [p.id, p]))

    const accountsWithPlans: BusinessAccountWithPlan[] = filteredAccounts.map((acc) => ({
      ...acc,
      plan: acc.plan_id ? plansMap.get(acc.plan_id) || null : null,
    }))

    const page = params?.page || 1
    const pageSize = params?.page_size || 20
    const start = (page - 1) * pageSize
    const end = start + pageSize

    const paginatedData = accountsWithPlans.slice(start, end)
    const totalPages = Math.ceil(accountsWithPlans.length / pageSize)

    return {
      data: paginatedData,
      total: accountsWithPlans.length,
      total_pages: totalPages,
    }
  } catch (error) {
    console.error('Error fetching business accounts with plans:', error)
    return {
      data: [],
      total: 0,
      total_pages: 0,
    }
  }
}

export async function assignPlanToAccountAction(
  accountId: string,
  planId: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = await getSupabaseAdminClient()

    if (planId) {
      const plan = await getPlanByIdAction(planId)
      if (!plan) {
        return { success: false, error: 'El plan seleccionado no existe' }
      }
      if (plan.status !== 'active') {
        return { success: false, error: 'Solo se pueden asignar planes activos' }
      }
    }

    const { error } = await client
      .from('business_accounts')
      .update({ plan_id: planId })
      .eq('id', accountId)

    if (error) throw error

    return { success: true }
  } catch (error: any) {
    console.error('Error assigning plan to account:', error)
    return { success: false, error: error.message || 'Error al asignar el plan' }
  }
}

export async function bulkAssignPlanToAccountsAction(
  accountIds: string[],
  planId: string | null
): Promise<{ success: boolean; updatedCount: number; error?: string }> {
  if (!accountIds.length) {
    return { success: true, updatedCount: 0 }
  }

  try {
    const client = await getSupabaseAdminClient()

    if (planId) {
      const plan = await getPlanByIdAction(planId)
      if (!plan) {
        return { success: false, updatedCount: 0, error: 'El plan seleccionado no existe' }
      }
      if (plan.status !== 'active') {
        return { success: false, updatedCount: 0, error: 'Solo se pueden asignar planes activos' }
      }
    }

    const { error } = await client
      .from('business_accounts')
      .update({ plan_id: planId })
      .in('id', accountIds)

    if (error) throw error

    return { success: true, updatedCount: accountIds.length }
  } catch (error: any) {
    console.error('Error bulk assigning plan to accounts:', error)
    return { success: false, updatedCount: 0, error: error.message || 'Error al asignar el plan' }
  }
}

export async function checkFeaturePermissionAction(
  businessAccountId: string,
  moduleCode: string,
  featureKey: FeaturePermission
): Promise<boolean> {
  try {
    const client = await getSupabaseAdminClient()

    const { data, error } = await client
      .from('business_accounts')
      .select(`
        plan_id,
        plan:plans!inner(
          id,
          code,
          module_access:plan_module_access!inner(
            custom_permissions,
            module:plan_modules!inner(code)
          )
        )
      `)
      .eq('id', businessAccountId)
      .single()

    if (error || !data?.plan_id) return false

    const plan = data.plan as any
    if (!plan?.module_access) return false

    const moduleAccess = plan.module_access.find(
      (ma: any) => ma.module?.code === moduleCode
    )

    // Check custom permissions first
    if (moduleAccess?.custom_permissions?.[featureKey] === true) {
      return true
    }

    // If custom permissions is false or not set, check plan's metadata in DB
    const planMetadata = moduleAccess?.features_metadata?.[featureKey]
    if (planMetadata?.requiredPlan?.includes(plan.code)) {
      return true
    }

    return false
  } catch (error) {
    console.error('Error checking feature permission:', error)
    return false
  }
}

export async function getAllFeaturePermissionsAction(
  businessAccountId: string,
  moduleCode: string
): Promise<Record<string, boolean>> {
  try {
    const client = await getSupabaseAdminClient()

    const { data, error } = await client
      .from('business_accounts')
      .select(`
        plan_id,
        plan:plans!inner(
          id,
          module_access:plan_module_access!inner(
            custom_permissions,
            module:plan_modules!inner(code)
          )
        )
      `)
      .eq('id', businessAccountId)
      .single()

    if (error || !data?.plan_id) return {}

    const plan = data.plan as any
    if (!plan?.module_access) return {}

    const moduleAccess = plan.module_access.find(
      (ma: any) => ma.module?.code === moduleCode
    )

    return moduleAccess?.custom_permissions || {}
  } catch (error) {
    console.error('Error getting all feature permissions:', error)
    return {}
  }
}

export async function getFeatureMetadataAction(
  businessAccountId: string,
  moduleCode: string,
  featureKey: string
): Promise<{
  name: string
  description: string
  requiredPlan: string[]
} | null> {
  try {
    const client = await getSupabaseAdminClient()

    const { data, error } = await client
      .from('business_accounts')
      .select(`
        plan_id,
        plan:plans!inner(
          id,
          module_access:plan_module_access!inner(
            features_metadata,
            module:plan_modules!inner(code)
          )
        )
      `)
      .eq('id', businessAccountId)
      .single()

    if (error || !data?.plan_id) return null

    const plan = data.plan as any
    if (!plan?.module_access) return null

    const moduleAccess = plan.module_access.find(
      (ma: any) => ma.module?.code === moduleCode
    )

    if (!moduleAccess?.features_metadata) return null

    const metadata = moduleAccess.features_metadata[featureKey]
    if (!metadata) return null

    return {
      name: metadata.name || featureKey,
      description: metadata.description || '',
      requiredPlan: metadata.requiredPlan || [],
    }
  } catch (error) {
    console.error('Error getting feature metadata:', error)
    return null
  }
}
