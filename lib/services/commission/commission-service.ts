import {
  fetchCommissionConfigsAction,
  getCommissionConfigByIdAction,
  createCommissionConfigAction,
  updateCommissionConfigAction,
  deleteCommissionConfigAction,
  getDefaultCommissionConfigAction,
  fetchSpecialistCommissionsAction,
  createSpecialistCommissionAction,
  updateSpecialistCommissionAction,
  bulkUpdateCommissionStatusAction,
  getCommissionSummaryAction,
  calculateAndCreateCommissionAction,
  type CommissionConfigListResponse,
  type SpecialistCommissionListResponse,
} from '@/lib/actions/commission'
import type {
  CommissionConfig,
  CommissionConfigInsert,
  CommissionConfigUpdate,
  CommissionConfigWithSpecialist,
} from '@/lib/models/commission/commission-config'
import type {
  SpecialistCommission,
  SpecialistCommissionUpdate,
  CommissionSummary,
  CommissionStatus,
} from '@/lib/models/commission/specialist-commission'

export default class CommissionService {
  async fetchConfigs(params?: {
    page?: number
    page_size?: number
    business_id?: string
    specialist_id?: string
    is_active?: boolean
  }): Promise<CommissionConfigListResponse> {
    return await fetchCommissionConfigsAction(params)
  }

  // Alias para usar con DataTable (espera fetchItems)
  async fetchItems(params?: {
    page?: number
    page_size?: number
    business_id?: string
    specialist_id?: string
    status?: CommissionStatus[]
    start_date?: string
    end_date?: string
  }): Promise<SpecialistCommissionListResponse> {
    return await fetchSpecialistCommissionsAction(params)
  }

  async getConfigById(id: string): Promise<CommissionConfigWithSpecialist | null> {
    return await getCommissionConfigByIdAction(id)
  }

  async createConfig(
    data: CommissionConfigInsert
  ): Promise<{ success: boolean; data?: CommissionConfig; error?: string }> {
    return await createCommissionConfigAction(data)
  }

  async updateConfig(
    id: string,
    data: CommissionConfigUpdate
  ): Promise<{ success: boolean; data?: CommissionConfig; error?: string }> {
    return await updateCommissionConfigAction(id, data)
  }

  async deleteConfig(id: string): Promise<{ success: boolean; error?: string }> {
    return await deleteCommissionConfigAction(id)
  }

  async getDefaultConfig(
    businessId: string,
    specialistId?: string
  ): Promise<CommissionConfig | null> {
    return await getDefaultCommissionConfigAction(businessId, specialistId)
  }

  async fetchCommissions(params?: {
    page?: number
    page_size?: number
    business_id?: string
    specialist_id?: string
    status?: CommissionStatus[]
    start_date?: string
    end_date?: string
  }): Promise<SpecialistCommissionListResponse> {
    return await fetchSpecialistCommissionsAction(params)
  }

  async updateCommission(
    id: string,
    data: SpecialistCommissionUpdate
  ): Promise<{ success: boolean; data?: SpecialistCommission; error?: string }> {
    return await updateSpecialistCommissionAction(id, data)
  }

  async bulkUpdateStatus(
    ids: string[],
    status: CommissionStatus
  ): Promise<{ success: boolean; updatedCount: number; error?: string }> {
    return await bulkUpdateCommissionStatusAction(ids, status)
  }

  async getSummary(params: {
    business_id: string
    start_date?: string
    end_date?: string
  }): Promise<CommissionSummary[]> {
    return await getCommissionSummaryAction(params)
  }

  async calculateForAppointment(
    appointmentId: string,
    businessId: string,
    specialistId: string
  ): Promise<{ success: boolean; data?: SpecialistCommission; error?: string }> {
    return await calculateAndCreateCommissionAction(appointmentId, businessId, specialistId)
  }
}
