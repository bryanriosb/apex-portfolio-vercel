'use server'

import { getSupabaseAdminClient } from '@/lib/actions/supabase'
import type {
  WhatsAppConfig,
  WhatsAppConfigInsert,
  WhatsAppConfigUpdate,
  WhatsAppMessage,
  WhatsAppMessageInsert,
  WhatsAppConversation,
  SendTextMessageParams,
  SendTemplateMessageParams,
} from '@/lib/models/whatsapp/whatsapp-config'
import { validateFeatureAccess } from '@/lib/helpers/feature-permission-guard'

const WHATSAPP_API_VERSION = 'v21.0'
const WHATSAPP_API_URL = 'https://graph.facebook.com'

interface WhatsAppAPIResponse {
  messaging_product: string
  contacts: Array<{ input: string; wa_id: string }>
  messages: Array<{ id: string }>
}

async function getWhatsAppConfig(
  business_account_id: string,
  business_id?: string
): Promise<WhatsAppConfig | null> {
  const supabase = await getSupabaseAdminClient()

  // 1. Buscar config específica del business (premium)
  if (business_id) {
    const { data: businessConfig } = await supabase
      .from('whatsapp_configs')
      .select('*')
      .eq('business_account_id', business_account_id)
      .eq('business_id', business_id)
      .eq('is_shared', false)
      .eq('is_enabled', true)
      .single()

    if (businessConfig) return businessConfig
  }

  // 2. Buscar config específica de la cuenta
  const { data: accountConfig } = await supabase
    .from('whatsapp_configs')
    .select('*')
    .eq('business_account_id', business_account_id)
    .is('business_id', null)
    .eq('is_shared', false)
    .eq('is_enabled', true)
    .single()

  if (accountConfig) return accountConfig

  // 3. Usar config compartida
  const { data: sharedConfig, error } = await supabase
    .from('whatsapp_configs')
    .select('*')
    .eq('is_shared', true)
    .eq('is_enabled', true)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching WhatsApp config:', error)
  }

  return sharedConfig || null
}

