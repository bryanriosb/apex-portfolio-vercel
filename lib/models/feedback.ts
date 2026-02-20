export type FeedbackType =
  | 'bug_report'
  | 'feature_request'
  | 'general_feedback'
  | 'complaint'
export type FeedbackStatus = 'open' | 'in_progress' | 'resolved' | 'closed'
export type FeedbackSeverity = 'low' | 'medium' | 'high' | 'critical'

export interface Feedback {
  id: string
  business_id: string
  user_id: string
  type: FeedbackType
  title: string
  description: string
  severity: FeedbackSeverity
  status: FeedbackStatus
  priority: number
  attachment_urls: string[]
  metadata: Record<string, any>
  created_at: string
  updated_at: string
  resolved_at: string | null
}

export interface CreateFeedback {
  type: FeedbackType
  title: string
  description: string
  severity: FeedbackSeverity
  priority?: number
  attachment_urls?: string[]
  metadata?: Record<string, any>
}

export interface FeedbackInsert {
  business_id: string
  type: FeedbackType
  title: string
  description: string
  severity: FeedbackSeverity
  status: FeedbackStatus
  priority: number
  attachment_urls: string[]
  metadata: Record<string, any>
}

export interface FeedbackUpdate {
  type?: FeedbackType
  title?: string
  description?: string
  severity?: FeedbackSeverity
  status?: FeedbackStatus
  priority?: number
  attachment_urls?: string[]
  metadata?: Record<string, any>
  resolved_at?: string | null
}
