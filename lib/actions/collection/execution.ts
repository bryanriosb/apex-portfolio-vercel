'use server'

import {
  getRecordById,
  updateRecord,
  deleteRecord,
  getSupabaseAdminClient,
} from '@/lib/actions/supabase'
import type {
  CollectionExecution,
  CollectionExecutionUpdate,
} from '@/lib/models/collection'
import { SQSBatchService } from '@/lib/services/collection/sqs-batch-service'

export interface ExecutionListResponse {
  data: CollectionExecution[]
  total: number
  total_pages: number
}

export interface DashboardStats {
  // Execution stats
  total_executions: number
  pending_executions: number
  processing_executions: number
  completed_executions: number
  failed_executions: number

  // Email stats
  total_emails_sent: number
  total_emails_delivered: number
  total_emails_opened: number
  total_emails_bounced: number
  total_emails_failed: number

  // Rates
  avg_open_rate: number
  avg_bounce_rate: number
  avg_delivery_rate: number

  // Timestamps
  last_execution_date: string | null
  last_email_sent_date: string | null

  // Today's stats
  today_emails_sent: number
  today_emails_delivered: number

  // By strategy
  by_strategy: Record<string, { count: number; sent: number }>
}

export interface ActiveExecution {
  id: string
  name: string
  status: string
  created_at: string
  started_at: string | null
  total_clients: number
  emails_sent: number
  emails_delivered: number
  emails_opened: number
  progress_percent: number
  strategy_type: string
}

export interface ExecutionListResponse {
  data: CollectionExecution[]
  total: number
  total_pages: number
}

/**
 * Fetch comprehensive dashboard stats for a business
 */
export async function getDashboardStatsAction(businessId: string): Promise<DashboardStats> {
  try {
    const supabase = await getSupabaseAdminClient()
    const today = new Date().toISOString().split('T')[0]

    // Get all executions for this business
    const { data: executions, error: execError } = await supabase
      .from('collection_executions')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })

    if (execError) throw execError

    if (!executions || executions.length === 0) {
      return {
        total_executions: 0,
        pending_executions: 0,
        processing_executions: 0,
        completed_executions: 0,
        failed_executions: 0,
        total_emails_sent: 0,
        total_emails_delivered: 0,
        total_emails_opened: 0,
        total_emails_bounced: 0,
        total_emails_failed: 0,
        avg_open_rate: 0,
        avg_bounce_rate: 0,
        avg_delivery_rate: 0,
        last_execution_date: null,
        last_email_sent_date: null,
        today_emails_sent: 0,
        today_emails_delivered: 0,
        by_strategy: {},
      }
    }

    // Calculate execution stats
    const executionStats = {
      total: executions.length,
      pending: executions.filter((e: CollectionExecution) => e.status === 'pending').length,
      processing: executions.filter((e: CollectionExecution) => e.status === 'processing').length,
      completed: executions.filter((e: CollectionExecution) => e.status === 'completed').length,
      failed: executions.filter((e: CollectionExecution) => e.status === 'failed').length,
    }

    // Calculate email stats
    let totalSent = 0, totalDelivered = 0, totalOpened = 0, totalBounced = 0, totalFailed = 0
    let lastExecutionDate: string | null = null
    const lastEmailSentDate: string | null = null
    let todaySent = 0, todayDelivered = 0
    const byStrategy: Record<string, { count: number; sent: number }> = {}

    for (const exec of executions) {
      totalSent += exec.emails_sent || 0
      totalDelivered += exec.emails_delivered || 0
      totalOpened += exec.emails_opened || 0
      totalBounced += exec.emails_bounced || 0
      totalFailed += exec.emails_failed || 0

      if (!lastExecutionDate && exec.created_at) {
        lastExecutionDate = exec.created_at
      }

      // Track by strategy
      const strategy = exec.execution_mode || 'unknown'
      if (!byStrategy[strategy]) {
        byStrategy[strategy] = { count: 0, sent: 0 }
      }
      byStrategy[strategy].count++
      byStrategy[strategy].sent += exec.emails_sent || 0

      // Today's stats
      if (exec.created_at?.startsWith(today)) {
        todaySent += exec.emails_sent || 0
        todayDelivered += exec.emails_delivered || 0
      }
    }

    // Calculate rates
    const avgOpenRate = totalSent > 0 ? (totalOpened / totalSent) * 100 : 0
    const avgBounceRate = totalSent > 0 ? (totalBounced / totalSent) * 100 : 0
    const avgDeliveryRate = totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0

    return {
      total_executions: executionStats.total,
      pending_executions: executionStats.pending,
      processing_executions: executionStats.processing,
      completed_executions: executionStats.completed,
      failed_executions: executionStats.failed,
      total_emails_sent: totalSent,
      total_emails_delivered: totalDelivered,
      total_emails_opened: totalOpened,
      total_emails_bounced: totalBounced,
      total_emails_failed: totalFailed,
      avg_open_rate: Number(avgOpenRate.toFixed(2)),
      avg_bounce_rate: Number(avgBounceRate.toFixed(2)),
      avg_delivery_rate: Number(avgDeliveryRate.toFixed(2)),
      last_execution_date: lastExecutionDate,
      last_email_sent_date: lastEmailSentDate,
      today_emails_sent: todaySent,
      today_emails_delivered: todayDelivered,
      by_strategy: byStrategy,
    }
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    throw error
  }
}

