'use server'

import {
  insertRecord,
  updateRecord,
  deleteRecord,
  getSupabaseAdminClient,
} from '@/lib/actions/supabase'
import type {
  CommissionConfig,
  CommissionConfigInsert,
  CommissionConfigUpdate,
  CommissionConfigWithSpecialist,
} from '@/lib/models/commission/commission-config'
import type {
  SpecialistCommission,
  SpecialistCommissionInsert,
  SpecialistCommissionUpdate,
  SpecialistCommissionWithDetails,
  CommissionSummary,
  CommissionStatus,
} from '@/lib/models/commission/specialist-commission'

export interface CommissionConfigListResponse {
  data: CommissionConfigWithSpecialist[]
  total: number
  total_pages: number
}

export interface SpecialistCommissionListResponse {
  data: SpecialistCommissionWithDetails[]
  total: number
  total_pages: number
}

// ========== COMMISSION CONFIG ACTIONS ==========

export async function fetchCommissionConfigsAction(params?: {
  page?: number
  page_size?: number
  business_id?: string
  specialist_id?: string
  is_active?: boolean
}): Promise<CommissionConfigListResponse> {
  try {
    const supabase = await getSupabaseAdminClient()
    let query = supabase
      .from('commission_configs')
      .select(`
        *,
        specialist:specialists(
          id,
          first_name,
          last_name,
          profile_picture_url
        )
      `)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false })

    if (params?.business_id) {
      query = query.eq('business_id', params.business_id)
    }

    if (params?.specialist_id) {
      query = query.eq('specialist_id', params.specialist_id)
    }

    if (params?.is_active !== undefined) {
      query = query.eq('is_active', params.is_active)
    }

    const { data: configs, error } = await query

    if (error) {
      console.error('Error fetching commission configs:', error)
      return { data: [], total: 0, total_pages: 0 }
    }

    const page = params?.page || 1
    const pageSize = params?.page_size || 20
    const start = (page - 1) * pageSize
    const end = start + pageSize

    const paginatedData = (configs || []).slice(start, end)
    const totalPages = Math.ceil((configs || []).length / pageSize)

    return {
      data: paginatedData as CommissionConfigWithSpecialist[],
      total: (configs || []).length,
      total_pages: totalPages,
    }
  } catch (error) {
    console.error('Error fetching commission configs:', error)
    return { data: [], total: 0, total_pages: 0 }
  }
}

