'use server'

import {
    insertRecord,
    updateRecord,
    getSupabaseAdminClient,
} from '@/lib/actions/supabase'
import type {
    CollectionClient,
    CollectionClientInsert,
    CollectionClientUpdate,
} from '@/lib/models/collection'

export interface ClientListResponse {
    data: CollectionClient[]
    total: number
    total_pages: number
}

/**
 * Fetch clients by execution ID
 */
export async function fetchClientsByExecutionAction(params: {
    execution_id: string
    page?: number
    page_size?: number
    status?: string | string[]
    search?: string
}): Promise<ClientListResponse> {
    try {
        const supabase = await getSupabaseAdminClient()

        let query = supabase
            .from('collection_clients')
            .select('*', { count: 'exact' })
            .eq('execution_id', params.execution_id)
            .order('created_at', { ascending: true })

        // Filter by status
        if (params.status) {
            if (Array.isArray(params.status)) {
                query = query.in('status', params.status)
            } else {
                query = query.eq('status', params.status)
            }
        }

        // Search by email or name
        if (params.search) {
            const searchTerm = `%${params.search}%`
            query = query.or(
                `email.ilike.${searchTerm},full_name.ilike.${searchTerm},company_name.ilike.${searchTerm}`
            )
        }

        // Pagination
        const page = params.page || 1
        const pageSize = params.page_size || 50
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
        console.error('Error fetching clients:', error)
        return { data: [], total: 0, total_pages: 0 }
    }
}

/**
 * Bulk insert clients for an execution
 */
export async function bulkInsertClientsAction(
    clients: CollectionClientInsert[]
): Promise<{ success: boolean; count: number; error?: string }> {
    try {
        const supabase = await getSupabaseAdminClient()

        const { data, error } = await supabase
            .from('collection_clients')
            .insert(clients)
            .select('id')

        if (error) throw error

        return { success: true, count: data?.length || 0 }
    } catch (error: any) {
        console.error('Error bulk inserting clients:', error)
        return { success: false, count: 0, error: error.message }
    }
}

/**
 * Update client status
 */
export async function updateClientStatusAction(
    id: string,
    data: CollectionClientUpdate
): Promise<{ success: boolean; error?: string }> {
    try {
        await updateRecord('collection_clients', id, data)
        return { success: true }
    } catch (error: any) {
        console.error('Error updating client status:', error)
        return { success: false, error: error.message || 'Error desconocido' }
    }
}

/**
 * Update multiple clients by execution and filter
 */
export async function bulkUpdateClientsByFilterAction(
    executionId: string,
    filter: {
        status?: string
        email_opened_at_is_null?: boolean
    },
    update: CollectionClientUpdate
): Promise<{ success: boolean; count: number; error?: string }> {
    try {
        const supabase = await getSupabaseAdminClient()

        let query = supabase
            .from('collection_clients')
            .update(update)
            .eq('execution_id', executionId)

        if (filter.status) {
            query = query.eq('status', filter.status)
        }

        if (filter.email_opened_at_is_null) {
            query = query.is('email_opened_at', null)
        }

        const { data, error, count } = await query.select('id')

        if (error) throw error

        return { success: true, count: count || 0 }
    } catch (error: any) {
        console.error('Error bulk updating clients:', error)
        return { success: false, count: 0, error: error.message }
    }
}

/**
 * Get clients requiring fallback
 */
export async function getClientsRequiringFallbackAction(params: {
    execution_id?: string
    business_id?: string
    days_threshold?: number
}): Promise<CollectionClient[]> {
    try {
        const supabase = await getSupabaseAdminClient()

        // Calculate the date threshold
        const daysThreshold = params.days_threshold || 3
        const thresholdDate = new Date()
        thresholdDate.setDate(thresholdDate.getDate() - daysThreshold)

        let query = supabase
            .from('collection_clients')
            .select('*, execution:collection_executions(*)')
            .eq('status', 'delivered')
            .is('email_opened_at', null)
            .eq('fallback_required', true)
            .is('fallback_sent_at', null)
            .lt('email_delivered_at', thresholdDate.toISOString())

        if (params.execution_id) {
            query = query.eq('execution_id', params.execution_id)
        }

        if (params.business_id) {
            query = query.eq('execution.business_id', params.business_id)
        }

        const { data, error } = await query

        if (error) throw error

        return data || []
    } catch (error) {
        console.error('Error fetching clients requiring fallback:', error)
        return []
    }
}
