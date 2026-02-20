import {
  fetchThresholdsAction,
  createThresholdAction,
  updateThresholdAction,
  deleteThresholdAction,
  getThresholdByIdAction,
  getThresholdForDaysAction,
  reorderThresholdsAction,
  type ThresholdListResponse,
} from '@/lib/actions/collection/notification-threshold'
import type {
  NotificationThreshold,
  NotificationThresholdInsert,
  NotificationThresholdUpdate,
} from '@/lib/models/collection/notification-threshold'

export interface ThresholdServiceParams {
  business_account_id: string
}

/**
 * Service for Notification Thresholds compatible with DataTable pattern
 */
export const NotificationThresholdService = {
  async fetchThresholds(
    businessId: string
  ): Promise<ThresholdListResponse> {
    return await fetchThresholdsAction(businessId)
  },

  async getThreshold(id: string): Promise<NotificationThreshold> {
    const threshold = await getThresholdByIdAction(id)
    if (!threshold) {
      throw new Error('Umbral no encontrado')
    }
    return threshold
  },

  async createThreshold(
    data: NotificationThresholdInsert
  ): Promise<NotificationThreshold> {
    const result = await createThresholdAction(data)
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Error al crear el umbral')
    }
    return result.data
  },

  async updateThreshold(
    id: string,
    data: NotificationThresholdUpdate,
    businessAccountId: string
  ): Promise<NotificationThreshold> {
    const result = await updateThresholdAction(id, data, businessAccountId)
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Error al actualizar el umbral')
    }
    return result.data
  },

  async deleteThreshold(id: string): Promise<void> {
    const result = await deleteThresholdAction(id)
    if (!result.success) {
      throw new Error(result.error || 'Error al eliminar el umbral')
    }
  },

  async getThresholdForDays(
    businessId: string,
    daysOverdue: number
  ): Promise<NotificationThreshold | null> {
    const threshold = await getThresholdForDaysAction(businessId, daysOverdue)
    console.log('[ThresholdService] getThresholdForDays result:', {
      daysOverdue,
      thresholdId: threshold?.id,
      daysFrom: threshold?.days_from,
      daysTo: threshold?.days_to,
      hasTemplate: !!threshold?.email_template
    })
    return threshold
  },

  async reorderThresholds(thresholdIds: string[]): Promise<void> {
    const result = await reorderThresholdsAction(thresholdIds)
    if (!result.success) {
      throw new Error(result.error || 'Error al reordenar umbrales')
    }
  },

  /**
   * Batch process clients to assign thresholds and templates
   */
  async processClientsWithThresholds(params: {
    clients: any[]
    business_id: string
  }): Promise<
    {
      client: any
      threshold: NotificationThreshold | null
    }[]
  > {
    const results = []

    for (const client of params.clients) {
      const daysOverdue = client.custom_data?.total_days_overdue || 0
      const threshold = await this.getThresholdForDays(
        params.business_id,
        daysOverdue
      )

      results.push({ client, threshold })
    }

    return results
  },
}
