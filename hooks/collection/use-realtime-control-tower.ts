'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuthenticatedSupabaseClient } from '@/lib/supabase/client'
import { AuditLogEntry, ControlTowerStats, LockStatus } from '@/lib/actions/collection/audit-logs'

interface UseRealtimeControlTowerReturn {
    stats: ControlTowerStats
    lock: LockStatus
    recentLogs: AuditLogEntry[]
    isConnected: boolean
}

const initialStats: ControlTowerStats = {
    enqueued: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    deferred: 0,
    dlq: 0,
}

const initialLock: LockStatus = {
    is_locked: false,
    locked_by: null,
    locked_at: null,
    expires_at: null,
    time_remaining_seconds: null,
}

interface Execution {
    id: string
}

export function useRealtimeControlTower(businessId: string): UseRealtimeControlTowerReturn {
    const [stats, setStats] = useState<ControlTowerStats>(initialStats)
    const [lock, setLock] = useState<LockStatus>(initialLock)
    const [recentLogs, setRecentLogs] = useState<AuditLogEntry[]>([])
    const [isConnected, setIsConnected] = useState(false)

    const supabase = useAuthenticatedSupabaseClient()

    // Fetch initial data
    const fetchInitialData = useCallback(async () => {
        // Import dynamically to avoid server/client mismatch
        const { getControlTowerStats, getSchedulerLockStatus, getExecutionAuditLogs } = await import('@/lib/actions/collection/audit-logs')
        
        // Get stats
        const statsResult = await getControlTowerStats(businessId)
        if (statsResult.success) {
            setStats(statsResult.stats)
        }

        // Get lock status
        const lockResult = await getSchedulerLockStatus()
        if (lockResult.success) {
            setLock(lockResult.lock)
        }

        // Get active executions first
        const { data: executions } = await supabase
            .from('collection_executions')
            .select('id')
            .eq('business_id', businessId)
            .in('status', ['processing', 'pending'])

        if (executions && executions.length > 0) {
            // Get recent logs for active executions
            const logsPromises = (executions as Execution[]).map((e: Execution) => getExecutionAuditLogs(e.id, 20))
            const logsResults = await Promise.all(logsPromises)
            
            const allLogs = logsResults
                .flatMap(r => r.data)
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .slice(0, 50)
            
            setRecentLogs(allLogs)
        }
    }, [businessId, supabase])

    // Initial fetch
    useEffect(() => {
        fetchInitialData()
    }, [fetchInitialData])

    // Subscribe to realtime updates
    useEffect(() => {
        if (!businessId) return

        // Channel for audit logs (INSERT events)
        const auditLogsChannel = supabase
            .channel(`control-tower-logs-${businessId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'execution_audit_logs',
                },
                (payload: any) => {
                    console.log('Realtime audit log:', payload)
                    const newLog = payload.new as AuditLogEntry
                    
                    // Update recent logs
                    setRecentLogs(prev => [newLog, ...prev].slice(0, 50))
                    
                    // Update stats based on event type
                    setStats(prev => {
                        const newStats = { ...prev }
                        switch (newLog.event) {
                            case 'ENQUEUED':
                                newStats.enqueued++
                                break
                            case 'PICKED_UP':
                            case 'PROCESSING':
                                newStats.processing++
                                newStats.enqueued = Math.max(0, newStats.enqueued - 1)
                                break
                            case 'COMPLETED':
                                newStats.completed++
                                newStats.processing = Math.max(0, newStats.processing - 1)
                                break
                            case 'FAILED':
                                newStats.failed++
                                newStats.processing = Math.max(0, newStats.processing - 1)
                                break
                            case 'DEFERRED':
                                newStats.deferred++
                                break
                            case 'DLQ_SENT':
                                newStats.dlq++
                                break
                        }
                        return newStats
                    })
                }
            )
            .subscribe((status: string) => {
                if (status === 'SUBSCRIBED') {
                    console.log('Subscribed to audit logs')
                }
                setIsConnected(status === 'SUBSCRIBED')
            })

        // Channel for scheduler lock updates
        const lockChannel = supabase
            .channel(`control-tower-lock`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'scheduler_locks',
                    filter: `id=eq.email_scheduler_lock`,
                },
                async (payload: any) => {
                    console.log('Realtime lock update:', payload)
                    // Refetch lock status to get proper calculated fields
                    const { getSchedulerLockStatus } = await import('@/lib/actions/collection/audit-logs')
                    const result = await getSchedulerLockStatus()
                    if (result.success) {
                        setLock(result.lock)
                    }
                }
            )
            .subscribe((status: string) => {
                if (status === 'SUBSCRIBED') {
                    console.log('Subscribed to lock updates')
                }
            })

        // Channel for execution status changes
        const executionsChannel = supabase
            .channel(`control-tower-executions-${businessId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'collection_executions',
                    filter: `business_id=eq.${businessId}`,
                },
                (payload: any) => {
                    console.log('Realtime execution update:', payload)
                    // If execution completes, refresh stats
                    if (payload.new.status === 'completed' || payload.new.status === 'failed') {
                        fetchInitialData()
                    }
                }
            )
            .subscribe((status: string) => {
                if (status === 'SUBSCRIBED') {
                    console.log('Subscribed to execution updates')
                }
            })

        return () => {
            supabase.removeChannel(auditLogsChannel)
            supabase.removeChannel(lockChannel)
            supabase.removeChannel(executionsChannel)
        }
    }, [businessId, supabase, fetchInitialData])

    return {
        stats,
        lock,
        recentLogs,
        isConnected,
    }
}
