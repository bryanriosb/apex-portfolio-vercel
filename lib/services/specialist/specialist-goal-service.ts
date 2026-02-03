import {
  fetchSpecialistGoalsAction,
  getActiveGoalForSpecialistAction,
  getActiveGoalsForBusinessAction,
  createSpecialistGoalAction,
  updateSpecialistGoalAction,
  deleteSpecialistGoalAction,
  getGoalByIdAction,
} from '@/lib/actions/specialist-goal'
import type {
  SpecialistGoal,
  SpecialistGoalInsert,
  SpecialistGoalUpdate,
} from '@/lib/models/specialist/specialist-goal'

export default class SpecialistGoalService {
  async fetchGoals(params: {
    business_id: string
    specialist_id?: string
    is_active?: boolean
  }): Promise<SpecialistGoal[]> {
    return fetchSpecialistGoalsAction(params)
  }

  async getActiveGoal(specialistId: string): Promise<SpecialistGoal | null> {
    return getActiveGoalForSpecialistAction(specialistId)
  }

  async getActiveGoalsForBusiness(businessId: string): Promise<SpecialistGoal[]> {
    return getActiveGoalsForBusinessAction(businessId)
  }

  async getById(id: string): Promise<SpecialistGoal | null> {
    return getGoalByIdAction(id)
  }

  async create(
    data: SpecialistGoalInsert
  ): Promise<{ success: boolean; data?: SpecialistGoal; error?: string }> {
    return createSpecialistGoalAction(data)
  }

  async update(
    id: string,
    data: SpecialistGoalUpdate
  ): Promise<{ success: boolean; data?: SpecialistGoal; error?: string }> {
    return updateSpecialistGoalAction(id, data)
  }

  async delete(id: string): Promise<{ success: boolean; error?: string }> {
    return deleteSpecialistGoalAction(id)
  }
}
