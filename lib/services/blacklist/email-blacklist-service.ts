import {
  fetchBlacklistAction,
  removeFromBlacklistAction,
  removeManyFromBlacklistAction,
  getBlacklistStatsAction,
} from '@/lib/actions/blacklist'
import type { EmailBlacklist, BounceType } from '@/lib/models/collection/email-blacklist'

export interface BlacklistListResponse {
  data: EmailBlacklist[]
  total: number
  total_pages: number
}

export default class EmailBlacklistService {
  async fetchItems(params?: {
    page?: number
    page_size?: number
    business_id?: string
    bounce_type?: BounceType
    search?: string
  }): Promise<BlacklistListResponse> {
    try {
      if (!params?.business_id) {
        return { data: [], total: 0, total_pages: 0 }
      }

      return await fetchBlacklistAction({
        businessId: params.business_id,
        page: params.page,
        pageSize: params.page_size,
        bounceType: params.bounce_type,
        search: params.search,
      })
    } catch (error) {
      console.error('Error fetching blacklist:', error)
      return { data: [], total: 0, total_pages: 0 }
    }
  }

  async destroyItem(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      return await removeFromBlacklistAction(id)
    } catch (error: any) {
      console.error('Error removing from blacklist:', error)
      return { success: false, error: error.message }
    }
  }

  async destroyMany(
    ids: string[]
  ): Promise<{ success: boolean; deletedCount: number; error?: string }> {
    try {
      return await removeManyFromBlacklistAction(ids)
    } catch (error: any) {
      console.error('Error batch removing from blacklist:', error)
      return { success: false, deletedCount: 0, error: error.message }
    }
  }

  async getStats(businessId: string): Promise<{
    total: number
    hard_bounces: number
    soft_bounces: number
    complaints: number
    last_30_days: number
  }> {
    try {
      return await getBlacklistStatsAction(businessId)
    } catch (error) {
      console.error('Error fetching blacklist stats:', error)
      return {
        total: 0,
        hard_bounces: 0,
        soft_bounces: 0,
        complaints: 0,
        last_30_days: 0,
      }
    }
  }
}
