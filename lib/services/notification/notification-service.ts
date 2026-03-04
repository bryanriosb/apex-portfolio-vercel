import {
  fetchNotificationsAction,
  getNotificationByIdAction,
  createNotificationAction,
  markNotificationAsReadAction,
  markAllNotificationsAsReadAction,
} from '@/lib/actions/notification'
import type {
  Notification,
  NotificationInsert,
} from '@/lib/models/notification/notification'

export interface NotificationListResponse {
  data: Notification[]
  total: number
  unread_count: number
}

export default class NotificationService {
  async fetchItems(params?: {
    user_id: string
    is_read?: boolean
    limit?: number
  }): Promise<NotificationListResponse> {
    try {
      return await fetchNotificationsAction(params)
    } catch (error) {
      console.error('Error fetching notifications:', error)
      throw error
    }
  }

  async getById(id: string): Promise<Notification | null> {
    try {
      return await getNotificationByIdAction(id)
    } catch (error) {
      console.error('Error fetching notification by ID:', error)
      throw error
    }
  }

  async createItem(
    data: NotificationInsert
  ): Promise<{ success: boolean; data?: Notification; error?: string }> {
    try {
      return await createNotificationAction(data)
    } catch (error: any) {
      console.error('Error creating notification:', error)
      throw error
    }
  }

  async markAsRead(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      return await markNotificationAsReadAction(id)
    } catch (error: any) {
      console.error('Error marking notification as read:', error)
      throw error
    }
  }

  async markAllAsRead(
    user_id: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      return await markAllNotificationsAsReadAction(user_id)
    } catch (error: any) {
      console.error('Error marking all notifications as read:', error)
      throw error
    }
  }
}
