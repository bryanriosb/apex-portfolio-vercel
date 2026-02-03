'use server'

import { headers } from 'next/headers'
import { getSupabaseAdminClient } from '@/lib/actions/supabase'
import type {
  SignatureRequest,
  SignatureRequestUpdate,
  SignatureRequestPublicData,
  SignatureRequestMedicalRecordView,
  CreateSignatureRequestResponse,
  ProcessSignatureResponse,
  SignatureRequestChannel,
} from '@/lib/models/signature-request/signature-request'

export async function fetchSignatureRequestsAction(params: {
  business_id: string
  submission_id?: string
  status?: string
  page?: number
  page_size?: number
}): Promise<{ data: SignatureRequest[]; total: number }> {
  try {
    const supabase = await getSupabaseAdminClient()

    let query = supabase
      .from('signature_requests')
      .select('*', { count: 'exact' })
      .eq('business_id', params.business_id)
      .order('created_at', { ascending: false })

    if (params.submission_id) {
      query = query.eq('submission_id', params.submission_id)
    }

    if (params.status) {
      query = query.eq('status', params.status)
    }

    const page = params.page || 1
    const pageSize = params.page_size || 20
    const start = (page - 1) * pageSize
    const end = start + pageSize - 1

    query = query.range(start, end)

    const { data, error, count } = await query

    if (error) throw error

    return {
      data: (data || []) as SignatureRequest[],
      total: count || 0,
    }
  } catch (error) {
    console.error('Error fetching signature requests:', error)
    return { data: [], total: 0 }
  }
}

export async function getSignatureRequestByTokenAction(
  token: string
): Promise<SignatureRequestPublicData | null> {
  try {
    const supabase = await getSupabaseAdminClient()

    // Primero obtener la solicitud de firma sin JOINs problemáticos
    const { data: request, error: requestError } = await supabase
      .from('signature_requests')
      .select('*')
      .eq('token', token)
      .single()

    if (requestError || !request) {
      if (requestError) throw requestError
      return null
    }

    // Determinar el ID del medical record a usar
    const medicalRecordId = request.medical_record_id || request.submission_id
    if (!medicalRecordId) {
      return null
    }

    // Obtener el medical record y sus relaciones por separado
    const { data: medicalRecord, error: medicalError } = await supabase
      .from('medical_records')
      .select(`
        record_date,
        record_type,
        business:businesses!business_id (
          name,
          logo_url
        ),
        customer:business_customers!customer_id (
          first_name,
          last_name
        )
      `)
      .eq('id', medicalRecordId)
      .single()

    if (medicalError) throw medicalError

    const business = medicalRecord?.business as any
    const customer = medicalRecord?.customer as any
    const now = new Date()
    const expiresAt = new Date(request.expires_at)

    return {
      id: request.id,
      token: request.token,
      status: request.status,
      expires_at: request.expires_at,
      business_name: business?.name || '',
      business_logo: business?.logo_url || null,
      customer_name: customer
        ? `${customer.first_name} ${customer.last_name || ''}`.trim()
        : '',
      record_date: medicalRecord?.record_date || '',
      record_type: medicalRecord?.record_type || '',
      is_expired: expiresAt < now,
      is_signed: request.status === 'signed',
      medical_record_id: medicalRecordId,
    }
  } catch (error) {
    console.error('Error fetching signature request by token:', error)
    return null
  }
} 

