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

// Columnas requeridas con soporte para español e inglés
// El sistema acepta nombres en español (preferidos) o inglés (legado)
export const REQUIRED_COLUMNS = [
  'nit',
  'monto',
  'numero_factura',
  'fecha_factura',
  'fecha_vencimiento',
  'dias_mora',
] as const

// Mapeo de columnas en español a nombres internos en inglés
// NOTA: Las claves deben estar SIN tildes porque normalizeColumnName() las elimina
// Soporta nombres amigables (con espacios) y nombres técnicos (snake_case)
export const COLUMN_MAPPING: Record<string, string> = {
  // Nombres amigables (preferidos para plantillas) - SIN TILDES
  'nit': 'nit',
  'monto': 'amount_due',
  'numero de factura': 'invoice_number',
  'fecha de factura': 'invoice_date',
  'fecha de vencimiento': 'due_date',
  'dias de mora': 'days_overdue',
  // Nombres técnicos (snake_case - retrocompatibilidad) - SIN TILDES
  'numero_factura': 'invoice_number',
  'fecha_factura': 'invoice_date',
  'fecha_vencimiento': 'due_date',
  'dias_mora': 'days_overdue',
  // Inglés (legado - para retrocompatibilidad)
  'amount_due': 'amount_due',
  'invoice_number': 'invoice_number',
  'invoice_date': 'invoice_date',
  'due_date': 'due_date',
  'days_overdue': 'days_overdue',
}

// Columnas en español para mostrar en la UI
export const COLUMN_LABELS: Record<string, string> = {
  'nit': 'NIT',
  'monto': 'Monto',
  'numero_factura': 'Número de Factura',
  'fecha_factura': 'Fecha de Factura',
  'fecha_vencimiento': 'Fecha de Vencimiento',
  'dias_mora': 'Días de Mora',
}

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
  status: 'pending' | 'found' | 'not_found' | 'blacklisted'
  total: {
    total_amount_due: number
    total_days_overdue: number
    total_invoices: number
  }
  emailValidation?: {
    validEmails: string[]
    blacklistedEmails: Array<{
      email: string
      bounceType?: string
      bounceReason?: string
    }>
  }
}

export interface BlacklistValidationResult {
  clientNit: string
  clientName: string
  originalEmails: string[]
  validEmails: string[]
  blacklistedEmails: Array<{
    email: string
    bounceType?: string
    bounceReason?: string
  }>
  isFullyBlacklisted: boolean
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
  // Pero permitimos un fallback opcional
  templateId?: string
  attachmentIds: string[]
}

// Sample template data for download (usando nombres amigables en español)
export const TEMPLATE_DATA = [
  {
    'NIT': '900123456',
    'Monto': '1500000',
    'Número de Factura': 'FAC-001',
    'Fecha de Factura': '2024-01-15',
    'Fecha de Vencimiento': '2024-02-15',
    'Días de Mora': '15',
  },
  {
    'NIT': '900123456',
    'Monto': '500000',
    'Número de Factura': 'FAC-003',
    'Fecha de Factura': '2024-01-20',
    'Fecha de Vencimiento': '2024-02-18',
    'Días de Mora': '12',
  },
  {
    'NIT': '52123456',
    'Monto': '850000',
    'Número de Factura': 'FAC-002',
    'Fecha de Factura': '2024-01-10',
    'Fecha de Vencimiento': '2024-02-20',
    'Días de Mora': '10',
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
