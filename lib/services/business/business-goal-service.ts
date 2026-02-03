import {
  fetchBusinessGoalsAction,
  getActiveBusinessGoalAction,
  createBusinessGoalAction,
  updateBusinessGoalAction,
  deleteBusinessGoalAction,
  getBusinessGoalWithContributionsAction,
  recalculateBusinessGoalProgressAction,
} from '@/lib/actions/business-goal'
import type {
  BusinessGoal,
  BusinessGoalInsert,
  BusinessGoalUpdate,
  BusinessGoalWithContributions,
} from '@/lib/models/business/business-goal'

export default class BusinessGoalService {
  async fetchGoals(params: {
    business_id: string
    is_active?: boolean
  }): Promise<{ success: boolean; data: BusinessGoal[]; error?: string }> {
    return fetchBusinessGoalsAction(params)
  }

  async getActiveGoal(businessId: string): Promise<BusinessGoal | null> {
    return getActiveBusinessGoalAction(businessId)
  }

  async create(
    data: BusinessGoalInsert
  ): Promise<{ success: boolean; data?: BusinessGoal; error?: string }> {
    return createBusinessGoalAction(data)
  }

  async update(
    id: string,
    data: BusinessGoalUpdate
  ): Promise<{ success: boolean; data?: BusinessGoal; error?: string }> {
    return updateBusinessGoalAction(id, data)
  }

  async delete(id: string): Promise<{ success: boolean; error?: string }> {
    return deleteBusinessGoalAction(id)
  }

  async getWithContributions(
    goalId: string
  ): Promise<{ success: boolean; data?: BusinessGoalWithContributions; error?: string }> {
    return getBusinessGoalWithContributionsAction(goalId)
  }

  async recalculateProgress(
    goalId: string
  ): Promise<{ success: boolean; data?: BusinessGoal; error?: string }> {
    return recalculateBusinessGoalProgressAction(goalId)
  }
}
