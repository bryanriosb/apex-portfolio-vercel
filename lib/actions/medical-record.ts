'use server'

import {
  getRecordById,
  insertRecord,
  updateRecord,
  deleteRecord,
  getSupabaseAdminClient,
} from '@/lib/actions/supabase'
import type {
  MedicalRecord,
  MedicalRecordInsert,
  MedicalRecordUpdate,
  MedicalRecordWithCustomer,
  MedicalRecordWithDetails,
} from '@/lib/models/medical-record/medical-record'

export interface MedicalRecordListResponse {
  data: MedicalRecordWithCustomer[]
  total: number
  total_pages: number
}

export async function fetchMedicalRecordsAction(params?: {
  page?: number
  page_size?: number
  business_id?: string
  customer_id?: string
  specialist_id?: string
  record_type?: string
  status?: string
  search?: string
  date_from?: string
  date_to?: string
}): Promise<MedicalRecordListResponse> {
  try {
    if (!params?.business_id) {
      return { data: [], total: 0, total_pages: 0 }
    }

    const supabase = await getSupabaseAdminClient()

    let query = supabase
      .from('medical_records')
      .select(
        `
        *,
        customer:business_customers!customer_id (
          id,
          first_name,
          last_name,
          email,
          phone,
          status
        )
      `,
        { count: 'exact' }
      )
      .eq('business_id', params.business_id)
      .neq('status', 'deleted')
      .order('record_date', { ascending: false })

    if (params.customer_id) {
      query = query.eq('customer_id', params.customer_id)
    }

    if (params.specialist_id) {
      query = query.eq('specialist_id', params.specialist_id)
    }

    if (params.record_type) {
      query = query.eq('record_type', params.record_type)
    }

    if (params.status) {
      query = query.eq('status', params.status)
    }

    if (params.date_from) {
      query = query.gte('record_date', params.date_from)
    }

    if (params.date_to) {
      query = query.lte('record_date', params.date_to)
    }

    if (params.search) {
      query = query.or(`chief_complaint.ilike.%${params.search}%,clinical_notes.ilike.%${params.search}%`)
    }

    const page = params.page || 1
    const pageSize = params.page_size || 20
    const start = (page - 1) * pageSize
    const end = start + pageSize - 1

    query = query.range(start, end)

    const { data, error, count } = await query

    if (error) throw error

    return {
      data: (data || []) as MedicalRecordWithCustomer[],
      total: count || 0,
      total_pages: Math.ceil((count || 0) / pageSize),
    }
  } catch (error) {
    console.error('Error fetching medical records:', error)
    return { data: [], total: 0, total_pages: 0 }
  }
}

export async function getMedicalRecordByIdAction(
  id: string
): Promise<MedicalRecordWithDetails | null> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { data, error } = await supabase
      .from('medical_records')
      .select(
        `
        *,
        customer:business_customers!customer_id (
          id,
          first_name,
          last_name,
          email,
          phone,
          status,
          birthday,
          metadata
        ),
        specialist:specialists!specialist_id (
          id,
          first_name,
          last_name
        )
      `
      )
      .eq('id', id)
      .single()

    if (error) throw error
    return data as MedicalRecordWithDetails
  } catch (error) {
    console.error('Error fetching medical record:', error)
    return null
  }
}

export async function getCustomerMedicalHistoryAction(
  businessId: string,
  customerId: string
): Promise<MedicalRecord[]> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { data, error } = await supabase
      .from('medical_records')
      .select('*')
      .eq('business_id', businessId)
      .eq('customer_id', customerId)
      .neq('status', 'deleted')
      .order('record_date', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching customer medical history:', error)
    return []
  }
}

export async function createMedicalRecordAction(
  data: MedicalRecordInsert
): Promise<{ success: boolean; data?: MedicalRecord; error?: string }> {
  try {
    const record = await insertRecord<MedicalRecord>('medical_records', {
      ...data,
      status: data.status || 'active',
    })

    if (!record) {
      return { success: false, error: 'Error al crear la historia clínica' }
    }

    return { success: true, data: record }
  } catch (error: any) {
    console.error('Error creating medical record:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}

export async function updateMedicalRecordAction(
  id: string,
  data: MedicalRecordUpdate
): Promise<{ success: boolean; data?: MedicalRecord; error?: string }> {
  try {
    const record = await updateRecord<MedicalRecord>('medical_records', id, data)

    if (!record) {
      return { success: false, error: 'Error al actualizar la historia clínica' }
    }

    return { success: true, data: record }
  } catch (error: any) {
    console.error('Error updating medical record:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}

export async function archiveMedicalRecordAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await updateRecord('medical_records', id, { status: 'archived' })
    return { success: true }
  } catch (error: any) {
    console.error('Error archiving medical record:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}

export async function deleteMedicalRecordAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await updateRecord('medical_records', id, { status: 'deleted' })
    return { success: true }
  } catch (error: any) {
    console.error('Error deleting medical record:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}

export async function deleteMedicalRecordsAction(
  ids: string[]
): Promise<{ success: boolean; deletedCount: number; error?: string }> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { error } = await supabase
      .from('medical_records')
      .update({ status: 'deleted' })
      .in('id', ids)

    if (error) throw error

    return { success: true, deletedCount: ids.length }
  } catch (error: any) {
    console.error('Error batch deleting medical records:', error)
    return { success: false, deletedCount: 0, error: error.message }
  }
}

export async function signMedicalRecordAsSpecialistAction(
  medicalRecordId: string,
  signatureData: string,
  specialistId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { error } = await supabase
      .from('medical_records')
      .update({
        specialist_signature_data: signatureData,
        specialist_signature_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', medicalRecordId)

    if (error) throw error

    return { success: true }
  } catch (error: any) {
    console.error('Error signing medical record as specialist:', error)
    return { success: false, error: error.message || 'Error al firmar el registro' }
  }
}

export async function getLatestMedicalRecordAction(
  businessId: string,
  customerId: string
): Promise<MedicalRecord | null> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { data, error } = await supabase
      .from('medical_records')
      .select('*')
      .eq('business_id', businessId)
      .eq('customer_id', customerId)
      .neq('status', 'deleted')
      .order('record_date', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching latest medical record:', error)
    return null
  }
}