async function callWhatsAppAPI(
  phoneNumberId: string,
  accessToken: string,
  payload: Record<string, unknown>
): Promise<{ success: boolean; data?: WhatsAppAPIResponse; error?: string }> {
  try {
    const messageType = payload.type as string
    const logInfo: Record<string, unknown> = {
      phoneNumberId,
      type: messageType,
    }

    if (messageType === 'template') {
      logInfo.template = (payload.template as Record<string, unknown>)?.name
      logInfo.language = (payload.template as Record<string, unknown>)?.language
    } else if (messageType === 'text') {
      const textBody = (payload.text as Record<string, unknown>)?.body as string
      logInfo.preview = textBody?.substring(0, 50) + (textBody?.length > 50 ? '...' : '')
    }

    console.log('📤 WhatsApp API request:', logInfo)
    const response = await fetch(
      `${WHATSAPP_API_URL}/${WHATSAPP_API_VERSION}/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    )

    const data = await response.json()

    if (!response.ok) {
      console.error('WhatsApp API error:', data)
      return {
        success: false,
        error: data.error?.message || 'Error al enviar mensaje'
      }
    }

    return { success: true, data }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    console.error('WhatsApp API call failed:', error)
    return { success: false, error: errorMessage }
  }
}

async function getOrCreateConversation(
  business_account_id: string,
  business_id: string,
  phone: string,
  customer_name?: string
): Promise<string> {
  const supabase = await getSupabaseAdminClient()

  // Primero intentar buscar conversación activa existente
  const { data: existingConversation } = await supabase
    .from('whatsapp_conversations')
    .select('id')
    .eq('business_id', business_id)
    .eq('phone', phone)
    .eq('is_active', true)
    .single()

  if (existingConversation) {
    // Actualizar last_message_at y customer_name si se proporciona
    await supabase
      .from('whatsapp_conversations')
      .update({
        last_message_at: new Date().toISOString(),
        ...(customer_name && { customer_name }),
      })
      .eq('id', existingConversation.id)

    return existingConversation.id
  }

  // Si no existe, intentar crear usando el RPC
  const { data, error } = await supabase.rpc('get_or_create_whatsapp_conversation', {
    p_business_account_id: business_account_id,
    p_business_id: business_id,
    p_phone: phone,
    p_customer_name: customer_name || null,
  })

  if (error) {
    // Si hay error de duplicado, buscar la conversación que ya existe
    if (error.code === '23505') {
      const { data: conversation } = await supabase
        .from('whatsapp_conversations')
        .select('id')
        .eq('business_id', business_id)
        .eq('phone', phone)
        .eq('is_active', true)
        .single()

      if (conversation) {
        return conversation.id
      }
    }
    console.error('Error getting/creating conversation:', error)
    throw error
  }

  return data
}

export async function sendWhatsAppTextMessageAction(
  params: SendTextMessageParams
): Promise<{ success: boolean; data?: WhatsAppMessage; error?: string }> {
  try {
    const permissionCheck = await validateFeatureAccess(
      params.business_account_id,
      'appointments',
      'whatsapp_notifications'
    )

    if (!permissionCheck.success) {
      return { success: false, error: permissionCheck.error }
    }

    const config = await getWhatsAppConfig(params.business_account_id, params.business_id)
    if (!config) {
      return { success: false, error: 'WhatsApp no está configurado' }
    }

    const conversationId = await getOrCreateConversation(
      params.business_account_id,
      params.business_id,
      params.to,
      params.customer_name
    )

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: params.to.replace(/\D/g, ''),
      type: 'text',
      text: { body: params.message },
    }

    const result = await callWhatsAppAPI(config.phone_number_id, config.access_token, payload)

    if (!result.success) {
      await saveWhatsAppMessage({
        business_account_id: params.business_account_id,
        business_id: params.business_id,
        conversation_id: conversationId,
        to_phone: params.to,
        from_phone: config.display_phone_number,
        direction: 'outbound',
        message_type: 'text',
        content: params.message,
        status: 'failed',
        error_message: result.error,
      })
      return { success: false, error: result.error }
    }

    const message = await saveWhatsAppMessage({
      business_account_id: params.business_account_id,
      business_id: params.business_id,
      conversation_id: conversationId,
      whatsapp_message_id: result.data?.messages[0]?.id,
      to_phone: params.to,
      from_phone: config.display_phone_number,
      direction: 'outbound',
      message_type: 'text',
      content: params.message,
      status: 'sent',
      sent_at: new Date().toISOString(),
    })

    return { success: true, data: message }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    console.error('Error sending WhatsApp text message:', error)
    return { success: false, error: errorMessage }
  }
}

export async function sendWhatsAppTemplateMessageAction(
  params: SendTemplateMessageParams
): Promise<{ success: boolean; data?: WhatsAppMessage; error?: string }> {
  try {
    const permissionCheck = await validateFeatureAccess(
      params.business_account_id,
      'appointments',
      'whatsapp_notifications'
    )

    if (!permissionCheck.success) {
      return { success: false, error: permissionCheck.error }
    }

    const config = await getWhatsAppConfig(params.business_account_id, params.business_id)
    if (!config) {
      return { success: false, error: 'WhatsApp no está configurado' }
    }

    const conversationId = await getOrCreateConversation(
      params.business_account_id,
      params.business_id,
      params.to,
      params.customer_name
    )

    const payload: Record<string, unknown> = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: params.to.replace(/\D/g, ''),
      type: 'template',
      template: {
        name: params.template_name,
        language: {
          code: params.language_code || 'es',
        },
        ...(params.components && { components: params.components }),
      },
    }

    const result = await callWhatsAppAPI(config.phone_number_id, config.access_token, payload)

    if (!result.success) {
      await saveWhatsAppMessage({
        business_account_id: params.business_account_id,
        business_id: params.business_id,
        conversation_id: conversationId,
        to_phone: params.to,
        from_phone: config.display_phone_number,
        direction: 'outbound',
        message_type: 'template',
        content: `Template: ${params.template_name}`,
        template_name: params.template_name,
        status: 'failed',
        error_message: result.error,
      })
      return { success: false, error: result.error }
    }

    const message = await saveWhatsAppMessage({
      business_account_id: params.business_account_id,
      business_id: params.business_id,
      conversation_id: conversationId,
      whatsapp_message_id: result.data?.messages[0]?.id,
      to_phone: params.to,
      from_phone: config.display_phone_number,
      direction: 'outbound',
      message_type: 'template',
      content: `Template: ${params.template_name}`,
      template_name: params.template_name,
      status: 'sent',
      sent_at: new Date().toISOString(),
    })

    return { success: true, data: message }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    console.error('Error sending WhatsApp template message:', error)
    return { success: false, error: errorMessage }
  }
}

async function saveWhatsAppMessage(data: WhatsAppMessageInsert): Promise<WhatsAppMessage> {
  const supabase = await getSupabaseAdminClient()

  const { data: message, error } = await supabase
    .from('whatsapp_messages')
    .insert(data)
    .select()
    .single()

  if (error) {
    console.error('Error saving WhatsApp message:', error)
    throw error
  }

  return message
}

export async function fetchWhatsAppMessagesAction(params: {
  business_id: string
  to_phone?: string
  conversation_id?: string
  page?: number
  page_size?: number
}): Promise<{ data: WhatsAppMessage[]; total: number; total_pages: number }> {
  const supabase = await getSupabaseAdminClient()
  const page = params.page || 1
  const pageSize = params.page_size || 50
  const offset = (page - 1) * pageSize

  let query = supabase
    .from('whatsapp_messages')
    .select('*', { count: 'exact' })
    .eq('business_id', params.business_id)
    .order('created_at', { ascending: false })

  if (params.conversation_id) {
    query = query.eq('conversation_id', params.conversation_id)
  } else if (params.to_phone) {
    query = query.or(`to_phone.eq.${params.to_phone},from_phone.eq.${params.to_phone}`)
  }

  const { data, error, count } = await query.range(offset, offset + pageSize - 1)

  if (error) {
    console.error('Error fetching WhatsApp messages:', error)
    throw error
  }

  return {
    data: data || [],
    total: count || 0,
    total_pages: Math.ceil((count || 0) / pageSize),
  }
}

export async function fetchWhatsAppConversationsAction(params: {
  business_id: string
  only_active?: boolean
  page?: number
  page_size?: number
}): Promise<{ data: WhatsAppConversation[]; total: number }> {
  const supabase = await getSupabaseAdminClient()
  const page = params.page || 1
  const pageSize = params.page_size || 50
  const offset = (page - 1) * pageSize

  let query = supabase
    .from('whatsapp_conversations')
    .select('*', { count: 'exact' })
    .eq('business_id', params.business_id)
    .order('last_message_at', { ascending: false })

  if (params.only_active) {
    query = query.eq('is_active', true).gt('expires_at', new Date().toISOString())
  }

  const { data, error, count } = await query.range(offset, offset + pageSize - 1)

  if (error) {
    console.error('Error fetching WhatsApp conversations:', error)
    throw error
  }

  return {
    data: data || [],
    total: count || 0,
  }
}

export async function getWhatsAppConfigAction(
  business_account_id: string,
  business_id?: string
): Promise<WhatsAppConfig | null> {
  return getWhatsAppConfig(business_account_id, business_id)
}

// Obtener la config compartida (global)
export async function fetchSharedWhatsAppConfigAction(): Promise<WhatsAppConfig | null> {
  const supabase = await getSupabaseAdminClient()

  const { data, error } = await supabase
    .from('whatsapp_configs')
    .select('*')
    .eq('is_shared', true)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching shared WhatsApp config:', error)
    throw error
  }

  return data
}

// Obtener config específica de una cuenta (no compartida)
export async function fetchWhatsAppConfigAction(
  business_account_id: string
): Promise<WhatsAppConfig | null> {
  const supabase = await getSupabaseAdminClient()

  const { data, error } = await supabase
    .from('whatsapp_configs')
    .select('*')
    .eq('business_account_id', business_account_id)
    .is('business_id', null)
    .eq('is_shared', false)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching WhatsApp config:', error)
    throw error
  }

  return data
}

// Crear o actualizar la config compartida
export async function saveSharedWhatsAppConfigAction(
  data: Omit<WhatsAppConfigInsert, 'business_account_id' | 'business_id' | 'is_shared'>
): Promise<{ success: boolean; data?: WhatsAppConfig; error?: string }> {
  try {
    const supabase = await getSupabaseAdminClient()

    // Verificar si ya existe una config compartida
    const { data: existing } = await supabase
      .from('whatsapp_configs')
      .select('id')
      .eq('is_shared', true)
      .single()

    if (existing) {
      // Actualizar la existente
      const { data: config, error } = await supabase
        .from('whatsapp_configs')
        .update(data)
        .eq('id', existing.id)
        .select()
        .single()

      if (error) {
        console.error('Error updating shared WhatsApp config:', error)
        return { success: false, error: error.message }
      }

      return { success: true, data: config }
    } else {
      // Crear nueva config compartida
      const { data: config, error } = await supabase
        .from('whatsapp_configs')
        .insert({
          ...data,
          is_shared: true,
          business_account_id: null,
          business_id: null,
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating shared WhatsApp config:', error)
        return { success: false, error: error.message }
      }

      return { success: true, data: config }
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    console.error('Error in saveSharedWhatsAppConfigAction:', error)
    return { success: false, error: errorMessage }
  }
}

// Crear config específica para una cuenta (premium)
export async function createWhatsAppConfigAction(
  data: WhatsAppConfigInsert
): Promise<{ success: boolean; data?: WhatsAppConfig; error?: string }> {
  try {
    const supabase = await getSupabaseAdminClient()

    // Verificar si ya existe
    let existingQuery = supabase
      .from('whatsapp_configs')
      .select('id')
      .eq('is_shared', false)

    if (data.business_account_id) {
      existingQuery = existingQuery.eq('business_account_id', data.business_account_id)
    }

    if (data.business_id) {
      existingQuery = existingQuery.eq('business_id', data.business_id)
    } else {
      existingQuery = existingQuery.is('business_id', null)
    }

    const { data: existing } = await existingQuery.single()

    if (existing) {
      return { success: false, error: 'Ya existe una configuración de WhatsApp' }
    }

    const { data: config, error } = await supabase
      .from('whatsapp_configs')
      .insert({ ...data, is_shared: false })
      .select()
      .single()

    if (error) {
      console.error('Error creating WhatsApp config:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data: config }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    console.error('Error in createWhatsAppConfigAction:', error)
    return { success: false, error: errorMessage }
  }
}

export async function updateWhatsAppConfigAction(
  id: string,
  data: WhatsAppConfigUpdate
): Promise<{ success: boolean; data?: WhatsAppConfig; error?: string }> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { data: config, error } = await supabase
      .from('whatsapp_configs')
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating WhatsApp config:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data: config }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    console.error('Error in updateWhatsAppConfigAction:', error)
    return { success: false, error: errorMessage }
  }
}

// Eliminar config específica de una cuenta (para volver a usar compartida)
export async function deleteWhatsAppConfigAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await getSupabaseAdminClient()

    // No permitir eliminar la config compartida desde aquí
    const { data: config } = await supabase
      .from('whatsapp_configs')
      .select('is_shared')
      .eq('id', id)
      .single()

    if (config?.is_shared) {
      return { success: false, error: 'No se puede eliminar la configuración compartida' }
    }

    const { error } = await supabase
      .from('whatsapp_configs')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting WhatsApp config:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    console.error('Error in deleteWhatsAppConfigAction:', error)
    return { success: false, error: errorMessage }
  }
}

export async function updateWhatsAppMessageStatusAction(
  whatsapp_message_id: string,
  status: 'sent' | 'delivered' | 'read' | 'failed',
  timestamp?: string,
  error_message?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await getSupabaseAdminClient()

    const updateData: Record<string, unknown> = { status }

    if (status === 'delivered' && timestamp) {
      updateData.delivered_at = new Date(parseInt(timestamp) * 1000).toISOString()
    } else if (status === 'read' && timestamp) {
      updateData.read_at = new Date(parseInt(timestamp) * 1000).toISOString()
    } else if (status === 'failed' && error_message) {
      updateData.error_message = error_message
    }

    const { error } = await supabase
      .from('whatsapp_messages')
      .update(updateData)
      .eq('whatsapp_message_id', whatsapp_message_id)

    if (error) {
      console.error('Error updating message status:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    console.error('Error in updateWhatsAppMessageStatusAction:', error)
    return { success: false, error: errorMessage }
  }
}

export async function processIncomingWhatsAppMessageAction(
  phone_number_id: string,
  from: string,
  message_id: string,
  message_type: string,
  content: string,
  customer_name?: string,
  media_url?: string
): Promise<{ success: boolean; data?: WhatsAppMessage; error?: string }> {
  try {
    const supabase = await getSupabaseAdminClient()

    // Buscar config por phone_number_id (puede ser compartida o específica)
    const { data: config } = await supabase
      .from('whatsapp_configs')
      .select('business_account_id, display_phone_number, is_shared')
      .eq('phone_number_id', phone_number_id)
      .eq('is_enabled', true)
      .single()

    if (!config) {
      return { success: false, error: 'No se encontró configuración para este número' }
    }

    // Si es config compartida, buscar a qué business_account pertenece el teléfono
    // basándose en la conversación más reciente
    let businessAccountId = config.business_account_id

    if (config.is_shared || !businessAccountId) {
      // Buscar conversación activa en cualquier cuenta
      const { data: conversation } = await supabase
        .from('whatsapp_conversations')
        .select('business_account_id, business_id, id')
        .eq('phone', from)
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .order('last_message_at', { ascending: false })
        .limit(1)
        .single()

      if (!conversation) {
        console.log('No active conversation found for incoming message from:', from)
        return { success: false, error: 'No hay conversación activa para este número' }
      }

      const message = await saveWhatsAppMessage({
        business_account_id: conversation.business_account_id,
        business_id: conversation.business_id,
        conversation_id: conversation.id,
        whatsapp_message_id: message_id,
        to_phone: config.display_phone_number || '',
        from_phone: from,
        direction: 'inbound',
        message_type: message_type as WhatsAppMessage['message_type'],
        content,
        media_url,
        status: 'delivered',
      })

      if (customer_name) {
        await supabase
          .from('whatsapp_conversations')
          .update({ customer_name })
          .eq('id', conversation.id)
      }

      return { success: true, data: message }
    }

    // Config específica de cuenta
    const { data: resolved } = await supabase.rpc('resolve_incoming_message_business', {
      p_business_account_id: businessAccountId,
      p_phone: from,
    })

    if (!resolved || resolved.length === 0) {
      console.log('No active conversation found for incoming message from:', from)
      return { success: false, error: 'No hay conversación activa para este número' }
    }

    const { business_id, conversation_id } = resolved[0]

    const message = await saveWhatsAppMessage({
      business_account_id: businessAccountId,
      business_id,
      conversation_id,
      whatsapp_message_id: message_id,
      to_phone: config.display_phone_number || '',
      from_phone: from,
      direction: 'inbound',
      message_type: message_type as WhatsAppMessage['message_type'],
      content,
      media_url,
      status: 'delivered',
    })

    if (customer_name) {
      await supabase
        .from('whatsapp_conversations')
        .update({ customer_name })
        .eq('id', conversation_id)
    }

    return { success: true, data: message }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    console.error('Error processing incoming WhatsApp message:', error)
    return { success: false, error: errorMessage }
  }
}

export async function getWhatsAppConfigByPhoneNumberIdAction(
  phone_number_id: string
): Promise<WhatsAppConfig | null> {
  const supabase = await getSupabaseAdminClient()

  const { data, error } = await supabase
    .from('whatsapp_configs')
    .select('*')
    .eq('phone_number_id', phone_number_id)
    .single()

  if (error) {
    console.error('Error fetching WhatsApp config by phone_number_id:', error)
    return null
  }

  return data
}

// Listar todas las configs (compartida + específicas)
export async function fetchAllWhatsAppConfigsAction(): Promise<WhatsAppConfig[]> {
  const supabase = await getSupabaseAdminClient()

  const { data, error } = await supabase
    .from('whatsapp_configs')
    .select('*')
    .order('is_shared', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching all WhatsApp configs:', error)
    return []
  }

  return data || []
}

// ============================================
// RECORDATORIOS PROGRAMADOS
// ============================================

export interface ScheduledReminder {
  id: string
  appointment_id: string
  business_account_id: string
  business_id: string
  customer_phone: string
  customer_name: string
  scheduled_for: string
  reminder_type: 'appointment_reminder' | 'appointment_confirmation' | 'custom'
  status: 'pending' | 'sent' | 'failed' | 'cancelled'
  error_message: string | null
  sent_at: string | null
  created_at: string
}

export async function createScheduledReminderAction(data: {
  appointment_id: string
  business_account_id: string
  business_id: string
  customer_phone: string
  customer_name: string
  scheduled_for: string
  reminder_type?: 'appointment_reminder' | 'appointment_confirmation' | 'custom'
}): Promise<{ success: boolean; data?: ScheduledReminder; error?: string }> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { data: reminder, error } = await supabase
      .from('whatsapp_scheduled_reminders')
      .insert({
        ...data,
        reminder_type: data.reminder_type || 'appointment_reminder',
      })
      .select()
      .single()

    if (error) {
      // Si ya existe, no es error
      if (error.code === '23505') {
        return { success: true }
      }
      console.error('Error creating scheduled reminder:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data: reminder }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    console.error('Error in createScheduledReminderAction:', error)
    return { success: false, error: errorMessage }
  }
}

export async function cancelScheduledRemindersAction(
  appointment_id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { error } = await supabase
      .from('whatsapp_scheduled_reminders')
      .update({ status: 'cancelled' })
      .eq('appointment_id', appointment_id)
      .eq('status', 'pending')

    if (error) {
      console.error('Error cancelling scheduled reminders:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    console.error('Error in cancelScheduledRemindersAction:', error)
    return { success: false, error: errorMessage }
  }
}

export async function fetchPendingRemindersAction(): Promise<ScheduledReminder[]> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { data, error } = await supabase
      .from('whatsapp_scheduled_reminders')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .order('scheduled_for', { ascending: true })
      .limit(50)

    if (error) {
      console.error('Error fetching pending reminders:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error in fetchPendingRemindersAction:', error)
    return []
  }
}

export async function markReminderAsSentAction(
  reminder_id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { error } = await supabase
      .from('whatsapp_scheduled_reminders')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .eq('id', reminder_id)

    if (error) {
      console.error('Error marking reminder as sent:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    console.error('Error in markReminderAsSentAction:', error)
    return { success: false, error: errorMessage }
  }
}

export async function markReminderAsFailedAction(
  reminder_id: string,
  error_message: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { error } = await supabase
      .from('whatsapp_scheduled_reminders')
      .update({
        status: 'failed',
        error_message,
      })
      .eq('id', reminder_id)

    if (error) {
      console.error('Error marking reminder as failed:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    console.error('Error in markReminderAsFailedAction:', error)
    return { success: false, error: errorMessage }
  }
}
