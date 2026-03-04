export type WhatsAppConfigStatus = 'active' | 'inactive' | 'pending_verification'

export interface WhatsAppConfig {
  id: string
  business_account_id: string | null
  business_id: string | null
  is_shared: boolean
  phone_number_id: string
  whatsapp_business_account_id: string
  access_token: string
  webhook_verify_token: string
  display_phone_number: string | null
  status: WhatsAppConfigStatus
  is_enabled: boolean
  created_at: string
  updated_at: string
}

export interface WhatsAppConfigInsert {
  business_account_id?: string | null
  business_id?: string | null
  is_shared?: boolean
  phone_number_id: string
  whatsapp_business_account_id: string
  access_token: string
  webhook_verify_token: string
  display_phone_number?: string | null
  status?: WhatsAppConfigStatus
  is_enabled?: boolean
}

export interface WhatsAppConfigUpdate {
  phone_number_id?: string
  whatsapp_business_account_id?: string
  access_token?: string
  webhook_verify_token?: string
  display_phone_number?: string | null
  status?: WhatsAppConfigStatus
  is_enabled?: boolean
  is_shared?: boolean
}

export interface WhatsAppConversation {
  id: string
  business_account_id: string
  business_id: string
  phone: string
  customer_name: string | null
  last_message_at: string
  expires_at: string
  is_active: boolean
  created_at: string
}

export interface WhatsAppConversationInsert {
  business_account_id: string
  business_id: string
  phone: string
  customer_name?: string | null
}

export interface WhatsAppMessage {
  id: string
  business_account_id: string
  business_id: string
  conversation_id: string | null
  whatsapp_message_id: string | null
  to_phone: string
  from_phone: string | null
  direction: 'inbound' | 'outbound'
  message_type: WhatsAppMessageType
  content: string
  media_url: string | null
  template_name: string | null
  status: WhatsAppMessageStatus
  error_message: string | null
  sent_at: string | null
  delivered_at: string | null
  read_at: string | null
  created_at: string
}

export type WhatsAppMessageType = 'text' | 'image' | 'document' | 'audio' | 'video' | 'template' | 'interactive'
export type WhatsAppMessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed'

export interface WhatsAppMessageInsert {
  business_account_id: string
  business_id: string
  conversation_id?: string | null
  whatsapp_message_id?: string | null
  to_phone: string
  from_phone?: string | null
  direction: 'inbound' | 'outbound'
  message_type: WhatsAppMessageType
  content: string
  media_url?: string | null
  template_name?: string | null
  status?: WhatsAppMessageStatus
  error_message?: string | null
  sent_at?: string | null
}

export interface SendTextMessageParams {
  business_account_id: string
  business_id: string
  to: string
  message: string
  customer_name?: string
}

export interface SendTemplateMessageParams {
  business_account_id: string
  business_id: string
  to: string
  template_name: string
  language_code?: string
  components?: WhatsAppTemplateComponent[]
  customer_name?: string
}

export interface WhatsAppTemplateComponent {
  type: 'header' | 'body' | 'button'
  parameters: WhatsAppTemplateParameter[]
}

export interface WhatsAppTemplateParameter {
  type: 'text' | 'currency' | 'date_time' | 'image' | 'document' | 'video'
  text?: string
  currency?: { fallback_value: string; code: string; amount_1000: number }
  date_time?: { fallback_value: string }
  image?: { link: string }
  document?: { link: string; filename?: string }
  video?: { link: string }
}

export interface WhatsAppWebhookPayload {
  object: string
  entry: WhatsAppWebhookEntry[]
}

export interface WhatsAppWebhookEntry {
  id: string
  changes: WhatsAppWebhookChange[]
}

export interface WhatsAppWebhookChange {
  value: {
    messaging_product: string
    metadata: {
      display_phone_number: string
      phone_number_id: string
    }
    contacts?: Array<{
      profile: { name: string }
      wa_id: string
    }>
    messages?: WhatsAppIncomingMessage[]
    statuses?: WhatsAppMessageStatusUpdate[]
  }
  field: string
}

export interface WhatsAppIncomingMessage {
  from: string
  id: string
  timestamp: string
  type: WhatsAppMessageType
  text?: { body: string }
  image?: { id: string; mime_type: string; sha256: string; caption?: string }
  document?: { id: string; filename: string; mime_type: string }
  audio?: { id: string; mime_type: string }
  video?: { id: string; mime_type: string; caption?: string }
  interactive?: {
    type: string
    button_reply?: { id: string; title: string }
    list_reply?: { id: string; title: string; description?: string }
  }
}

export interface WhatsAppMessageStatusUpdate {
  id: string
  status: 'sent' | 'delivered' | 'read' | 'failed'
  timestamp: string
  recipient_id: string
  errors?: Array<{ code: number; title: string; message: string }>
}
