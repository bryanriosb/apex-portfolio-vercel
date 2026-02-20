'use server'

import {
    insertRecord,
    getSupabaseAdminClient,
} from '@/lib/actions/supabase'
import type {
    CollectionEvent,
    CollectionEventInsert,
    createEvent,
} from '@/lib/models/collection'

export interface EventListResponse {
    data: CollectionEvent[]
    total: number
    total_pages: number
}

/**
 * Fetch events by execution ID
 */
export async function fetchEventsByExecutionAction(params: {
    execution_id: string
    page?: number
    page_size?: number
    event_type?: string | string[]
    event_status?: string
}): Promise<EventListResponse> {
    try {
        const supabase = await getSupabaseAdminClient()

        let query = supabase
            .from('collection_events')
            .select('*', { count: 'exact' })
            .eq('execution_id', params.execution_id)
            .order('timestamp', { ascending: false })

        // Filter by type
        if (params.event_type) {
            if (Array.isArray(params.event_type)) {
                query = query.in('event_type', params.event_type)
            } else {
                query = query.eq('event_type', params.event_type)
            }
        }

        // Filter by status
        if (params.event_status) {
            query = query.eq('event_status', params.event_status)
        }

        // Pagination
        const page = params.page || 1
        const pageSize = params.page_size || 100
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
        console.error('Error fetching events:', error)
        return { data: [], total: 0, total_pages: 0 }
    }
}

/**
 * Fetch events by client ID
 */
export async function fetchEventsByClientAction(
    clientId: string
): Promise<CollectionEvent[]> {
    try {
        const supabase = await getSupabaseAdminClient()

        const { data, error } = await supabase
            .from('collection_events')
            .select('*')
            .eq('client_id', clientId)
            .order('timestamp', { ascending: true })

        if (error) throw error

        return data || []
    } catch (error) {
        console.error('Error fetching client events:', error)
        return []
    }
}

/**
 * Create event
 */
export async function createEventAction(
    data: CollectionEventInsert
): Promise<{ success: boolean; data?: CollectionEvent; error?: string }> {
    try {
        const event = await insertRecord<CollectionEvent>('collection_events', {
            ...data,
            event_status: data.event_status || 'success',
            event_data: data.event_data || {},
        })

        if (!event) {
            return { success: false, error: 'Error al crear el evento' }
        }

        return { success: true, data: event }
    } catch (error: any) {
        console.error('Error creating event:', error)
        return { success: false, error: error.message || 'Error desconocido' }
    }
}

/**
 * Get event timeline for execution (grouped by timestamp)
 */
export async function getEventTimelineAction(executionId: string): Promise<{
    timeline: Array<{
        timestamp: string
        events: CollectionEvent[]
    }>
}> {
    try {
        const supabase = await getSupabaseAdminClient()

        const { data, error } = await supabase
            .from('collection_events')
            .select('*')
            .eq('execution_id', executionId)
            .order('timestamp', { ascending: true })

        if (error) throw error

        // Group events by hour for timeline
        const grouped: Record<string, CollectionEvent[]> = {}

        data?.forEach((event) => {
            const hour = new Date(event.timestamp).toISOString().substring(0, 13)
            if (!grouped[hour]) {
                grouped[hour] = []
            }
            grouped[hour].push(event)
        })

        const timeline = Object.entries(grouped).map(([timestamp, events]) => ({
            timestamp,
            events,
        }))

        return { timeline }
    } catch (error) {
        console.error('Error fetching event timeline:', error)
        return { timeline: [] }
    }
}
