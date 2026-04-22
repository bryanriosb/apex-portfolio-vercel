'use server'

import {
  updateRecord,
  deleteRecord,
  getSupabaseAdminClient,
} from '@/lib/actions/supabase'
import type {
  BankTransaction,
  BankTransactionInsert,
  BankTransactionUpdate,
} from '@/lib/models/bank-transactions'

export interface BankTransactionListResponse {
  data: BankTransaction[]
  total: number
  total_pages: number
}

export async function fetchBankTransactionsAction(params?: {
  page?: number
  page_size?: number
  business_id?: string
  status?: string | string[]
  bank_name?: string
  customer_id?: string
  execution_id?: string
  date_from?: string
  date_to?: string
  search?: string
}): Promise<BankTransactionListResponse> {
  try {
    if (!params?.business_id) {
      return { data: [], total: 0, total_pages: 0 }
    }

    const supabase = await getSupabaseAdminClient()

    let query = supabase
      .from('bank_transactions')
      .select(
        `*,
        customer:business_customers(id, full_name, nit),
        execution:collection_executions(id, name)
        `,
        { count: 'exact' }
      )
      .eq('business_id', params.business_id)
      .order('transaction_date', { ascending: false })

    if (params.status) {
      if (Array.isArray(params.status)) {
        query = query.in('status', params.status)
      } else {
        query = query.eq('status', params.status)
      }
    }

    if (params.bank_name) {
      query = query.eq('bank_name', params.bank_name)
    }

    if (params.customer_id) {
      query = query.eq('customer_id', params.customer_id)
    }

    if (params.execution_id) {
      query = query.eq('execution_id', params.execution_id)
    }

    if (params.date_from) {
      query = query.gte('transaction_date', params.date_from)
    }

    if (params.date_to) {
      query = query.lte('transaction_date', params.date_to)
    }

    if (params.search) {
      const searchTerm = `%${params.search}%`
      query = query.or(
        `customer_nit.ilike.${searchTerm},customer_name_extract.ilike.${searchTerm},reference.ilike.${searchTerm},description.ilike.${searchTerm}`
      )
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
    console.error('Error fetching bank transactions:', error)
    return { data: [], total: 0, total_pages: 0 }
  }
}

export async function getBankTransactionByIdAction(
  id: string
): Promise<BankTransaction | null> {
  try {
    const supabase = await getSupabaseAdminClient()
    const { data, error } = await supabase
      .from('bank_transactions')
      .select(
        `*,
        customer:business_customers(id, full_name, nit),
        execution:collection_executions(id, name)
        `
      )
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching bank transaction:', error)
    return null
  }
}

export async function createBankTransactionAction(
  data: BankTransactionInsert
): Promise<{ success: boolean; data?: BankTransaction; error?: string }> {
  try {
    const transaction = await insertRecord<BankTransaction>(
      'bank_transactions',
      {
        ...data,
        status: data.status || 'unidentified',
        raw_data: data.raw_data || {},
      }
    )

    if (!transaction) {
      return { success: false, error: 'Error al crear la transacción' }
    }

    return { success: true, data: transaction }
  } catch (error: any) {
    console.error('Error creating bank transaction:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}

export async function bulkInsertBankTransactionsAction(
  transactions: BankTransactionInsert[]
): Promise<{
  success: boolean
  data?: BankTransaction[]
  error?: string
  count?: number
  duplicates?: number
}> {
  try {
    if (!transactions.length) {
      return { success: true, count: 0, duplicates: 0 }
    }

    const supabase = await getSupabaseAdminClient()

    const { data, error } = await supabase
      .from('bank_transactions')
      .insert(transactions)
      .select('id')

    if (error) {
      if (error.code === '23505') {
        return {
          success: false,
          error: 'Se detectaron transacciones duplicadas',
          duplicates: transactions.length,
        }
      }
      throw error
    }

    return {
      success: true,
      data: data as BankTransaction[],
      count: data?.length || 0,
    }
  } catch (error: any) {
    console.error('Error in bulkInsertBankTransactionsAction:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}

export async function updateBankTransactionAction(
  id: string,
  data: BankTransactionUpdate
): Promise<{ success: boolean; data?: BankTransaction; error?: string }> {
  try {
    const transaction = await updateRecord<BankTransaction>(
      'bank_transactions',
      id,
      data
    )

    if (!transaction) {
      return { success: false, error: 'Error al actualizar la transacción' }
    }

    return { success: true, data: transaction }
  } catch (error: any) {
    console.error('Error updating bank transaction:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}

export async function matchTransactionToCustomerAction(
  transactionId: string,
  customerId: string,
  matchedBy: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { error } = await supabase
      .from('bank_transactions')
      .update({
        customer_id: customerId,
        status: 'manual',
        matched_at: new Date().toISOString(),
        matched_by: matchedBy,
      })
      .eq('id', transactionId)

    if (error) throw error

    return { success: true }
  } catch (error: any) {
    console.error('Error matching transaction to customer:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}

export async function bulkMatchTransactionsAction(
  transactionIds: string[],
  customerId: string,
  matchedBy: string
): Promise<{ success: boolean; matchedCount: number; error?: string }> {
  try {
    if (!transactionIds.length) {
      return { success: true, matchedCount: 0 }
    }

    const supabase = await getSupabaseAdminClient()

    const { error } = await supabase
      .from('bank_transactions')
      .update({
        customer_id: customerId,
        status: 'manual',
        matched_at: new Date().toISOString(),
        matched_by: matchedBy,
      })
      .in('id', transactionIds)

    if (error) throw error

    return { success: true, matchedCount: transactionIds.length }
  } catch (error: any) {
    console.error('Error bulk matching transactions:', error)
    return { success: false, matchedCount: 0, error: error.message || 'Error desconocido' }
  }
}

export async function deleteBankTransactionAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await deleteRecord('bank_transactions', id)
    return { success: true }
  } catch (error: any) {
    console.error('Error deleting bank transaction:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}

export async function deleteBankTransactionsAction(
  ids: string[]
): Promise<{ success: boolean; deletedCount: number; error?: string }> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { error } = await supabase
      .from('bank_transactions')
      .delete()
      .in('id', ids)

    if (error) throw error

    return { success: true, deletedCount: ids.length }
  } catch (error: any) {
    console.error('Error batch deleting bank transactions:', error)
    return { success: false, deletedCount: 0, error: error.message }
  }
}

export async function getUnidentifiedTransactionsCountAction(
  businessId: string
): Promise<number> {
  try {
    const supabase = await getSupabaseAdminClient()
    const { count } = await supabase
      .from('bank_transactions')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .in('status', ['unidentified', 'no_nit'])

    return count ?? 0
  } catch (error) {
    console.error('Error counting unidentified transactions:', error)
    return 0
  }
}

export async function getTodayTransactionsSummaryAction(
  businessId: string
): Promise<{
  total_amount: number
  count: number
  by_bank: Record<string, { count: number; amount: number }>
}> {
  try {
    const supabase = await getSupabaseAdminClient()
    const today = new Date().toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('bank_transactions')
      .select('amount, bank_name')
      .eq('business_id', businessId)
      .eq('transaction_date', today)

    if (error) throw error

    let totalAmount = 0
    const byBank: Record<string, { count: number; amount: number }> = {}

    for (const tx of data || []) {
      totalAmount += Number(tx.amount) || 0
      const bank = tx.bank_name || 'UNKNOWN'
      if (!byBank[bank]) {
        byBank[bank] = { count: 0, amount: 0 }
      }
      byBank[bank].count++
      byBank[bank].amount += Number(tx.amount) || 0
    }

    return {
      total_amount: totalAmount,
      count: data?.length || 0,
      by_bank: byBank,
    }
  } catch (error) {
    console.error('Error getting today transactions summary:', error)
    return { total_amount: 0, count: 0, by_bank: {} }
  }
}

export interface RecaudoDashboardStats {
  total_recaudo_mes: number
  today_recaudo: number
  today_count: number
  unidentified_count: number
  identification_rate: number
  by_status: Record<string, { count: number; amount: number }>
}

export async function getRecaudoDashboardStatsAction(
  businessId: string
): Promise<RecaudoDashboardStats> {
  try {
    const supabase = await getSupabaseAdminClient()

    // Obtener el primer día del mes actual
    const now = new Date()
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const today = now.toISOString().split('T')[0]

    // Obtener todas las transacciones del mes
    const { data: monthData, error: monthError } = await supabase
      .from('bank_transactions')
      .select('amount, status')
      .eq('business_id', businessId)
      .gte('transaction_date', firstDayOfMonth.toISOString().split('T')[0])

    if (monthError) throw monthError

    // Obtener transacciones de hoy
    const { data: todayData, error: todayError } = await supabase
      .from('bank_transactions')
      .select('amount')
      .eq('business_id', businessId)
      .eq('transaction_date', today)

    if (todayError) throw todayError

    // Obtener conteo de no identificadas
    const { count: unidentifiedCount, error: unidentifiedError } = await supabase
      .from('bank_transactions')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .in('status', ['unidentified', 'no_nit'])

    if (unidentifiedError) throw unidentifiedError

    // Obtener conteo total para tasa de identificación
    const { count: totalCount, error: totalError } = await supabase
      .from('bank_transactions')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId)

    if (totalError) throw totalError

    // Calcular estadísticas
    let totalRecaudoMes = 0
    const byStatus: Record<string, { count: number; amount: number }> = {}

    for (const tx of monthData || []) {
      const amount = Number(tx.amount) || 0
      totalRecaudoMes += amount

      const status = tx.status || 'unknown'
      if (!byStatus[status]) {
        byStatus[status] = { count: 0, amount: 0 }
      }
      byStatus[status].count++
      byStatus[status].amount += amount
    }

    let todayRecaudo = 0
    for (const tx of todayData || []) {
      todayRecaudo += Number(tx.amount) || 0
    }

    const identifiedCount = (totalCount || 0) - (unidentifiedCount || 0)
    const identificationRate = totalCount ? (identifiedCount / totalCount) * 100 : 0

    return {
      total_recaudo_mes: totalRecaudoMes,
      today_recaudo: todayRecaudo,
      today_count: todayData?.length || 0,
      unidentified_count: unidentifiedCount || 0,
      identification_rate: identificationRate,
      by_status: byStatus,
    }
  } catch (error) {
    console.error('Error getting recaudo dashboard stats:', error)
    return {
      total_recaudo_mes: 0,
      today_recaudo: 0,
      today_count: 0,
      unidentified_count: 0,
      identification_rate: 0,
      by_status: {},
    }
  }
}

export interface RecaudoByBank {
  bank_name: string
  count: number
  amount: number
  percentage: number
}

export async function getDistinctBanksAction(
  businessId: string
): Promise<string[]> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { data, error } = await supabase
      .from('bank_transactions')
      .select('bank_name')
      .eq('business_id', businessId)
      .not('bank_name', 'is', null)

    if (error) throw error

    const uniqueBanks = [
      ...new Set(data.map((t) => t.bank_name).filter(Boolean)),
    ]
    return uniqueBanks.sort()
  } catch (error) {
    console.error('Error getting distinct banks:', error)
    return []
  }
}

export async function getRecaudoByBankAction(
  businessId: string
): Promise<RecaudoByBank[]> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { data, error } = await supabase
      .from('bank_transactions')
      .select('amount, bank_name')
      .eq('business_id', businessId)

    if (error) throw error

    // Agrupar por banco
    const byBank: Record<string, { count: number; amount: number }> = {}
    let totalAmount = 0

    for (const tx of data || []) {
      const amount = Number(tx.amount) || 0
      const bank = tx.bank_name || 'Sin banco'
      totalAmount += amount

      if (!byBank[bank]) {
        byBank[bank] = { count: 0, amount: 0 }
      }
      byBank[bank].count++
      byBank[bank].amount += amount
    }

    // Convertir a array y calcular porcentajes
    const result: RecaudoByBank[] = Object.entries(byBank)
      .map(([bank_name, stats]) => ({
        bank_name,
        count: stats.count,
        amount: stats.amount,
        percentage: totalAmount > 0 ? (stats.amount / totalAmount) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount)

    return result
  } catch (error) {
    console.error('Error getting recaudo by bank:', error)
    return []
  }
}

async function insertRecord<T>(
  tableName: string,
  data: Record<string, any>
): Promise<T | null> {
  try {
    const client = await getSupabaseAdminClient()
    const { data: result, error } = await client
      .from(tableName)
      .insert(data as any)
      .select()
      .single()

    if (error) {
      console.error(`Error inserting into ${tableName}:`, error)
      throw error
    }

    return result as T
  } catch (error) {
    console.error(`Error in insertRecord for ${tableName}:`, error)
    throw error
  }
}
