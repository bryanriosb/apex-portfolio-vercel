'use server'

import { getSupabaseAdminClient } from '@/lib/actions/supabase'
import { getCollectionConfigAction } from '@/lib/actions/collection/config'
import { getCurrentUser } from '@/lib/services/auth/supabase-auth'
import {
  createBankTransactionBatchAction,
  completeBankTransactionBatchAction,
  failBankTransactionBatchAction,
} from './batch'
import type { BankTransactionBatchStats } from '@/lib/models/bank-transactions'
import type { BankTransactionInsert } from '@/lib/models/bank-transactions'
import {
  prepareTransactionInserts,
  type ParsedBankTransaction,
  type BankSheetData,
} from '@/lib/services/bank-transactions/import-service'

function generateDuplicateKey(tx: {
  business_id: string
  transaction_date: string
  amount: number
  reference?: string | null
}): string {
  return `${tx.business_id}|${tx.transaction_date}|${tx.amount}|${tx.reference || ''}`
}

async function detectExistingDuplicates(
  businessId: string,
  transactions: ParsedBankTransaction[]
): Promise<Set<string>> {
  if (transactions.length === 0) return new Set()

  const supabase = await getSupabaseAdminClient()
  const duplicateKeys = new Set<string>()

  // Obtener todas las fechas únicas para filtrar eficientemente
  const uniqueDates = [...new Set(transactions.map((tx) => tx.transaction_date))]

  // Consultar transacciones existentes por fecha (más eficiente que OR complejos)
  for (const date of uniqueDates) {
    const transactionsForDate = transactions.filter(
      (tx) => tx.transaction_date === date
    )
    const amounts = [...new Set(transactionsForDate.map((tx) => tx.amount))]

    // Consultar todas las transacciones existentes para esta fecha y montos
    const { data: existing, error } = await supabase
      .from('bank_transactions')
      .select('transaction_date, amount, reference')
      .eq('business_id', businessId)
      .eq('transaction_date', date)
      .in('amount', amounts)

    if (error) {
      console.error('Error detecting duplicates for date:', date, error)
      continue
    }

    // Filtrar en memoria para coincidencia exacta (incluyendo reference)
    const existingKeys = new Set(
      (existing || []).map(
        (tx) => `${businessId}|${tx.transaction_date}|${tx.amount}|${tx.reference || ''}`
      )
    )

    for (const key of existingKeys) {
      duplicateKeys.add(key)
    }
  }

  return duplicateKeys
}

export interface ImportPreviewData {
  fileName: string
  sheets: BankSheetData[]
  totalTransactions: number
  errors: string[]
  dateFormat: string
}

export interface ImportResultData {
  success: boolean
  batchId?: string
  stats?: BankTransactionBatchStats
  errors?: string[]
  requiresConfig?: boolean
}

export async function validateImportConfigAction(
  businessId: string
): Promise<{ valid: boolean; dateFormat?: string; error?: string }> {
  const config = await getCollectionConfigAction(businessId)

  if (!config.success) {
    return { valid: false, error: 'Error al obtener configuración' }
  }

  if (!config.data?.input_date_format) {
    return {
      valid: false,
      error: 'Debe configurar el formato de fecha en Configuración de Cobros',
    }
  }

  return { valid: true, dateFormat: config.data.input_date_format }
}

async function matchTransactionsWithCustomers(
  businessId: string,
  transactions: ParsedBankTransaction[]
): Promise<Record<string, string>> {
  const supabase = await getSupabaseAdminClient()
  const matched: Record<string, string> = {}
  const uniqueNits = new Set<string>()

  for (const tx of transactions) {
    if (tx.customer_nit) {
      uniqueNits.add(tx.customer_nit)
    }
  }

  if (uniqueNits.size === 0) {
    return matched
  }

  const nitArray = Array.from(uniqueNits)
  const batchSize = 500

  for (let i = 0; i < nitArray.length; i += batchSize) {
    const batch = nitArray.slice(i, i + batchSize)

    const { data: customers, error } = await supabase
      .from('business_customers')
      .select('id, nit')
      .eq('business_id', businessId)
      .in('nit', batch)

    if (error) {
      console.error('Error matching customers:', error)
      continue
    }

    for (const customer of customers || []) {
      matched[customer.nit] = customer.id
    }
  }

  return matched
}