/**
 * Get active/running executions for realtime display
 */
export async function getActiveExecutionsAction(businessId: string): Promise<ActiveExecution[]> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { data: executions, error } = await supabase
      .from('collection_executions')
      .select('*')
      .eq('business_id', businessId)
      .in('status', ['pending', 'processing'])
      .order('created_at', { ascending: false })

    if (error) throw error

    return (executions || []).map((exec: CollectionExecution) => {
      const progress = exec.total_clients > 0
        ? Math.round((exec.emails_sent / exec.total_clients) * 100)
        : 0

      return {
        id: exec.id,
        name: exec.name,
        status: exec.status,
        created_at: exec.created_at,
        started_at: exec.started_at || null,
        total_clients: exec.total_clients,
        emails_sent: exec.emails_sent,
        emails_delivered: exec.emails_delivered,
        emails_opened: exec.emails_opened,
        progress_percent: progress,
        strategy_type: exec.execution_mode || 'unknown',
        open_rate: exec.emails_sent > 0 ? (exec.emails_opened / exec.emails_sent) * 100 : 0,
        bounce_rate: exec.emails_sent > 0 ? (exec.emails_bounced / exec.emails_sent) * 100 : 0,
        delivery_rate: exec.emails_sent > 0 ? (exec.emails_delivered / exec.emails_sent) * 100 : 0,
        avg_open_rate: exec.emails_sent > 0 ? (exec.emails_opened / exec.emails_sent) * 100 : 0,
      }
    })
  } catch (error) {
    console.error('Error fetching active executions:', error)
    return []
  }
}

/**
 * Get recent executions (last 5) for dashboard
 */
export async function getRecentExecutionsAction(businessId: string, limit = 5): Promise<CollectionExecution[]> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { data, error } = await supabase
      .from('collection_executions')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    return (data || []).map((exec: any) => {
      const openRate = exec.emails_sent > 0
        ? (exec.emails_opened / exec.emails_sent) * 100
        : 0
      const bounceRate = exec.emails_sent > 0
        ? (exec.emails_bounced / exec.emails_sent) * 100
        : 0
      const deliveryRate = exec.emails_sent > 0
        ? (exec.emails_delivered / exec.emails_sent) * 100
        : 0

      return {
        ...exec,
        open_rate: openRate,
        bounce_rate: bounceRate,
        delivery_rate: deliveryRate,
        // Compability with UI typo if any
        avg_open_rate: openRate
      }
    })
  } catch (error) {
    console.error('Error fetching recent executions:', error)
    return []
  }
}

/**
 * Fetch paginated list of executions
 */
export async function fetchExecutionsAction(params?: {
  page?: number
  page_size?: number
  business_id?: string
  status?: string | string[]
  search?: string
}): Promise<ExecutionListResponse> {
  try {
    if (!params?.business_id) {
      return { data: [], total: 0, total_pages: 0 }
    }

    const supabase = await getSupabaseAdminClient()

    let query = supabase
      .from('collection_executions')
      .select('*', { count: 'exact' })
      .eq('business_id', params.business_id)
      .order('created_at', { ascending: false })

    // Filter by status
    if (params.status) {
      if (Array.isArray(params.status)) {
        query = query.in('status', params.status)
      } else {
        query = query.eq('status', params.status)
      }
    }

    // Search by name or description
    if (params.search) {
      const searchTerm = `%${params.search}%`
      query = query.or(
        `name.ilike.${searchTerm},description.ilike.${searchTerm}`
      )
    }

    // Pagination
    const page = params.page || 1
    const pageSize = params.page_size || 20
    const start = (page - 1) * pageSize
    const end = start + pageSize - 1

    query = query.range(start, end)

    const { data, error, count } = await query

    if (error) throw error

    return {
      data: data || [],
      total: count || 0,
      total_pages: Math.ceil((count || 0) / pageSize),
    }
  } catch (error) {
    console.error('Error fetching executions:', error)
    return { data: [], total: 0, total_pages: 0 }
  }
}

