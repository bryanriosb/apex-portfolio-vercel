'use server'

import {
  getRecordById,
  updateRecord,
  getSupabaseAdminClient,
} from '@/lib/actions/supabase'
import type {
  BankTransactionBatch,
  BankTransactionBatchInsert,
  BankTransactionBatchUpdate,
  BankTransactionBatchStats,
} from '@/lib/models/bank-transactions'

export interface BankTransactionBatchListResponse {
  data: BankTransactionBatch[]
  total: number
  total_pages: number
}

export async function fetchBankTransactionBatchesAction(params?: {
  page?: number
  page_size?: number
  business_id?: string
  status?: string
}): Promise<BankTransactionBatchListResponse> {
  try {
    if (!params?.business_id) {
      return { data: [], total: 0, total_pages: 0 }
    }

    const supabase = await getSupabaseAdminClient()

    let query = supabase
      .from('bank_transaction_batches')
      .select('*', { count: 'exact' })
      .eq('business_id', params.business_id)
      .order('created_at', { ascending: false })

    if (params.status) {
      query = query.eq('status', params.status)
    }

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
    console.error('Error fetching bank transaction batches:', error)
    return { data: [], total: 0, total_pages: 0 }
  }
}

export async function getBankTransactionBatchByIdAction(
  id: string
): Promise<BankTransactionBatch | null> {
  try {
    return await getRecordById<BankTransactionBatch>('bank_transaction_batches', id)
  } catch (error) {
    console.error('Error fetching bank transaction batch:', error)
    return null
  }
}

export async function createBankTransactionBatchAction(
  data: BankTransactionBatchInsert
): Promise<{ success: boolean; data?: BankTransactionBatch; error?: string }> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { data: batch, error } = await supabase
      .from('bank_transaction_batches')
      .insert({
        ...data,
        status: data.status || 'pending',
        total_records: data.total_records || 0,
        identified_count: data.identified_count || 0,
        unidentified_count: data.unidentified_count || 0,
        no_nit_count: data.no_nit_count || 0,
        duplicate_count: data.duplicate_count || 0,
      })
      .select()
      .single()

    if (error) throw error

    return { success: true, data: batch }
  } catch (error: any) {
    console.error('Error creating bank transaction batch:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}

export async function updateBankTransactionBatchAction(
  id: string,
  data: BankTransactionBatchUpdate
): Promise<{ success: boolean; data?: BankTransactionBatch; error?: string }> {
  try {
    const batch = await updateRecord<BankTransactionBatch>(
      'bank_transaction_batches',
      id,
      data
    )

    if (!batch) {
      return { success: false, error: 'Error al actualizar el batch' }
    }

    return { success: true, data: batch }
  } catch (error: any) {
    console.error('Error updating bank transaction batch:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}

export async function completeBankTransactionBatchAction(
  id: string,
  stats: {
    identified_count: number
    unidentified_count: number
    no_nit_count: number
    duplicate_count: number
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { error } = await supabase
      .from('bank_transaction_batches')
      .update({
        ...stats,
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) throw error

    return { success: true }
  } catch (error: any) {
    console.error('Error completing bank transaction batch:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}

export async function failBankTransactionBatchAction(
  id: string,
  errorMessage?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { error } = await supabase
      .from('bank_transaction_batches')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) throw error

    console.error(`Batch ${id} marked as failed:`, errorMessage)
    return { success: true }
  } catch (error: any) {
    console.error('Error marking batch as failed:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}

export async function getBatchStatsAction(
  batchId: string
): Promise<BankTransactionBatchStats | null> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { data: batch, error } = await supabase
      .from('bank_transaction_batches')
      .select('*')
      .eq('id', batchId)
      .single()

    if (error) throw error

    const total = batch.total_records || 0
    const identified = batch.identified_count || 0
    const identificationRate = total > 0 ? (identified / total) * 100 : 0

    return {
      total,
      identified,
      unidentified: batch.unidentified_count || 0,
      no_nit: batch.no_nit_count || 0,
      duplicates: batch.duplicate_count || 0,
      identification_rate: Number(identificationRate.toFixed(2)),
    }
  } catch (error) {
    console.error('Error getting batch stats:', error)
    return null
  }
}

export async function deleteBankTransactionBatchAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { error } = await supabase
      .from('bank_transactions')
      .delete()
      .eq('import_batch_id', id)

    if (error) throw error

    const { error: batchError } = await supabase
      .from('bank_transaction_batches')
      .delete()
      .eq('id', id)

    if (batchError) throw batchError

    return { success: true }
  } catch (error: any) {
    console.error('Error deleting bank transaction batch:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}
