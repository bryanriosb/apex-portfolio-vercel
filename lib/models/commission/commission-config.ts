export type CommissionType = 'percentage' | 'fixed'
export type CommissionBasis = 'service_total' | 'appointment_total'

export interface CommissionConfig {
  id: string
  business_id: string
  specialist_id: string | null
  name: string
  commission_type: CommissionType
  commission_value: number
  commission_basis: CommissionBasis
  is_default: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CommissionConfigInsert {
  business_id: string
  specialist_id?: string | null
  name: string
  commission_type: CommissionType
  commission_value: number
  commission_basis?: CommissionBasis
  is_default?: boolean
  is_active?: boolean
}

export interface CommissionConfigUpdate {
  name?: string
  specialist_id?: string | null
  commission_type?: CommissionType
  commission_value?: number
  commission_basis?: CommissionBasis
  is_default?: boolean
  is_active?: boolean
}

export interface CommissionConfigWithSpecialist extends CommissionConfig {
  specialist?: {
    id: string
    first_name: string
    last_name: string | null
    profile_picture_url: string | null
  } | null
}

export const COMMISSION_TYPE_LABELS: Record<CommissionType, string> = {
  percentage: 'Porcentaje',
  fixed: 'Monto fijo',
}

export const COMMISSION_BASIS_LABELS: Record<CommissionBasis, string> = {
  service_total: 'Total de servicios',
  appointment_total: 'Total de la cita',
}

export function calculateCommission(
  totalCents: number,
  config: CommissionConfig
): number {
  if (config.commission_type === 'percentage') {
    return Math.round((totalCents * config.commission_value) / 100)
  }
  return config.commission_value * 100
}
