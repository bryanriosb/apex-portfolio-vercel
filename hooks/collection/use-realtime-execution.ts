'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { createClient } from '@supabase/supabase-js'
import { CollectionExecution, CollectionClient } from '@/lib/models/collection'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

interface ClientStats {
    total: number
    pending: number
    sent: number
    delivered: number
    opened: number
    bounced: number
    failed: number
}

interface UseRealtimeExecutionReturn {
    execution: CollectionExecution
    clientStats: ClientStats
    recentClients: CollectionClient[]
}

const initialClientStats: ClientStats = {
    total: 0,
    pending: 0,
    sent: 0,
    delivered: 0,
    opened: 0,
    bounced: 0,
    failed: 0,
}

export function useRealtimeExecution(
    initialExecution: CollectionExecution
): UseRealtimeExecutionReturn {
    const [execution, setExecution] = useState<CollectionExecution>(initialExecution)
    const [clientStats, setClientStats] = useState<ClientStats>(initialClientStats)
    const [recentClients, setRecentClients] = useState<CollectionClient[]>([])

    // Memoize supabase client to prevent re-creating on every render
    const supabase = useMemo(() => createClient(supabaseUrl, supabaseAnonKey), [])

    // Reset state when initial execution changes
    useEffect(() => {
        setExecution(initialExecution)
    }, [initialExecution])

    // Fetch initial client stats
    const fetchClientStats = useCallback(async () => {
        if (!initialExecution?.id) return

        const { data, error } = await supabase
            .from('collection_clients')
            .select('status')
            .eq('execution_id', initialExecution.id)

        if (error || !data) return

        const stats: ClientStats = {
            total: data.length,
            pending: data.filter((c: { status: string }) => c.status === 'pending').length,
            sent: data.filter((c: { status: string }) => c.status === 'sent').length,
            delivered: data.filter((c: { status: string }) => c.status === 'delivered').length,
            opened: data.filter((c: { status: string }) => c.status === 'opened').length,
            bounced: data.filter((c: { status: string }) => c.status === 'bounced').length,
            failed: data.filter((c: { status: string }) => c.status === 'failed').length,
        }
        setClientStats(stats)
    }, [initialExecution?.id, supabase])

    // Fetch recent clients for the timeline
    const fetchRecentClients = useCallback(async () => {
        if (!initialExecution?.id) return

        const { data, error } = await supabase
            .from('collection_clients')
            .select('*')
            .eq('execution_id', initialExecution.id)
            .order('updated_at', { ascending: false })
            .limit(10)

        if (error || !data) return
        setRecentClients(data as CollectionClient[])
    }, [initialExecution?.id, supabase])

    // Initial fetch
    useEffect(() => {
        fetchClientStats()
        fetchRecentClients()
    }, [fetchClientStats, fetchRecentClients])

    // Subscribe to realtime updates
    useEffect(() => {
        if (!initialExecution?.id) return

        // Channel for execution updates
        const executionChannel = supabase
            .channel(`execution-${initialExecution.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'collection_executions',
                    filter: `id=eq.${initialExecution.id}`,
                },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (payload: any) => {
                    console.log('Realtime execution update:', payload)
                    setExecution(payload.new as CollectionExecution)
                }
            )
            .subscribe((status: string) => {
                if (status === 'SUBSCRIBED') {
                    console.log('Subscribed to execution updates')
                }
            })

        // Channel for client updates
        const clientsChannel = supabase
            .channel(`clients-${initialExecution.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*', // Listen to INSERT, UPDATE, DELETE
                    schema: 'public',
                    table: 'collection_clients',
                    filter: `execution_id=eq.${initialExecution.id}`,
                },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (payload: any) => {
                    console.log('Realtime client update:', payload)
                    // Refetch stats and recent clients on any change
                    fetchClientStats()
                    fetchRecentClients()
                }
            )
            .subscribe((status: string) => {
                if (status === 'SUBSCRIBED') {
                    console.log('Subscribed to client updates')
                }
            })

        return () => {
            supabase.removeChannel(executionChannel)
            supabase.removeChannel(clientsChannel)
        }
    }, [initialExecution?.id, supabase, fetchClientStats, fetchRecentClients])

    return {
        execution,
        clientStats,
        recentClients,
    }
}

