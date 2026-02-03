import {
  createFeedbackAction,
  getFeedbackListAction,
  getFeedbackByIdAction,
  updateFeedbackAction,
  deleteFeedbackAction,
} from '@/lib/actions/feedback'
import type {
  Feedback,
  CreateFeedback,
  FeedbackUpdate,
  FeedbackType,
} from '@/lib/models/feedback'

export class FeedbackService {
  async createFeedback(
    businessId: string,
    feedbackData: CreateFeedback,
    userId?: string
  ): Promise<{ success: boolean; data?: Feedback; error?: string }> {
    // Add browser metadata for better debugging
    const metadata = {
      userAgent:
        typeof window !== 'undefined'
          ? window.navigator.userAgent
          : 'Server-side',
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : 'Unknown',
      userId: userId || 'anonymous', // Include userId in metadata for tracking
      ...feedbackData.metadata,
    }

    return createFeedbackAction(businessId, {
      ...feedbackData,
      metadata,
    })
  }

  async getFeedbackList(
    businessId: string,
    filters?: {
      type?: FeedbackType
      status?: string
      severity?: string
      limit?: number
      offset?: number
    }
  ): Promise<{
    success: boolean
    data?: Feedback[]
    error?: string
    count?: number
  }> {
    return getFeedbackListAction(businessId, filters)
  }

  async getFeedbackById(
    id: string
  ): Promise<{ success: boolean; data?: Feedback; error?: string }> {
    return getFeedbackByIdAction(id)
  }

  async updateFeedback(
    id: string,
    updateData: FeedbackUpdate
  ): Promise<{ success: boolean; data?: Feedback; error?: string }> {
    return updateFeedbackAction(id, updateData)
  }

  async deleteFeedback(
    id: string
  ): Promise<{ success: boolean; error?: string }> {
    return deleteFeedbackAction(id)
  }

  // Helper method to get severity display text
  getSeverityText(severity: string): string {
    const severityMap: Record<string, string> = {
      low: 'Baja',
      medium: 'Media',
      high: 'Alta',
      critical: 'Crítica',
    }
    return severityMap[severity] || severity
  }

  // Helper method to get type display text
  getTypeText(type: string): string {
    const typeMap: Record<string, string> = {
      bug_report: 'Reporte de Error',
      feature_request: 'Sugerencia',
      general_feedback: 'Comentario General',
      complaint: 'Queja',
    }
    return typeMap[type] || type
  }

  // Helper method to get status display text
  getStatusText(status: string): string {
    const statusMap: Record<string, string> = {
      open: 'Abierto',
      in_progress: 'En Progreso',
      resolved: 'Resuelto',
      closed: 'Cerrado',
    }
    return statusMap[status] || status
  }

  // Helper method to get priority color
  getPriorityColor(priority: number): string {
    if (priority >= 4) return 'text-red-600 bg-red-50'
    if (priority >= 3) return 'text-orange-600 bg-orange-50'
    if (priority >= 2) return 'text-yellow-600 bg-yellow-50'
    return 'text-gray-600 bg-gray-50'
  }

  // Helper method to get severity color
  getSeverityColor(severity: string): string {
    const colorMap: Record<string, string> = {
      low: 'text-green-600 bg-green-50',
      medium: 'text-yellow-600 bg-yellow-50',
      high: 'text-orange-600 bg-orange-50',
      critical: 'text-red-600 bg-red-50',
    }
    return colorMap[severity] || 'text-gray-600 bg-gray-50'
  }
}

export const feedbackService = new FeedbackService()
