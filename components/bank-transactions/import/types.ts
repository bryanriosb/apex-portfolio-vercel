import type { BankSheetData } from '@/lib/services/bank-transactions/import-service'
import type { BankTransactionBatchStats } from '@/lib/models/bank-transactions'
import type { WizardStep } from '@/components/ui/step-indicator'

export const TRANSACTIONS_WIZARD_STEPS: WizardStep[] = [
  {
    id: 1,
    title: 'Cargar Transacciones',
    description: 'Sube el archivo de extracto bancario',
  },
  {
    id: 2,
    title: 'Vista Previa',
    description: 'Revisa las transacciones detectadas por banco',
  },
  {
    id: 3,
    title: 'Resultado',
    description: 'Resumen de la importación',
  },
]

export interface ImportFileData {
  fileName: string
  sheets: BankSheetData[]
  totalTransactions: number
  errors: string[]
  dateFormat: string
}

export interface ImportResult {
  success: boolean
  batchId?: string
  stats?: BankTransactionBatchStats
  errors?: string[]
}

export interface BankPreviewSummary {
  bankName: string
  sheetName: string
  totalRecords: number
  validRecords: number
  errorCount: number
  withNitCount: number
  noNitCount: number
  totalAmount: number
}
