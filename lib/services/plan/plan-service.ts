import {
  fetchPlansAction,
  fetchActivePlansAction,
  getPlanByIdAction,
  getPlanByCodeAction,
  getPlanWithModulesAction,
  createPlanAction,
  updatePlanAction,
  deletePlanAction,
  deletePlansAction,
  fetchPlanModulesAction,
  fetchActivePlanModulesAction,
  createPlanModuleAction,
  updatePlanModuleAction,
  deletePlanModuleAction,
  fetchPlanModuleAccessAction,
  setPlanModuleAccessAction,
  checkPlanFeatureAction,
  checkPlanModuleAccessAction,
  fetchBusinessAccountsWithPlansAction,
  assignPlanToAccountAction,
  bulkAssignPlanToAccountsAction,
  type BusinessAccountWithPlan,
  type PlanAssignmentListResponse,
} from '@/lib/actions/plan'
import type {
  Plan,
  PlanInsert,
  PlanUpdate,
  PlanModule,
  PlanModuleInsert,
  PlanModuleAccess,
  PlanModuleAccessInsert,
  PlanWithModules,
  PlanStatus,
} from '@/lib/models/plan/plan'

export interface PlanListResponse {
  data: Plan[]
  total: number
  total_pages: number
}

export default class PlanService {
  async fetchItems(params?: {
    page?: number
    page_size?: number
    status?: PlanStatus | PlanStatus[]
    name?: string
  }): Promise<PlanListResponse> {
    try {
      return await fetchPlansAction(params)
    } catch (error) {
      console.error('Error fetching plans:', error)
      throw error
    }
  }

  async fetchActivePlans(): Promise<Plan[]> {
    try {
      return await fetchActivePlansAction()
    } catch (error) {
      console.error('Error fetching active plans:', error)
      throw error
    }
  }

  async getById(id: string): Promise<Plan | null> {
    try {
      return await getPlanByIdAction(id)
    } catch (error) {
      console.error('Error fetching plan by ID:', error)
      throw error
    }
  }

  async getByCode(code: string): Promise<Plan | null> {
    try {
      return await getPlanByCodeAction(code)
    } catch (error) {
      console.error('Error fetching plan by code:', error)
      throw error
    }
  }

  async getWithModules(id: string): Promise<PlanWithModules | null> {
    try {
      return await getPlanWithModulesAction(id)
    } catch (error) {
      console.error('Error fetching plan with modules:', error)
      throw error
    }
  }

  async createItem(
    data: PlanInsert
  ): Promise<{ success: boolean; data?: Plan; error?: string }> {
    try {
      return await createPlanAction(data)
    } catch (error: any) {
      console.error('Error creating plan:', error)
      throw error
    }
  }

  async updateItem(
    data: Plan | Partial<Plan>
  ): Promise<{ success: boolean; data?: Plan; error?: string }> {
    try {
      if (!data.id) {
        throw new Error('Plan ID is required for update')
      }
      return await updatePlanAction(data.id, data)
    } catch (error: any) {
      console.error('Error updating plan:', error)
      throw error
    }
  }

  async destroyItem(id: string): Promise<void> {
    try {
      const result = await deletePlanAction(id)
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete plan')
      }
    } catch (error) {
      console.error('Error deleting plan:', error)
      throw error
    }
  }

  async destroyMany(
    ids: string[]
  ): Promise<{ success: boolean; deletedCount: number; error?: string }> {
    try {
      return await deletePlansAction(ids)
    } catch (error: any) {
      console.error('Error batch deleting plans:', error)
      return { success: false, deletedCount: 0, error: error.message }
    }
  }

  // Module methods
  async fetchModules(): Promise<PlanModule[]> {
    try {
      return await fetchPlanModulesAction()
    } catch (error) {
      console.error('Error fetching plan modules:', error)
      throw error
    }
  }

  async fetchActiveModules(): Promise<PlanModule[]> {
    try {
      return await fetchActivePlanModulesAction()
    } catch (error) {
      console.error('Error fetching active plan modules:', error)
      throw error
    }
  }

  async createModule(
    data: PlanModuleInsert
  ): Promise<{ success: boolean; data?: PlanModule; error?: string }> {
    try {
      return await createPlanModuleAction(data)
    } catch (error: any) {
      console.error('Error creating plan module:', error)
      throw error
    }
  }

  async updateModule(
    id: string,
    data: Partial<PlanModuleInsert>
  ): Promise<{ success: boolean; data?: PlanModule; error?: string }> {
    try {
      return await updatePlanModuleAction(id, data)
    } catch (error: any) {
      console.error('Error updating plan module:', error)
      throw error
    }
  }

  async deleteModule(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      return await deletePlanModuleAction(id)
    } catch (error: any) {
      console.error('Error deleting plan module:', error)
      throw error
    }
  }

  // Module access methods
  async fetchModuleAccess(
    planId: string
  ): Promise<(PlanModuleAccess & { module: PlanModule })[]> {
    try {
      return await fetchPlanModuleAccessAction(planId)
    } catch (error) {
      console.error('Error fetching plan module access:', error)
      throw error
    }
  }

  async setModuleAccess(
    planId: string,
    moduleAccess: PlanModuleAccessInsert[]
  ): Promise<{ success: boolean; error?: string }> {
    try {
      return await setPlanModuleAccessAction(planId, moduleAccess)
    } catch (error: any) {
      console.error('Error setting plan module access:', error)
      throw error
    }
  }

  // Utility methods
  async checkFeature(
    businessAccountId: string,
    feature: string
  ): Promise<boolean> {
    try {
      return await checkPlanFeatureAction(businessAccountId, feature)
    } catch (error) {
      console.error('Error checking plan feature:', error)
      return false
    }
  }

  async checkModuleAccess(
    businessAccountId: string,
    moduleCode: string
  ): Promise<{
    hasAccess: boolean
    canRead: boolean
    canWrite: boolean
    canDelete: boolean
  }> {
    try {
      return await checkPlanModuleAccessAction(businessAccountId, moduleCode)
    } catch (error) {
      console.error('Error checking plan module access:', error)
      return { hasAccess: false, canRead: false, canWrite: false, canDelete: false }
    }
  }

  // Plan assignment methods
  async fetchAccountsWithPlans(params?: {
    page?: number
    page_size?: number
    company_name?: string
    plan_id?: string | string[]
    has_plan?: 'yes' | 'no'
  }): Promise<PlanAssignmentListResponse> {
    try {
      return await fetchBusinessAccountsWithPlansAction(params)
    } catch (error) {
      console.error('Error fetching accounts with plans:', error)
      throw error
    }
  }

  async assignPlanToAccount(
    accountId: string,
    planId: string | null
  ): Promise<{ success: boolean; error?: string }> {
    try {
      return await assignPlanToAccountAction(accountId, planId)
    } catch (error: any) {
      console.error('Error assigning plan to account:', error)
      return { success: false, error: error.message }
    }
  }

  async bulkAssignPlanToAccounts(
    accountIds: string[],
    planId: string | null
  ): Promise<{ success: boolean; updatedCount: number; error?: string }> {
    try {
      return await bulkAssignPlanToAccountsAction(accountIds, planId)
    } catch (error: any) {
      console.error('Error bulk assigning plan to accounts:', error)
      return { success: false, updatedCount: 0, error: error.message }
    }
  }
}

export type { BusinessAccountWithPlan, PlanAssignmentListResponse }
