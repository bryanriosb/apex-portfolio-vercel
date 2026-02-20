// types.ts - Tipos compartidos del wizard de campañas
import { BusinessCustomer } from '@/lib/models/customer/business-customer'

export interface WizardStep {
  id: number
  title: string
  description: string
}

export const WIZARD_STEPS: WizardStep[] = [
  {
    id: 1,
    title: 'Cargar Facturas',
    description: 'Sube el archivo de facturas y valida la información',
  },
  {
    id: 2,
    title: 'Revisar Umbrales',
    description: 'Verifica la asignación de plantillas según días de mora',
  },
  {
    id: 3,
    title: 'Configurar Envío',
    description: 'Selecciona estrategia y programa la ejecución',
  },
]

export const REQUIRED_COLUMNS = [
  'nit',
  'amount_due',
  'invoice_number',
  'invoice_date',
  'due_date',
  'days_overdue',
] as const

export interface Invoice {
  amount_due: string
  invoice_number: string
  invoice_date: string
  due_date: string
  days_overdue: string
  [key: string]: any
}

export interface GroupedClient {
  nit: string
  invoices: Invoice[]
  customer?: BusinessCustomer
  status: 'pending' | 'found' | 'not_found'
  total: {
    total_amount_due: number
    total_days_overdue: number
    total_invoices: number
  }
}

export interface FileData {
  fileName: string
  rowCount: number
  columns: string[]
  valid: boolean
  missingColumns: string[]
  groupedClients: Map<string, GroupedClient>
}

export interface EmailConfig {
  // Ya no se selecciona plantilla - se asigna por umbral automáticamente
  attachmentIds: string[]
}

// Sample template data for download
export const TEMPLATE_DATA = [
  {
    nit: '900123456',
    amount_due: '1500000',
    invoice_number: 'FAC-001',
    invoice_date: '2024-01-15',
    due_date: '2024-02-15',
    days_overdue: '15',
  },
  {
    nit: '900123456',
    amount_due: '500000',
    invoice_number: 'FAC-003',
    invoice_date: '2024-01-20',
    due_date: '2024-02-18',
    days_overdue: '12',
  },
  {
    nit: '52123456',
    amount_due: '850000',
    invoice_number: 'FAC-002',
    invoice_date: '2024-01-10',
    due_date: '2024-02-20',
    days_overdue: '10',
  },
]

// Strategy types
export type StrategyType = 'ramp_up' | 'batch' | 'conservative' | 'aggressive'

export interface StrategyOption {
  value: StrategyType
  label: string
  description: string
  icon: string
}

export const STRATEGY_OPTIONS: StrategyOption[] = [
  {
    value: 'ramp_up',
    label: 'Ramp Up',
    description: 'Incremento gradual para optimizar la entregabilidad',
    icon: 'TrendingUp',
  },
  {
    value: 'batch',
    label: 'Batch',
    description: 'Envío por lotes de tamaño estándar',
    icon: 'Mail',
  },
  {
    value: 'conservative',
    label: 'Conservador',
    description: 'Envío lento y seguro para máxima reputación',
    icon: 'Shield',
  },
]

// Database strategy type
export interface DatabaseStrategy {
  id: string
  name: string
  description?: string | null
  strategy_type: StrategyType
  is_default: boolean
  rampup_day_1_limit: number
  rampup_day_2_limit: number
  rampup_day_3_5_limit: number
  rampup_day_6_plus_limit: number
  batch_size: number
  batch_interval_minutes: number
  max_batches_per_day: number
  concurrent_batches: number
  min_open_rate_threshold: number
  min_delivery_rate_threshold: number
  max_bounce_rate_threshold: number
  max_complaint_rate_threshold: number
}