export async function getMedicalRecordForSignatureByTokenAction(
  token: string
): Promise<SignatureRequestMedicalRecordView | null> {
  try {
    const supabase = await getSupabaseAdminClient()

    // Primero obtener la solicitud de firma
    const { data: request, error: requestError } = await supabase
      .from('signature_requests')
      .select('submission_id, medical_record_id, status, expires_at')
      .eq('token', token)
      .single()

    if (requestError || !request) return null

    const now = new Date()
    const expiresAt = new Date(request.expires_at)

    if (expiresAt < now || request.status === 'cancelled') {
      return null
    }

    // Marcar como visto - comentar temporalmente si falla
    try {
      await supabase.rpc('mark_signature_viewed', { p_token: token })
    } catch (error) {
      console.warn('Failed to mark as viewed:', error)
      // Continuar aunque falle el marcado como visto
    }

    // Determinar el ID del medical record
    const medicalRecordId = request.medical_record_id || request.submission_id
    if (!medicalRecordId) return null

    // Obtener el medical record con el form template
    const { data, error } = await supabase
      .from('medical_records')
      .select(`
        id,
        record_date,
        record_type,
        chief_complaint,
        clinical_notes,
        vital_signs,
        allergies,
        medical_history,
        treatment_plan,
        extended_data,
        form_template:form_templates!form_template_id (
          toon_schema
        )
      `)
      .eq('id', medicalRecordId)
      .single()

    if (error) throw error

    return {
      id: data.id,
      record_date: data.record_date,
      record_type: data.record_type,
      chief_complaint: data.chief_complaint,
      clinical_notes: data.clinical_notes,
      vital_signs: data.vital_signs,
      allergies: data.allergies,
      medical_history: data.medical_history,
      treatment_plan: data.treatment_plan,
      extended_data: data.extended_data,
      form_template_schema: (data.form_template as any)?.toon_schema || null,
    }
  } catch (error) {
    console.error('Error fetching medical record for signature:', error)
    return null
  }
}

export async function getMedicalRecordForSignatureAction(
  token: string
): Promise<SignatureRequestMedicalRecordView | null> {
  try {
    const supabase = await getSupabaseAdminClient()

    // Primero verificar que el token es válido y no está expirado
    // Importante: No usar select que pueda disparar JOIN automático
    const { data: request, error: requestError } = await supabase
      .from('signature_requests')
      .select('*') // Seleccionar todo para evitar hints de JOIN
      .eq('token', token)
      .single()

    if (requestError || !request) return null

    const now = new Date()
    const expiresAt = new Date(request.expires_at)

    if (expiresAt < now || request.status === 'cancelled') {
      return null
    }

    // Marcar como visto
    await supabase.rpc('mark_signature_viewed', { p_token: token })

    // Determinar el ID del medical record
    const medicalRecordId = request.medical_record_id || request.submission_id

    // Obtener el medical record con el form template (sin JOINs que usen submission_id)
    const { data, error } = await supabase
      .from('medical_records')
      .select(`
        id,
        record_date,
        record_type,
        chief_complaint,
        clinical_notes,
        vital_signs,
        allergies,
        medical_history,
        treatment_plan,
        extended_data,
        form_template:form_templates!form_template_id (
          toon_schema
        )
      `)
      .eq('id', medicalRecordId)
      .single()

    if (error) throw error

    return {
      id: data.id,
      record_date: data.record_date,
      record_type: data.record_type,
      chief_complaint: data.chief_complaint,
      clinical_notes: data.clinical_notes,
      vital_signs: data.vital_signs,
      allergies: data.allergies,
      medical_history: data.medical_history,
      treatment_plan: data.treatment_plan,
      extended_data: data.extended_data,
      form_template_schema: (data.form_template as any)?.toon_schema || null,
    }
  } catch (error) {
    console.error('Error fetching medical record for signature:', error)
    return null
  }
}

