'use server'

import {
  getAllRecords,
  getRecordById,
  insertRecord,
  updateRecord,
  getSupabaseAdminClient,
} from '@/lib/actions/supabase'
import type {
  Notification,
  NotificationInsert,
  NotificationUpdate,
} from '@/lib/models/notification/notification'

export interface NotificationListResponse {
  data: Notification[]
  total: number
  unread_count: number
}

export async function fetchNotificationsAction(params?: {
  user_id: string
  is_read?: boolean
  limit?: number
}): Promise<NotificationListResponse> {
  try {
    const supabase = await getSupabaseAdminClient()
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', params?.user_id)
      .order('created_at', { ascending: false })

    if (params?.is_read !== undefined) {
      query = query.eq('is_read', params.is_read)
    }

    if (params?.limit) {
      query = query.limit(params.limit)
    }

    const { data: notifications, error } = await query

    if (error) {
      console.error('Error fetching notifications:', error)
      return {
        data: [],
        total: 0,
        unread_count: 0,
      }
    }

    const unreadCount = notifications?.filter((n) => !n.is_read).length || 0

    return {
      data: notifications || [],
      total: notifications?.length || 0,
      unread_count: unreadCount,
    }
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return {
      data: [],
      total: 0,
      unread_count: 0,
    }
  }
}

export async function getNotificationByIdAction(
  id: string
): Promise<Notification | null> {
  try {
    return await getRecordById<Notification>('notifications', id)
  } catch (error) {
    console.error('Error fetching notification:', error)
    return null
  }
}

export async function createNotificationAction(
  data: NotificationInsert
): Promise<{ success: boolean; data?: Notification; error?: string }> {
  try {
    const notification = await insertRecord<Notification>('notifications', {
      ...data,
      source: data.source || 'internal',
    })

    if (!notification) {
      return { success: false, error: 'Error al crear la notificación' }
    }

    return { success: true, data: notification }
  } catch (error: any) {
    console.error('Error creating notification:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}

export async function markNotificationAsReadAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await updateRecord<Notification>('notifications', id, {
      is_read: true,
      read_at: new Date().toISOString(),
    })

    return { success: true }
  } catch (error: any) {
    console.error('Error marking notification as read:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}

export async function markAllNotificationsAsReadAction(
  user_id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await getSupabaseAdminClient()
    const { error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('user_id', user_id)
      .eq('is_read', false)

    if (error) {
      console.error('Error marking all notifications as read:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error marking all notifications as read:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}