export async function importBankTransactionsAction(
  fileName: string,
  sheets: BankSheetData[],
  businessId: string
): Promise<ImportResultData> {
  const configValidation = await validateImportConfigAction(businessId)

  if (!configValidation.valid) {
    return {
      success: false,
      errors: [configValidation.error || 'Configuración inválida'],
      requiresConfig: true,
    }
  }

  const allTransactions = sheets.flatMap((s) => s.transactions)

  if (allTransactions.length === 0) {
    const allErrors = sheets.flatMap((s) => s.errors)
    return {
      success: false,
      errors: allErrors.length > 0 ? allErrors : ['No se encontraron transacciones válidas'],
    }
  }

  const user = await getCurrentUser()

  const batchResult = await createBankTransactionBatchAction({
    business_id: businessId,
    file_name: fileName,
    total_records: allTransactions.length,
    created_by: user?.id || null,
  })

  if (!batchResult.success || !batchResult.data) {
    return {
      success: false,
      errors: [batchResult.error || 'Error al crear batch de importación'],
    }
  }

  const batchId = batchResult.data.id

  try {
    const customerMatches = await matchTransactionsWithCustomers(
      businessId,
      allTransactions
    )

    const inserts = prepareTransactionInserts(
      businessId,
      batchId,
      allTransactions,
      customerMatches,
      fileName
    )

    const existingDuplicates = await detectExistingDuplicates(
      businessId,
      allTransactions
    )

    const duplicatesToInsert: BankTransactionInsert[] = []
    const newTransactionsToInsert: BankTransactionInsert[] = []

    for (const insert of inserts) {
      const key = generateDuplicateKey({
        business_id: insert.business_id,
        transaction_date: insert.transaction_date,
        amount: insert.amount,
        reference: insert.reference,
      })

      if (existingDuplicates.has(key)) {
        duplicatesToInsert.push({
          ...insert,
          status: 'duplicate',
        })
      } else {
        newTransactionsToInsert.push(insert)
      }
    }

    const supabase = await getSupabaseAdminClient()
    const dbBatchSize = 500
    let insertedCount = 0
    let dbDuplicateCount = 0

    for (let i = 0; i < newTransactionsToInsert.length; i += dbBatchSize) {
      const batch = newTransactionsToInsert.slice(i, i + dbBatchSize)

      const { data, error } = await supabase
        .from('bank_transactions')
        .insert(batch)
        .select('id')

      if (error) {
        if (error.code === '23505') {
          dbDuplicateCount += batch.length
        } else {
          console.error('Error inserting batch:', error)
        }
      } else {
        insertedCount += data?.length || 0
      }
    }

    for (let i = 0; i < duplicatesToInsert.length; i += dbBatchSize) {
      const batch = duplicatesToInsert.slice(i, i + dbBatchSize)

      const { error } = await supabase
        .from('bank_transactions')
        .insert(batch)

      if (error) {
        console.error('Error inserting duplicates batch:', error)
      }
    }

    const totalDuplicateCount = duplicatesToInsert.length + dbDuplicateCount

    const stats = {
      identified_count: inserts.filter((t) => t.status === 'identified').length,
      unidentified_count: inserts.filter((t) => t.status === 'unidentified').length,
      no_nit_count: inserts.filter((t) => t.status === 'no_nit').length,
      duplicate_count: totalDuplicateCount,
    }

    await completeBankTransactionBatchAction(batchId, stats)

    const allErrors = sheets.flatMap((s) => s.errors)

    return {
      success: true,
      batchId,
      stats: {
        total: allTransactions.length,
        identified: stats.identified_count,
        unidentified: stats.unidentified_count,
        no_nit: stats.no_nit_count,
        duplicates: stats.duplicate_count,
        identification_rate:
          allTransactions.length > 0
            ? Number(((stats.identified_count / allTransactions.length) * 100).toFixed(2))
            : 0,
      },
      errors: allErrors.length > 0 ? allErrors : undefined,
    }
  } catch (error: any) {
    console.error('Error during import:', error)

    await failBankTransactionBatchAction(batchId, error.message)

    return {
      success: false,
      batchId,
      errors: [`Error durante la importación: ${error.message}`],
    }
  }
}
