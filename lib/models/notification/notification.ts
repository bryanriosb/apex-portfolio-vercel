import type { NotificationType, NotificationSource } from '@/lib/types/enums'

export interface Notification {
  id: string
  user_id: string
  title: string
  body: string | null
  type: NotificationType
  source: NotificationSource
  is_read: boolean
  data: Record<string, any> | null
  created_at: string
  read_at: string | null
}

export class Notification implements Notification {
  id: string
  user_id: string
  title: string
  body: string | null
  type: NotificationType
  source: NotificationSource
  is_read: boolean
  data: Record<string, any> | null
  created_at: string
  read_at: string | null

  constructor(data: Notification) {
    this.id = data.id
    this.user_id = data.user_id
    this.title = data.title
    this.body = data.body
    this.type = data.type
    this.source = data.source
    this.is_read = data.is_read
    this.data = data.data
    this.created_at = data.created_at
    this.read_at = data.read_at
  }
}

export interface NotificationInsert {
  user_id: string
  title: string
  body?: string | null
  type: NotificationType
  source?: NotificationSource
  data?: Record<string, any> | null
}

export interface NotificationUpdate {
  is_read?: boolean
  read_at?: string | null
}
