export type CommissionStatus = 'pending' | 'approved' | 'paid' | 'cancelled'

export interface SpecialistCommission {
  id: string
  business_id: string
  specialist_id: string
  appointment_id: string
  commission_config_id: string | null
  service_total_cents: number
  appointment_total_cents: number
  commission_cents: number
  commission_rate: number
  status: CommissionStatus
  paid_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface SpecialistCommissionInsert {
  business_id: string
  specialist_id: string
  appointment_id: string
  commission_config_id?: string | null
  service_total_cents: number
  appointment_total_cents: number
  commission_cents: number
  commission_rate: number
  status?: CommissionStatus
  notes?: string | null
}

export interface SpecialistCommissionUpdate {
  status?: CommissionStatus
  paid_at?: string | null
  notes?: string | null
}

export interface SpecialistCommissionWithDetails extends SpecialistCommission {
  specialist?: {
    id: string
    first_name: string
    last_name: string | null
    profile_picture_url: string | null
  }
  appointment?: {
    id: string
    start_time: string
    end_time: string
    status: string
    payment_status: string
  }
  commission_config?: {
    id: string
    name: string
    commission_type: string
    commission_value: number
  } | null
}

export interface CommissionSummary {
  specialist_id: string
  specialist_name: string
  profile_picture_url: string | null
  total_appointments: number
  total_services_cents: number
  total_commissions_cents: number
  pending_cents: number
  approved_cents: number
  paid_cents: number
}

export const COMMISSION_STATUS_LABELS: Record<CommissionStatus, string> = {
  pending: 'Pendiente',
  approved: 'Aprobada',
  paid: 'Pagada',
  cancelled: 'Cancelada',
}

export const COMMISSION_STATUS_COLORS: Record<CommissionStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-blue-100 text-blue-800',
  paid: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}