/**
 * Get execution by ID
 */
export async function getExecutionByIdAction(
  id: string
): Promise<CollectionExecution | null> {
  try {
    return await getRecordById<CollectionExecution>('collection_executions', id)
  } catch (error) {
    console.error('Error fetching execution:', error)
    return null
  }
}

/**
 * Update execution
 */
export async function updateExecutionAction(
  id: string,
  data: CollectionExecutionUpdate
): Promise<{ success: boolean; data?: CollectionExecution; error?: string }> {
  try {
    const execution = await updateRecord<CollectionExecution>(
      'collection_executions',
      id,
      data
    )

    if (!execution) {
      return { success: false, error: 'Error al actualizar la ejecución' }
    }

    return { success: true, data: execution }
  } catch (error: any) {
    console.error('Error updating execution:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}

/**
 * Update execution status
 */
export async function updateExecutionStatusAction(
  id: string,
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'paused'
): Promise<{ success: boolean; error?: string }> {
  try {
    const updateData: CollectionExecutionUpdate = { status }

    // Set timestamps based on status
    if (status === 'processing' && !updateData.started_at) {
      updateData.started_at = new Date().toISOString()
    } else if (
      (status === 'completed' || status === 'failed') &&
      !updateData.completed_at
    ) {
      updateData.completed_at = new Date().toISOString()
    }

    await updateRecord('collection_executions', id, updateData)
    return { success: true }
  } catch (error: any) {
    console.error('Error updating execution status:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}

/**
 * Delete execution
 */
export async function deleteExecutionAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await deleteRecord('collection_executions', id)
    return { success: true }
  } catch (error: any) {
    console.error('Error deleting execution:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}

/**
 * Get execution statistics
 */
export async function getExecutionStatsAction(businessId: string): Promise<{
  total_sent: number
  avg_open_rate: number
  avg_bounce_rate: number
  last_execution_date: string | null
}> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { data, error } = await supabase
      .from('collection_executions')
      .select('emails_sent, open_rate, bounce_rate, created_at')
      .eq('business_id', businessId)
      .eq('status', 'completed')

    if (error) throw error

    if (!data || data.length === 0) {
      return {
        total_sent: 0,
        avg_open_rate: 0,
        avg_bounce_rate: 0,
        last_execution_date: null,
      }
    }

    const totalSent = data.reduce((sum, exec) => sum + exec.emails_sent, 0)
    const avgOpenRate =
      data.reduce((sum, exec) => sum + exec.open_rate, 0) / data.length
    const avgBounceRate =
      data.reduce((sum, exec) => sum + exec.bounce_rate, 0) / data.length
    const lastExecutionDate = data[0].created_at

    return {
      total_sent: totalSent,
      avg_open_rate: Number(avgOpenRate.toFixed(2)),
      avg_bounce_rate: Number(avgBounceRate.toFixed(2)),
      last_execution_date: lastExecutionDate,
    }
  } catch (error) {
    console.error('Error fetching execution stats:', error)
    return {
      total_sent: 0,
      avg_open_rate: 0,
      avg_bounce_rate: 0,
      last_execution_date: null,
    }
  }
}

/**
 * Process execution - enqueue pending batches to SQS
 */
export async function processExecutionAction(
  executionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await getSupabaseAdminClient()

    // Get execution
    const { data: execution, error: execError } = await supabase
      .from('collection_executions')
      .select('*')
      .eq('id', executionId)
      .single()

    if (execError || !execution) {
      return { success: false, error: 'Ejecución no encontrada' }
    }

    if (execution.status !== 'pending') {
      return { success: false, error: 'Solo se pueden procesar ejecuciones en estado pending' }
    }

    // Get pending batches for this execution
    const { data: batches, error: batchesError } = await supabase
      .from('execution_batches')
      .select('*')
      .eq('execution_id', executionId)
      .eq('status', 'pending')

    if (batchesError) {
      return { success: false, error: `Error al obtener batches: ${batchesError.message}` }
    }

    if (!batches || batches.length === 0) {
      return { success: false, error: 'No hay batches pendientes para procesar' }
    }

    // Update execution status to processing
    await supabase
      .from('collection_executions')
      .update({ status: 'processing', started_at: new Date().toISOString() })
      .eq('id', executionId)

    // Enqueue batches to SQS
    await SQSBatchService.enqueueBatches(
      batches,
      execution.business_id,
      {
        delaySeconds: 0,
        maxConcurrent: 5,
      }
    )

    return { success: true }
  } catch (error: any) {
    console.error('Error processing execution:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}
