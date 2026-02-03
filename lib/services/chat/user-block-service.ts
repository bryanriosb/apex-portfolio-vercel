import {
  createUserBlockAction,
  deleteUserBlockAction,
  isUserBlockedAction,
  fetchBlockedBusinessesAction,
} from '@/lib/actions/user-block'
import type { UserBlock, UserBlockInsert } from '@/lib/models/chat/user-block'

export default class UserBlockService {
  async createItem(
    data: UserBlockInsert
  ): Promise<{ success: boolean; data?: UserBlock; error?: string }> {
    try {
      return await createUserBlockAction(data)
    } catch (error: any) {
      console.error('Error creating user block:', error)
      return { success: false, error: error.message }
    }
  }

  async deleteItem(
    blocker_user_id: string,
    blocked_business_id: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      return await deleteUserBlockAction(blocker_user_id, blocked_business_id)
    } catch (error: any) {
      console.error('Error deleting user block:', error)
      return { success: false, error: error.message }
    }
  }

  async isBlocked(
    blocker_user_id: string,
    blocked_business_id: string
  ): Promise<boolean> {
    try {
      return await isUserBlockedAction(blocker_user_id, blocked_business_id)
    } catch (error) {
      console.error('Error checking if user is blocked:', error)
      return false
    }
  }

  async fetchBlockedBusinesses(
    blocker_user_id: string
  ): Promise<{ data: UserBlock[]; error?: string }> {
    try {
      return await fetchBlockedBusinessesAction(blocker_user_id)
    } catch (error: any) {
      console.error('Error fetching blocked businesses:', error)
      return { data: [], error: error.message }
    }
  }
}