export async function createSignatureRequestAction(
  medicalRecordId: string,
  createdBy?: string,
  expiresDays: number = 7
): Promise<CreateSignatureRequestResponse> {
  try {
    const supabase = await getSupabaseAdminClient()

    // Usar la función de PostgreSQL para crear la solicitud
    const { data, error } = await supabase.rpc('create_signature_request', {
      p_submission_id: medicalRecordId,
      p_created_by: createdBy || null,
      p_expires_days: expiresDays,
    })

    if (error) throw error

    if (!data || data.length === 0) {
      return { success: false, error: 'No se pudo crear la solicitud' }
    }

    const result = data[0]
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || ''
    const signatureUrl = `${baseUrl}/sign/${result.token}`

    return {
      success: true,
      request_id: result.request_id,
      token: result.token,
      signature_url: signatureUrl,
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    console.error('Error creating signature request:', error)
    return { success: false, error: errorMessage }
  }
}

// Generar enlace de firma sin enviarlo
export async function generateSignatureLinkAction(
  medicalRecordId: string,
  createdBy?: string,
  expiresDays: number = 7
): Promise<CreateSignatureRequestResponse> {
  try {
    const supabase = await getSupabaseAdminClient()

    // Usar la función específica para generar enlace sin enviar
    const { data, error } = await supabase.rpc('generate_signature_link', {
      p_medical_record_id: medicalRecordId,
      p_created_by: createdBy || null,
      p_expires_days: expiresDays,
    })

    if (error) throw error

    if (!data || data.length === 0) {
      return { success: false, error: 'No se pudo generar el enlace de firma' }
    }

    const result = data[0]
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || ''
    const signatureUrl = `${baseUrl}/sign/${result.token}`

    return {
      success: true,
      request_id: result.request_id,
      token: result.token,
      signature_url: signatureUrl,
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    console.error('Error generating signature link:', error)
    return { success: false, error: errorMessage }
  }
}

export async function updateSignatureRequestSentAction(
  requestId: string,
  channel: SignatureRequestChannel,
  sentTo: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { error } = await supabase
      .from('signature_requests')
      .update({
        status: 'sent',
        sent_via: channel,
        sent_to: sentTo,
        sent_at: new Date().toISOString(),
      })
      .eq('id', requestId)

    if (error) throw error

    return { success: true }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    console.error('Error updating signature request sent:', error)
    return { success: false, error: errorMessage }
  }
}

export async function processSignatureAction(
  token: string,
  signatureData: string,
  signedByName: string,
  signedByDocument?: string,
  signatureIp?: string
): Promise<ProcessSignatureResponse> {
  // Si no se proporciona IP, intentar obtenerla de los headers (solo disponible en server actions)
  let clientIp = signatureIp
  if (!clientIp) {
    try {
      const requestHeaders = headers()
      clientIp = requestHeaders.get('x-forwarded-for') || 
                requestHeaders.get('x-real-ip') || 
                requestHeaders.get('cf-connecting-ip') || // Cloudflare
                requestHeaders.get('x-client-ip') ||
                undefined
    } catch (error) {
      // Silenciar error si no estamos en un contexto de request
      console.warn('No se pudo obtener la IP del cliente:', error)
    }
  }
  try {
    const supabase = await getSupabaseAdminClient()

    const { data, error } = await supabase.rpc('process_signature', {
      p_token: token,
      p_signature_data: signatureData,
      p_signed_by_name: signedByName,
      p_signed_by_document: signedByDocument || null,
      p_signature_ip: clientIp || null,
    })

    if (error) throw error

    if (!data.success) {
      return { success: false, error: data.error }
    }

    return {
      success: true,
      medical_record_id: data.medical_record_id,
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    console.error('Error processing signature:', error)
    return { success: false, error: errorMessage }
  }
}

export async function cancelSignatureRequestAction(
  requestId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { error } = await supabase
      .from('signature_requests')
      .update({ status: 'cancelled' })
      .eq('id', requestId)
      .in('status', ['pending', 'sent', 'viewed'])

    if (error) throw error

    return { success: true }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    console.error('Error cancelling signature request:', error)
    return { success: false, error: errorMessage }
  }
}

export async function getLatestSignatureRequestAction(
  medicalRecordId: string
): Promise<SignatureRequest | null> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { data, error } = await supabase
      .from('signature_requests')
      .select('*')
      .or(`medical_record_id.eq.${medicalRecordId},submission_id.eq.${medicalRecordId}`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error

    return data as SignatureRequest | null
  } catch (error) {
    console.error('Error fetching latest signature request:', error)
    return null
  }
}