export async function getCommissionConfigByIdAction(
  id: string
): Promise<CommissionConfigWithSpecialist | null> {
  try {
    const supabase = await getSupabaseAdminClient()
    const { data, error } = await supabase
      .from('commission_configs')
      .select(`
        *,
        specialist:specialists(
          id,
          first_name,
          last_name,
          profile_picture_url
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching commission config:', error)
      return null
    }

    return data as CommissionConfigWithSpecialist
  } catch (error) {
    console.error('Error fetching commission config:', error)
    return null
  }
}

export async function createCommissionConfigAction(
  data: CommissionConfigInsert
): Promise<{ success: boolean; data?: CommissionConfig; error?: string }> {
  try {
    if (data.is_default) {
      const supabase = await getSupabaseAdminClient()
      await supabase
        .from('commission_configs')
        .update({ is_default: false })
        .eq('business_id', data.business_id)
        .eq('is_default', true)
    }

    const config = await insertRecord<CommissionConfig>('commission_configs', data)
    if (!config) {
      return { success: false, error: 'Error al crear la configuración' }
    }
    return { success: true, data: config }
  } catch (error: any) {
    console.error('Error creating commission config:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}

export async function updateCommissionConfigAction(
  id: string,
  data: CommissionConfigUpdate
): Promise<{ success: boolean; data?: CommissionConfig; error?: string }> {
  try {
    if (data.is_default) {
      const supabase = await getSupabaseAdminClient()
      const { data: current } = await supabase
        .from('commission_configs')
        .select('business_id')
        .eq('id', id)
        .single()

      if (current) {
        await supabase
          .from('commission_configs')
          .update({ is_default: false })
          .eq('business_id', current.business_id)
          .eq('is_default', true)
          .neq('id', id)
      }
    }

    const config = await updateRecord<CommissionConfig>('commission_configs', id, data)
    if (!config) {
      return { success: false, error: 'Error al actualizar la configuración' }
    }
    return { success: true, data: config }
  } catch (error: any) {
    console.error('Error updating commission config:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}

export async function deleteCommissionConfigAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await deleteRecord('commission_configs', id)
    return { success: true }
  } catch (error: any) {
    console.error('Error deleting commission config:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}

export async function getDefaultCommissionConfigAction(
  businessId: string,
  specialistId?: string
): Promise<CommissionConfig | null> {
  try {
    const supabase = await getSupabaseAdminClient()

    // 1. Buscar config específica para el especialista
    if (specialistId) {
      const { data: specialistConfig } = await supabase
        .from('commission_configs')
        .select('*')
        .eq('business_id', businessId)
        .eq('specialist_id', specialistId)
        .eq('is_active', true)
        .single()

      if (specialistConfig) {
        return specialistConfig as CommissionConfig
      }
    }

    // 2. Buscar config marcada como default
    const { data: defaultConfig } = await supabase
      .from('commission_configs')
      .select('*')
      .eq('business_id', businessId)
      .eq('is_default', true)
      .eq('is_active', true)
      .single()

    if (defaultConfig) {
      return defaultConfig as CommissionConfig
    }

    // 3. Fallback: buscar cualquier config activa del negocio (sin specialist_id específico)
    const { data: anyConfig } = await supabase
      .from('commission_configs')
      .select('*')
      .eq('business_id', businessId)
      .is('specialist_id', null)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    return anyConfig as CommissionConfig | null
  } catch (error) {
    console.error('Error fetching default commission config:', error)
    return null
  }
}

// ========== SPECIALIST COMMISSION ACTIONS ==========

export async function fetchSpecialistCommissionsAction(params?: {
  page?: number
  page_size?: number
  business_id?: string
  specialist_id?: string
  status?: CommissionStatus[]
  start_date?: string
  end_date?: string
}): Promise<SpecialistCommissionListResponse> {
  try {
    const supabase = await getSupabaseAdminClient()
    let query = supabase
      .from('specialist_commissions')
      .select(`
        *,
        specialist:specialists(
          id,
          first_name,
          last_name,
          profile_picture_url
        ),
        appointment:appointments(
          id,
          start_time,
          end_time,
          status,
          payment_status
        ),
        commission_config:commission_configs(
          id,
          name,
          commission_type,
          commission_value
        )
      `)
      .order('created_at', { ascending: false })

    if (params?.business_id) {
      query = query.eq('business_id', params.business_id)
    }

    if (params?.specialist_id) {
      query = query.eq('specialist_id', params.specialist_id)
    }

    if (params?.status && params.status.length > 0) {
      query = query.in('status', params.status)
    }

    if (params?.start_date) {
      query = query.gte('created_at', params.start_date)
    }

    if (params?.end_date) {
      query = query.lte('created_at', params.end_date)
    }

    const { data: commissions, error } = await query

    if (error) {
      console.error('Error fetching specialist commissions:', error)
      return { data: [], total: 0, total_pages: 0 }
    }

    const page = params?.page || 1
    const pageSize = params?.page_size || 20
    const start = (page - 1) * pageSize
    const end = start + pageSize

    const paginatedData = (commissions || []).slice(start, end)
    const totalPages = Math.ceil((commissions || []).length / pageSize)

    return {
      data: paginatedData as SpecialistCommissionWithDetails[],
      total: (commissions || []).length,
      total_pages: totalPages,
    }
  } catch (error) {
    console.error('Error fetching specialist commissions:', error)
    return { data: [], total: 0, total_pages: 0 }
  }
}

export async function createSpecialistCommissionAction(
  data: SpecialistCommissionInsert
): Promise<{ success: boolean; data?: SpecialistCommission; error?: string }> {
  try {
    const commission = await insertRecord<SpecialistCommission>('specialist_commissions', data)
    if (!commission) {
      return { success: false, error: 'Error al crear la comisión' }
    }
    return { success: true, data: commission }
  } catch (error: any) {
    console.error('Error creating specialist commission:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}

export async function updateSpecialistCommissionAction(
  id: string,
  data: SpecialistCommissionUpdate
): Promise<{ success: boolean; data?: SpecialistCommission; error?: string }> {
  try {
    const updateData = { ...data }
    if (data.status === 'paid' && !data.paid_at) {
      updateData.paid_at = new Date().toISOString()
    }

    const commission = await updateRecord<SpecialistCommission>('specialist_commissions', id, updateData)
    if (!commission) {
      return { success: false, error: 'Error al actualizar la comisión' }
    }
    return { success: true, data: commission }
  } catch (error: any) {
    console.error('Error updating specialist commission:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}

export async function bulkUpdateCommissionStatusAction(
  ids: string[],
  status: CommissionStatus
): Promise<{ success: boolean; updatedCount: number; error?: string }> {
  try {
    const supabase = await getSupabaseAdminClient()
    const updateData: any = { status }

    if (status === 'paid') {
      updateData.paid_at = new Date().toISOString()
    }

    const { error } = await supabase
      .from('specialist_commissions')
      .update(updateData)
      .in('id', ids)

    if (error) {
      return { success: false, updatedCount: 0, error: error.message }
    }

    return { success: true, updatedCount: ids.length }
  } catch (error: any) {
    console.error('Error bulk updating commissions:', error)
    return { success: false, updatedCount: 0, error: error.message || 'Error desconocido' }
  }
}

export async function getCommissionSummaryAction(params: {
  business_id: string
  start_date?: string
  end_date?: string
}): Promise<CommissionSummary[]> {
  try {
    const supabase = await getSupabaseAdminClient()

    let query = supabase
      .from('specialist_commissions')
      .select(`
        specialist_id,
        service_total_cents,
        commission_cents,
        status,
        specialist:specialists(
          id,
          first_name,
          last_name,
          profile_picture_url
        )
      `)
      .eq('business_id', params.business_id)

    if (params.start_date) {
      query = query.gte('created_at', params.start_date)
    }

    if (params.end_date) {
      query = query.lte('created_at', params.end_date)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching commission summary:', error)
      return []
    }

    const summaryMap = new Map<string, CommissionSummary>()

    for (const row of data || []) {
      const specialistId = row.specialist_id
      const specialist = row.specialist as any

      if (!summaryMap.has(specialistId)) {
        summaryMap.set(specialistId, {
          specialist_id: specialistId,
          specialist_name: specialist
            ? `${specialist.first_name} ${specialist.last_name || ''}`.trim()
            : 'Desconocido',
          profile_picture_url: specialist?.profile_picture_url || null,
          total_appointments: 0,
          total_services_cents: 0,
          total_commissions_cents: 0,
          pending_cents: 0,
          approved_cents: 0,
          paid_cents: 0,
        })
      }

      const summary = summaryMap.get(specialistId)!
      summary.total_appointments += 1
      summary.total_services_cents += row.service_total_cents
      summary.total_commissions_cents += row.commission_cents

      switch (row.status) {
        case 'pending':
          summary.pending_cents += row.commission_cents
          break
        case 'approved':
          summary.approved_cents += row.commission_cents
          break
        case 'paid':
          summary.paid_cents += row.commission_cents
          break
      }
    }

    return Array.from(summaryMap.values()).sort(
      (a, b) => b.total_commissions_cents - a.total_commissions_cents
    )
  } catch (error) {
    console.error('Error fetching commission summary:', error)
    return []
  }
}

export async function calculateAndCreateCommissionAction(
  appointmentId: string,
  businessId: string,
  specialistId: string
): Promise<{ success: boolean; data?: SpecialistCommission; error?: string }> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { data: existing } = await supabase
      .from('specialist_commissions')
      .select('id')
      .eq('appointment_id', appointmentId)
      .single()

    if (existing) {
      return { success: false, error: 'Ya existe una comisión para esta cita' }
    }

    const { data: appointment } = await supabase
      .from('appointments')
      .select(`
        id,
        total_price_cents,
        appointment_services(
          price_at_booking_cents,
          specialist_id
        )
      `)
      .eq('id', appointmentId)
      .single()

    if (!appointment) {
      return { success: false, error: 'Cita no encontrada' }
    }

    const services = appointment.appointment_services as any[] || []
    const specialistServices = services.filter(
      (s) => s.specialist_id === specialistId || !s.specialist_id
    )
    const serviceTotalCents = specialistServices.reduce(
      (sum, s) => sum + (s.price_at_booking_cents || 0),
      0
    )

    const config = await getDefaultCommissionConfigAction(businessId, specialistId)

    if (!config) {
      return { success: false, error: 'No hay configuración de comisión activa' }
    }

    let commissionCents: number
    let basis: number

    if (config.commission_basis === 'appointment_total') {
      basis = appointment.total_price_cents
    } else {
      basis = serviceTotalCents
    }

    if (config.commission_type === 'percentage') {
      commissionCents = Math.round((basis * config.commission_value) / 100)
    } else {
      commissionCents = config.commission_value * 100
    }

    const commissionData: SpecialistCommissionInsert = {
      business_id: businessId,
      specialist_id: specialistId,
      appointment_id: appointmentId,
      commission_config_id: config.id,
      service_total_cents: serviceTotalCents,
      appointment_total_cents: appointment.total_price_cents,
      commission_cents: commissionCents,
      commission_rate: config.commission_value,
      status: 'pending',
    }

    return await createSpecialistCommissionAction(commissionData)
  } catch (error: any) {
    console.error('Error calculating commission:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}
