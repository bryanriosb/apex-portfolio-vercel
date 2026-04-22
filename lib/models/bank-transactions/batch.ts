export type BankTransactionBatchStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'

export interface BankTransactionBatch {
  id: string
  business_id: string

  file_name: string

  total_records: number
  identified_count: number
  unidentified_count: number
  no_nit_count: number
  duplicate_count: number

  status: BankTransactionBatchStatus

  created_by?: string | null
  created_at: string
  completed_at?: string | null
}

export interface BankTransactionBatchInsert {
  business_id: string
  file_name: string
  total_records?: number
  identified_count?: number
  unidentified_count?: number
  no_nit_count?: number
  duplicate_count?: number
  status?: BankTransactionBatchStatus
  created_by?: string | null
}

export interface BankTransactionBatchUpdate {
  total_records?: number
  identified_count?: number
  unidentified_count?: number
  no_nit_count?: number
  duplicate_count?: number
  status?: BankTransactionBatchStatus
  completed_at?: string | null
}

export interface BankTransactionBatchStats {
  total: number
  identified: number
  unidentified: number
  no_nit: number
  duplicates: number
  identification_rate: number
}
