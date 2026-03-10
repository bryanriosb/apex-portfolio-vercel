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
 * Usa función RPC para búsqueda eficiente en PostgreSQL
 */
export async function fetchClientsByExecutionAction(params: {
    execution_id: string
    page?: number
    page_size?: number
    status?: string | string[]
    search?: string
    fallback_required?: string | string[]
    email_bounce_type?: string | string[]
    fallback_type?: string | string[]
}): Promise<ClientListResponse> {
    try {
        const supabase = await getSupabaseAdminClient()

        // Preparar parámetros para la función RPC
        const rpcParams: any = {
            p_execution_id: params.execution_id,
            p_page: params.page || 1,
            p_page_size: params.page_size || 50,
            p_search: params.search || null,
            p_status: params.status ? (Array.isArray(params.status) ? params.status : [params.status]) : null,
            p_fallback_required: params.fallback_required 
                ? (Array.isArray(params.fallback_required) 
                    ? params.fallback_required.map(v => v === 'true') 
                    : params.fallback_required === 'true')
                : null,
            p_email_bounce_type: params.email_bounce_type 
                ? (Array.isArray(params.email_bounce_type) ? params.email_bounce_type : [params.email_bounce_type]) 
                : null,
            p_fallback_type: params.fallback_type 
                ? (Array.isArray(params.fallback_type) ? params.fallback_type : [params.fallback_type]) 
                : null,
        }

        // Llamar a la función RPC para obtener los datos (incluye total_count en cada fila)
        const { data, error } = await supabase
            .rpc('search_clients_by_execution', rpcParams)

        if (error) {
            console.error('RPC Error:', error)
            // Fallback a consulta simple si la función RPC no existe
            return fetchClientsSimple(supabase, params)
        }

        // Extraer el total del primer resultado (o 0 si no hay resultados)
        const total = data && data.length > 0 ? (data[0] as any).total_count : 0
        const pageSize = params.page_size || 50

        // Remover el campo total_count de los datos antes de retornarlos
        const cleanData = (data || []).map((row: any) => {
            const { total_count, ...clientData } = row
            return clientData as CollectionClient
        })

        return {
            data: cleanData,
            total: Number(total),
            total_pages: Math.ceil(Number(total) / pageSize),
        }
    } catch (error) {
        console.error('Error fetching clients:', error)
        return { data: [], total: 0, total_pages: 0 }
    }
}

/**
 * Función fallback simple sin búsqueda (si RPC no está disponible)
 */
async function fetchClientsSimple(
    supabase: any,
    params: {
        execution_id: string
        page?: number
        page_size?: number
        status?: string | string[]
    }
): Promise<ClientListResponse> {
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
