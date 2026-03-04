'use server'

import { getSupabaseAdminClient } from '@/lib/actions/supabase'

export interface AuditLogEntry {
    id: string
    execution_id: string
    batch_id?: string
    event: 'ENQUEUED' | 'PICKED_UP' | 'DEFERRED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'DLQ_SENT'
    worker_id?: string
    details?: any
    created_at: string
}

export interface ControlTowerStats {
    enqueued: number
    processing: number
    completed: number
    failed: number
    deferred: number
    dlq: number
}

/**
 * Fetch audit logs for a specific execution
 */
export async function getExecutionAuditLogs(
    executionId: string,
    limit: number = 50
): Promise<{ success: boolean; data: AuditLogEntry[]; error?: string }> {
    try {
        const supabase = await getSupabaseAdminClient()

        const { data, error } = await supabase
            .from('execution_audit_logs')
            .select('*')
            .eq('execution_id', executionId)
            .order('created_at', { ascending: false })
            .limit(limit)

        if (error) throw error

        return { success: true, data: data as AuditLogEntry[] }
    } catch (error: any) {
        console.error('Error fetching audit logs:', error)
        return { success: false, data: [], error: error.message }
    }
}

export interface LockStatus {
    is_locked: boolean
    locked_by: string | null
    locked_at: string | null
    expires_at: string | null
    time_remaining_seconds: number | null
}

/**
 * Get current scheduler lock status
 */
export async function getSchedulerLockStatus(): Promise<{ success: boolean; lock: LockStatus; error?: string }> {
    try {
        const supabase = await getSupabaseAdminClient()

        const { data, error } = await supabase
            .from('scheduler_locks')
            .select('*')
            .eq('id', 'email_scheduler_lock')
            .single()

        if (error) throw error

        const now = new Date()
        const expiresAt = data.expires_at ? new Date(data.expires_at) : null
        const timeRemaining = expiresAt ? Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000)) : null

        const lock: LockStatus = {
            is_locked: data.locked_by !== null && data.locked_by !== 'init' && (expiresAt === null || expiresAt > now),
            locked_by: data.locked_by === 'init' ? null : data.locked_by,
            locked_at: data.locked_at,
            expires_at: data.expires_at,
            time_remaining_seconds: timeRemaining
        }

        return { success: true, lock }
    } catch (error: any) {
        console.error('Error fetching lock status:', error)
        return {
            success: false,
            lock: {
                is_locked: false,
                locked_by: null,
                locked_at: null,
                expires_at: null,
                time_remaining_seconds: null
            },
            error: error.message
        }
    }
}

/**
 * Get aggregated stats from audit logs for a business
 * This effectively reconstructs the state of the system
 */
export async function getControlTowerStats(
    businessId: string
): Promise<{ success: boolean; stats: ControlTowerStats; error?: string }> {
    try {
        const supabase = await getSupabaseAdminClient()

        // We first get active executions for this business to filter logs
        const { data: executions } = await supabase
            .from('collection_executions')
            .select('id')
            .eq('business_id', businessId)
            .in('status', ['processing', 'pending'])

        if (!executions || executions.length === 0) {
            return {
                success: true,
                stats: { enqueued: 0, processing: 0, completed: 0, failed: 0, deferred: 0, dlq: 0 }
            }
        }

        const executionIds = executions.map(e => e.id)

        // Now we query logs for these executions
        // Optimally we would have a materialized view or a more specific query
        // For now, we fetch recent logs and aggregate
        const { data: logs, error } = await supabase
            .from('execution_audit_logs')
            .select('event, batch_id')
            .in('execution_id', executionIds)
            .order('created_at', { ascending: false })
            .limit(1000) // Limit to avoid massive fetch

        if (error) throw error

        // Simple aggregation based on latest event per batch
        const batchStatus = new Map<string, string>()

        // Process logs from newest to oldest to find current status of each batch
        logs?.forEach((log) => {
            if (log.batch_id && !batchStatus.has(log.batch_id)) {
                batchStatus.set(log.batch_id, log.event)
            }
        })

        const stats: ControlTowerStats = {
            enqueued: 0,
            processing: 0,
            completed: 0,
            failed: 0,
            deferred: 0,
            dlq: 0
        }

        batchStatus.forEach((status) => {
            switch (status) {
                case 'ENQUEUED': stats.enqueued++; break;
                case 'PICKED_UP':
                case 'PROCESSING': stats.processing++; break;
                case 'COMPLETED': stats.completed++; break;
                case 'FAILED': stats.failed++; break;
                case 'DEFERRED': stats.deferred++; break;
                case 'DLQ_SENT': stats.dlq++; break;
            }
        })

        return { success: true, stats }
    } catch (error: any) {
        console.error('Error fetching control tower stats:', error)
        return {
            success: false,
            stats: { enqueued: 0, processing: 0, completed: 0, failed: 0, deferred: 0, dlq: 0 },
            error: error.message
        }
    }
}
