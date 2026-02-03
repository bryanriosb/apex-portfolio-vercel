export type SignatureRequestStatus =
  | 'pending'
  | 'sent'
  | 'viewed'
  | 'signed'
  | 'expired'
  | 'cancelled'

export type SignatureRequestChannel = 'whatsapp' | 'email' | 'sms'

export interface ISignatureRequest {
  id: string
  submission_id: string
  business_id?: string | null
  customer_id?: string | null
  medical_record_id?: string | null
  token: string
  status: SignatureRequestStatus
  sent_via: SignatureRequestChannel | null
  sent_to: string | null
  sent_at: string | null
  viewed_at: string | null
  view_count: number
  signed_at: string | null
  signature_ip: string | null
  expires_at: string
  created_by: string | null
  created_at: string
  updated_at: string
  extra_ref_fields?: Record<string, any> | null
}

export type SignatureRequest = ISignatureRequest

export interface SignatureRequestInsert {
  submission_id: string
  business_id?: string | null
  customer_id?: string | null
  medical_record_id?: string | null
  token: string
  expires_at?: string
  created_by?: string | null
  extra_ref_fields?: Record<string, any> | null
}

export interface SignatureRequestUpdate {
  status?: SignatureRequestStatus
  sent_via?: SignatureRequestChannel | null
  sent_to?: string | null
  sent_at?: string | null
  viewed_at?: string | null
  view_count?: number
  signed_at?: string | null
  signature_ip?: string | null
  medical_record_id?: string | null
  extra_ref_fields?: Record<string, any> | null
}

// Datos para la vista pública de firma
export interface SignatureRequestPublicData {
  id: string
  token: string
  status: SignatureRequestStatus
  expires_at: string
  business_name: string
  business_logo?: string | null
  customer_name: string
  record_date: string
  record_type: string
  is_expired: boolean
  is_signed: boolean
  medical_record_id?: string | null
}

// Datos del medical record para la página de firma
export interface SignatureRequestMedicalRecordView {
  id: string
  record_date: string
  record_type: string
  chief_complaint: string | null
  clinical_notes: string | null
  vital_signs: Record<string, unknown> | null
  allergies: Record<string, unknown> | null
  medical_history: Record<string, unknown> | null
  treatment_plan: Record<string, unknown> | null
  extended_data: Record<string, unknown> | null
  form_template_schema: Record<string, unknown> | null
}

// Payload para procesar firma
export interface ProcessSignaturePayload {
  token: string
  signature_data: string
  signed_by_name: string
  signed_by_document?: string
}

// Respuesta de crear solicitud de firma
export interface CreateSignatureRequestResponse {
  success: boolean
  request_id?: string
  token?: string
  signature_url?: string
  error?: string
}

// Parámetros para generar enlace de firma
export interface GenerateSignatureLinkParams {
  medicalRecordId: string
  createdBy?: string
  expiresDays?: number
}

// Respuesta de procesar firma
export interface ProcessSignatureResponse {
  success: boolean
  medical_record_id?: string
  error?: string
}
