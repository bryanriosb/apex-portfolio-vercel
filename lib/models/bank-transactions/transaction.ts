export type BankTransactionStatus =
  | 'identified'
  | 'unidentified'
  | 'no_nit'
  | 'duplicate'
  | 'manual'

export interface BankTransaction {
  id: string
  business_id: string
  execution_id?: string | null
  customer_id?: string | null
  import_batch_id?: string | null

  transaction_date: string
  amount: number
  bank_name: string

  customer_nit?: string | null
  customer_name_extract?: string | null
  reference?: string | null
  description?: string | null
  agent_name?: string | null

  receipt_status?: string | null
  notes?: string | null
  status: BankTransactionStatus

  matched_at?: string | null
  matched_by?: string | null

  source_file_name?: string | null
  source_sheet_name?: string | null
  raw_data: Record<string, any>

  created_at: string
  updated_at: string

  customer?: {
    id: string
    full_name: string
    nit: string
  } | null

  execution?: {
    id: string
    name: string
  } | null
}

export interface BankTransactionInsert {
  business_id: string
  execution_id?: string | null
  customer_id?: string | null
  import_batch_id?: string | null

  transaction_date: string
  amount: number
  bank_name: string

  customer_nit?: string | null
  customer_name_extract?: string | null
  reference?: string | null
  description?: string | null
  agent_name?: string | null

  receipt_status?: string | null
  notes?: string | null
  status?: BankTransactionStatus

  matched_at?: string | null
  matched_by?: string | null

  source_file_name?: string | null
  source_sheet_name?: string | null
  raw_data?: Record<string, any>
}

export interface BankTransactionUpdate {
  execution_id?: string | null
  customer_id?: string | null
  status?: BankTransactionStatus
  matched_at?: string | null
  matched_by?: string | null
  notes?: string | null
}

export const COLUMN_MAPPINGS: Record<string, string[]> = {
  fecha: ['FECHA', ' FECHA', 'Fecha', 'fecha_transaccion'],
  valor: ['VALOR', 'Valor', 'monto', 'amount'],
  nit: ['NIT', 'Nit', 'nit_cliente', 'documento'],
  nombre: ['NOMBRE CLIENTE', 'Nombre Cliente', 'razon_social', 'cliente'],
  referencia: ['REFERENCIA', 'Referencia', 'descripcion', 'concepto'],
  agente: ['AGENTE SIESA', 'EQUIPO FACT Y CARTERA', 'agente', 'gestor'],
  recibo: ['RECIBO', 'OK RECIBO', 'OK RECIBIO ', 'confirmado'],
  novedad: ['NOVEDAD', 'Novedad', 'nota', 'observacion'],
}
