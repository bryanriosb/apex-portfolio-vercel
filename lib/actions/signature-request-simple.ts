// Función simplificada para obtener medical record por token sin JOINs problemáticos
import { getSupabaseAdminClient } from '@/lib/actions/supabase'
import type {
  SignatureRequestMedicalRecordView,
} from '@/lib/models/signature-request/signature-request'

export async function getMedicalRecordForSignatureByTokenAction(
  token: string
): Promise<SignatureRequestMedicalRecordView | null> {
  try {
    const supabase = await getSupabaseAdminClient()

    // 1. Obtener la solicitud de firma primero
    const { data: request, error: requestError } = await supabase
      .from('signature_requests')
      .select('*') // Seleccionar todo sin hints
      .eq('token', token)
      .single()

    if (requestError || !request) {
      console.error('Error fetching signature request:', requestError)
      return null
    }

    // 2. Validar estado
    const now = new Date()
    const expiresAt = new Date(request.expires_at)

    if (expiresAt < now || request.status === 'cancelled') {
      return null
    }

    // 3. Determinar el ID del medical record
    const medicalRecordId = request.medical_record_id || request.submission_id
    if (!medicalRecordId) {
      console.error('No medical record ID found in request')
      return null
    }

    // 4. Marcar como visto (opcional, no bloquear si falla)
    try {
      await supabase.rpc('mark_signature_viewed', { p_token: token })
    } catch (error) {
      console.warn('Failed to mark as viewed:', error)
      // Continuar aunque falle
    }

    // 5. Obtener el medical record por separado
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
          json_schema
        )
      `)
      .eq('id', medicalRecordId)
      .single()

    if (error) {
      console.error('Error fetching medical record:', error)
      return null
    }

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
      form_template_schema: (data.form_template as any)?.json_schema || null,
    }
  } catch (error) {
    console.error('Error in getMedicalRecordForSignatureByTokenAction:', error)
    return null
  }
}