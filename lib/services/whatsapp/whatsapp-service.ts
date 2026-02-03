import {
  sendWhatsAppTextMessageAction,
  sendWhatsAppTemplateMessageAction,
  fetchWhatsAppMessagesAction,
  fetchWhatsAppConversationsAction,
  fetchWhatsAppConfigAction,
  createWhatsAppConfigAction,
  updateWhatsAppConfigAction,
} from '@/lib/actions/whatsapp'
import type {
  WhatsAppConfig,
  WhatsAppConfigInsert,
  WhatsAppConfigUpdate,
  WhatsAppMessage,
  WhatsAppConversation,
  SendTextMessageParams,
  SendTemplateMessageParams,
} from '@/lib/models/whatsapp/whatsapp-config'

export interface WhatsAppMessageListResponse {
  data: WhatsAppMessage[]
  total: number
  total_pages: number
}

export interface WhatsAppConversationListResponse {
  data: WhatsAppConversation[]
  total: number
}

export interface AppointmentNotificationParams {
  business_account_id: string
  business_id: string
  customer_phone: string
  customer_name: string
  appointment_date: Date
  services: Array<{ name: string; duration_minutes: number; price_cents: number }>
  specialist_name: string
  business_name: string
  business_address?: string
  business_phone?: string
  total_price_cents: number
}

// Formatea fecha en español
function formatDateSpanish(date: Date): string {
  const days = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado']
  const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

  const dayName = days[date.getDay()]
  const day = date.getDate()
  const month = months[date.getMonth()]
  const year = date.getFullYear()

  return `${dayName}, ${day} de ${month} ${year}`
}

// Formatea hora en formato 12h
function formatTimeSpanish(date: Date): string {
  let hours = date.getHours()
  const minutes = date.getMinutes()
  const ampm = hours >= 12 ? 'PM' : 'AM'
  hours = hours % 12
  hours = hours ? hours : 12
  const minutesStr = minutes < 10 ? '0' + minutes : minutes
  return `${hours}:${minutesStr} ${ampm}`
}

// Formatea precio en COP
function formatPrice(cents: number): string {
  const amount = cents / 100
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export default class WhatsAppService {
  async sendTextMessage(
    params: SendTextMessageParams
  ): Promise<{ success: boolean; data?: WhatsAppMessage; error?: string }> {
    try {
      return await sendWhatsAppTextMessageAction(params)
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      console.error('Error sending WhatsApp text message:', error)
      return { success: false, error: errorMessage }
    }
  }

  async sendTemplateMessage(
    params: SendTemplateMessageParams
  ): Promise<{ success: boolean; data?: WhatsAppMessage; error?: string }> {
    try {
      return await sendWhatsAppTemplateMessageAction(params)
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      console.error('Error sending WhatsApp template message:', error)
      return { success: false, error: errorMessage }
    }
  }

  async fetchMessages(params: {
    business_id: string
    to_phone?: string
    conversation_id?: string
    page?: number
    page_size?: number
  }): Promise<WhatsAppMessageListResponse> {
    try {
      return await fetchWhatsAppMessagesAction(params)
    } catch (error) {
      console.error('Error fetching WhatsApp messages:', error)
      throw error
    }
  }

  async fetchConversations(params: {
    business_id: string
    only_active?: boolean
    page?: number
    page_size?: number
  }): Promise<WhatsAppConversationListResponse> {
    try {
      return await fetchWhatsAppConversationsAction(params)
    } catch (error) {
      console.error('Error fetching WhatsApp conversations:', error)
      throw error
    }
  }

  async getConfig(business_account_id: string): Promise<WhatsAppConfig | null> {
    try {
      return await fetchWhatsAppConfigAction(business_account_id)
    } catch (error) {
      console.error('Error fetching WhatsApp config:', error)
      return null
    }
  }

  async createConfig(
    data: WhatsAppConfigInsert
  ): Promise<{ success: boolean; data?: WhatsAppConfig; error?: string }> {
    try {
      return await createWhatsAppConfigAction(data)
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      console.error('Error creating WhatsApp config:', error)
      return { success: false, error: errorMessage }
    }
  }

  async updateConfig(
    id: string,
    data: WhatsAppConfigUpdate
  ): Promise<{ success: boolean; data?: WhatsAppConfig; error?: string }> {
    try {
      return await updateWhatsAppConfigAction(id, data)
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      console.error('Error updating WhatsApp config:', error)
      return { success: false, error: errorMessage }
    }
  }

  /**
   * Envia confirmacion de cita usando plantilla aprobada de Meta
   * Si falla, intenta con mensaje de texto (solo funciona si hay conversacion activa)
   */
  async sendAppointmentConfirmation(
    params: AppointmentNotificationParams
  ): Promise<{ success: boolean; error?: string }> {
    const date = new Date(params.appointment_date)
    const formattedDate = formatDateSpanish(date)
    const formattedTime = formatTimeSpanish(date)
    const serviceNames = params.services.map((s) => s.name).join(', ')

    // Construir info combinada para reducir variables
    const dateTime = `${formattedDate} a las ${formattedTime}`
    const locationWithPhone = params.business_phone
      ? `${params.business_address || params.business_name} - Tel: ${params.business_phone}`
      : params.business_address || params.business_name

    // Primero intentar con plantilla aprobada (6 variables)
    const templateResult = await this.sendTemplateMessage({
      business_account_id: params.business_account_id,
      business_id: params.business_id,
      to: params.customer_phone,
      template_name: 'appointment_confirmation',
      language_code: 'es_CO',
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: params.business_name },
            { type: 'text', text: params.customer_name },
            { type: 'text', text: dateTime },
            { type: 'text', text: serviceNames },
            { type: 'text', text: params.specialist_name },
            { type: 'text', text: locationWithPhone },
          ],
        },
      ],
      customer_name: params.customer_name,
    })

    if (templateResult.success) {
      return { success: true }
    }

    console.log('Template failed, trying text message:', templateResult.error)

    // Fallback: intentar con mensaje de texto (solo funciona si hay conversacion activa)
    const totalDuration = params.services.reduce((acc, s) => acc + s.duration_minutes, 0)
    const servicesList = params.services
      .map((s) => `   • ${s.name}`)
      .join('\n')

    const message = `✨ *CITA CONFIRMADA* ✨

Hola *${params.customer_name}*,

Tu cita ha sido agendada exitosamente.

━━━━━━━━━━━━━━━━━━━━━

📅 *Fecha:* ${formattedDate}
🕐 *Hora:* ${formattedTime}
⏱️ *Duracion:* ${totalDuration} minutos

💇 *Servicios:*
${servicesList}

👤 *Especialista:* ${params.specialist_name}
💰 *Total:* ${formatPrice(params.total_price_cents)}

━━━━━━━━━━━━━━━━━━━━━

📍 *${params.business_name}*${params.business_address ? `\n${params.business_address}` : ''}${params.business_phone ? `\n📞 ${params.business_phone}` : ''}

━━━━━━━━━━━━━━━━━━━━━

_Te enviaremos un recordatorio antes de tu cita._

Si necesitas reagendar o cancelar, por favor contactanos con anticipacion.

¡Te esperamos! 💫`

    const result = await this.sendTextMessage({
      business_account_id: params.business_account_id,
      business_id: params.business_id,
      to: params.customer_phone,
      message,
      customer_name: params.customer_name,
    })

    return { success: result.success, error: result.error }
  }

  /**
   * Envia recordatorio de cita (2 horas antes) usando plantilla aprobada
   */
  async sendAppointmentReminder(
    params: AppointmentNotificationParams
  ): Promise<{ success: boolean; error?: string }> {
    const date = new Date(params.appointment_date)
    const formattedTime = formatTimeSpanish(date)
    const serviceNames = params.services.map((s) => s.name).join(', ')

    // Construir info combinada para reducir variables
    const locationWithPhone = params.business_phone
      ? `${params.business_address || params.business_name} - Tel: ${params.business_phone}`
      : params.business_address || params.business_name

    // Primero intentar con plantilla aprobada (5 variables)
    const templateResult = await this.sendTemplateMessage({
      business_account_id: params.business_account_id,
      business_id: params.business_id,
      to: params.customer_phone,
      template_name: 'appointment_reminder',
      language_code: 'es_CO',
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: params.business_name },
            { type: 'text', text: params.customer_name },
            { type: 'text', text: formattedTime },
            { type: 'text', text: serviceNames },
            { type: 'text', text: locationWithPhone },
          ],
        },
      ],
      customer_name: params.customer_name,
    })

    if (templateResult.success) {
      return { success: true }
    }

    console.log('Reminder template failed, trying text message:', templateResult.error)

    // Fallback: mensaje de texto
    const servicesList = params.services
      .map((s) => `• ${s.name}`)
      .join('\n')

    const message = `⏰ *RECORDATORIO DE CITA*

Hola *${params.customer_name}*,

Te recordamos que tienes una cita en *2 horas*.

━━━━━━━━━━━━━━━━━━━━━

🕐 *Hora:* ${formattedTime}

💇 *Servicios:*
${servicesList}

👤 *Especialista:* ${params.specialist_name}

📍 *${params.business_name}*${params.business_address ? `\n${params.business_address}` : ''}

━━━━━━━━━━━━━━━━━━━━━

Por favor llega *10 minutos antes* de tu cita.

¡Te esperamos! ✨`

    const result = await this.sendTextMessage({
      business_account_id: params.business_account_id,
      business_id: params.business_id,
      to: params.customer_phone,
      message,
      customer_name: params.customer_name,
    })

    return { success: result.success, error: result.error }
  }

  /**
   * Envia mensaje cuando la cita es cancelada usando plantilla aprobada
   */
  async sendAppointmentCancellation(params: {
    business_account_id: string
    business_id: string
    customer_phone: string
    customer_name: string
    appointment_date: Date
    business_name: string
    reason?: string
  }): Promise<{ success: boolean; error?: string }> {
    const date = new Date(params.appointment_date)
    const formattedDate = formatDateSpanish(date)
    const formattedTime = formatTimeSpanish(date)
    const reasonText = params.reason ? `Motivo: ${params.reason}` : ''

    // Primero intentar con plantilla aprobada (5 variables)
    const templateResult = await this.sendTemplateMessage({
      business_account_id: params.business_account_id,
      business_id: params.business_id,
      to: params.customer_phone,
      template_name: 'appointment_cancellation',
      language_code: 'es_CO',
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: params.customer_name },
            { type: 'text', text: params.business_name },
            { type: 'text', text: formattedDate },
            { type: 'text', text: formattedTime },
            { type: 'text', text: reasonText },
          ],
        },
      ],
      customer_name: params.customer_name,
    })

    if (templateResult.success) {
      return { success: true }
    }

    console.log('Cancellation template failed, trying text message:', templateResult.error)

    // Fallback: mensaje de texto
    const message = `❌ *CITA CANCELADA*

Hola *${params.customer_name}*,

Tu cita ha sido cancelada.

━━━━━━━━━━━━━━━━━━━━━

📅 *Fecha:* ${formattedDate}
🕐 *Hora:* ${formattedTime}
${params.reason ? `\n📝 *Motivo:* ${params.reason}` : ''}

━━━━━━━━━━━━━━━━━━━━━

Si deseas reagendar, no dudes en contactarnos.

*${params.business_name}*
Lamentamos los inconvenientes. 🙏`

    const result = await this.sendTextMessage({
      business_account_id: params.business_account_id,
      business_id: params.business_id,
      to: params.customer_phone,
      message,
      customer_name: params.customer_name,
    })

    return { success: result.success, error: result.error }
  }

  /**
   * Envia mensaje cuando la cita es reagendada usando plantilla aprobada
   */
  async sendAppointmentRescheduled(params: {
    business_account_id: string
    business_id: string
    customer_phone: string
    customer_name: string
    old_date: Date
    new_date: Date
    specialist_name: string
    business_name: string
    business_address?: string
    business_phone?: string
  }): Promise<{ success: boolean; error?: string }> {
    const oldDate = new Date(params.old_date)
    const newDate = new Date(params.new_date)
    const oldFormattedDate = formatDateSpanish(oldDate)
    const oldFormattedTime = formatTimeSpanish(oldDate)
    const newFormattedDate = formatDateSpanish(newDate)
    const newFormattedTime = formatTimeSpanish(newDate)

    // Construir variables combinadas para la plantilla
    const oldDateTime = `${oldFormattedDate} a las ${oldFormattedTime}`
    const newDateTime = `${newFormattedDate} a las ${newFormattedTime}`
    const locationWithPhone = params.business_phone
      ? `${params.business_address || params.business_name} - Tel: ${params.business_phone}`
      : params.business_address || params.business_name

    // Primero intentar con plantilla aprobada (6 variables)
    const templateResult = await this.sendTemplateMessage({
      business_account_id: params.business_account_id,
      business_id: params.business_id,
      to: params.customer_phone,
      template_name: 'appointment_rescheduled',
      language_code: 'es_CO',
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: params.customer_name },
            { type: 'text', text: params.business_name },
            { type: 'text', text: oldDateTime },
            { type: 'text', text: newDateTime },
            { type: 'text', text: params.specialist_name },
            { type: 'text', text: locationWithPhone },
          ],
        },
      ],
      customer_name: params.customer_name,
    })

    if (templateResult.success) {
      return { success: true }
    }

    console.log('Rescheduled template failed, trying text message:', templateResult.error)

    // Fallback: mensaje de texto
    const message = `🔄 *CITA REAGENDADA*

Hola *${params.customer_name}*,

Tu cita ha sido reagendada.

━━━━━━━━━━━━━━━━━━━━━

❌ *Fecha anterior:*
${oldFormattedDate} a las ${oldFormattedTime}

✅ *Nueva fecha:*
${newFormattedDate} a las ${newFormattedTime}

👤 *Especialista:* ${params.specialist_name}

━━━━━━━━━━━━━━━━━━━━━

📍 *${params.business_name}*${params.business_address ? `\n${params.business_address}` : ''}

¡Te esperamos! ✨`

    const result = await this.sendTextMessage({
      business_account_id: params.business_account_id,
      business_id: params.business_id,
      to: params.customer_phone,
      message,
      customer_name: params.customer_name,
    })

    return { success: result.success, error: result.error }
  }

  /**
   * Envia mensaje de bienvenida a nuevo cliente
   */
  async sendWelcomeMessage(params: {
    business_account_id: string
    business_id: string
    customer_phone: string
    customer_name: string
    business_name: string
  }): Promise<{ success: boolean; error?: string }> {
    const message = `👋 *¡BIENVENIDO/A!*

Hola *${params.customer_name}*,

Nos alegra mucho tenerte como parte de la familia *${params.business_name}*.

━━━━━━━━━━━━━━━━━━━━━

✨ Gracias por elegirnos

Estamos comprometidos a brindarte la mejor experiencia. Si tienes alguna pregunta o necesitas ayuda para agendar tu proxima cita, no dudes en escribirnos.

━━━━━━━━━━━━━━━━━━━━━

¡Esperamos verte pronto! 💫`

    const result = await this.sendTextMessage({
      business_account_id: params.business_account_id,
      business_id: params.business_id,
      to: params.customer_phone,
      message,
      customer_name: params.customer_name,
    })

    return { success: result.success, error: result.error }
  }

  /**
   * Envia mensaje despues de completar una cita usando plantilla aprobada de Meta
   * Si falla, intenta con mensaje de texto (solo funciona si hay conversacion activa)
   */
  async sendAppointmentCompleted(params: {
    business_account_id: string
    business_id: string
    customer_phone: string
    customer_name: string
    services: Array<{ name: string }>
    specialist_name: string
    business_name: string
  }): Promise<{ success: boolean; error?: string }> {
    const servicesList = params.services.map((s) => s.name).join(', ')

    const templateResult = await this.sendTemplateMessage({
      business_account_id: params.business_account_id,
      business_id: params.business_id,
      to: params.customer_phone,
      template_name: 'appointment_completed',
      language_code: 'es_CO',
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: params.customer_name },
            { type: 'text', text: params.business_name },
            { type: 'text', text: servicesList },
            { type: 'text', text: params.specialist_name },
          ],
        },
      ],
      customer_name: params.customer_name,
    })

    if (templateResult.success) {
      return { success: true }
    }

    console.log('Template failed, trying text message:', templateResult.error)

    const message = `💖 *¡GRACIAS POR TU VISITA!*

Hola *${params.customer_name}*,

Esperamos que hayas disfrutado tu experiencia con nosotros.

━━━━━━━━━━━━━━━━━━━━━

💇 *Servicio(s):* ${servicesList}
👤 *Atendido por:* ${params.specialist_name}

━━━━━━━━━━━━━━━━━━━━━

Tu opinion es muy importante para nosotros. Nos encantaria saber como fue tu experiencia.

¿Te gustaria agendar tu proxima cita? Estamos aqui para ayudarte.

*${params.business_name}*
¡Hasta pronto! ✨`

    const result = await this.sendTextMessage({
      business_account_id: params.business_account_id,
      business_id: params.business_id,
      to: params.customer_phone,
      message,
      customer_name: params.customer_name,
    })

    return { success: result.success, error: result.error }
  }

  /**
   * Envia comprobante de abono por WhatsApp
   */
  async sendPaymentReceipt(params: {
    business_account_id: string
    business_id: string
    customer_phone: string
    customer_name: string
    business_name: string
    business_address?: string
    business_phone?: string
    business_nit?: string
    payment_amount_cents: number
    payment_method: string
    payment_date: Date
    payment_notes?: string
    receipt_number: string
    appointment_date: Date
    services: Array<{ name: string; price_cents: number }>
    total_price_cents: number
    total_paid_cents: number
    balance_due_cents: number
  }): Promise<{ success: boolean; error?: string }> {
    const paymentDate = new Date(params.payment_date)
    const appointmentDate = new Date(params.appointment_date)

    const formatDate = (date: Date) => {
      const days = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado']
      const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
      return `${date.getDate()} de ${months[date.getMonth()]} ${date.getFullYear()}`
    }

    const formatDateTime = (date: Date) => {
      const hours = date.getHours()
      const minutes = date.getMinutes()
      const ampm = hours >= 12 ? 'PM' : 'AM'
      const h = hours % 12 || 12
      const m = minutes < 10 ? '0' + minutes : minutes
      return `${formatDate(date)}, ${h}:${m} ${ampm}`
    }

    const servicesList = params.services.map((s) => `   • ${s.name}`).join('\n')

    const message = `🧾 *COMPROBANTE DE ABONO*

━━━━━━━━━━━━━━━━━━━━━

📍 *${params.business_name}*${params.business_address ? `\n${params.business_address}` : ''}${params.business_phone ? `\nTel: ${params.business_phone}` : ''}${params.business_nit ? `\nNIT: ${params.business_nit}` : ''}

━━━━━━━━━━━━━━━━━━━━━

👤 *Cliente:* ${params.customer_name}
📅 *Cita:* ${formatDate(appointmentDate)}
🕐 *Fecha abono:* ${formatDateTime(paymentDate)}
🔢 *No. Recibo:* ${params.receipt_number}

━━━━━━━━━━━━━━━━━━━━━

💇 *Servicios:*
${servicesList}

━━━━━━━━━━━━━━━━━━━━━

💰 *RESUMEN DE PAGO*

Total servicios: $${(params.total_price_cents / 100).toLocaleString('es-CO')}
Total abonado: $${(params.total_paid_cents / 100).toLocaleString('es-CO')}
*Saldo pendiente: $${(params.balance_due_cents / 100).toLocaleString('es-CO')}*

━━━━━━━━━━━━━━━━━━━━━

✅ *ABONO REGISTRADO*

💵 *Monto: $${(params.payment_amount_cents / 100).toLocaleString('es-CO')}*
📝 Método: ${params.payment_method}${params.payment_notes ? `\n📌 Nota: ${params.payment_notes}` : ''}

━━━━━━━━━━━━━━━━━━━━━

_Este mensaje es un comprobante de su abono._
_¡Gracias por su preferencia!_ ✨`

    const result = await this.sendTextMessage({
      business_account_id: params.business_account_id,
      business_id: params.business_id,
      to: params.customer_phone,
      message,
      customer_name: params.customer_name,
    })

    return { success: result.success, error: result.error }
  }

  /**
   * Envia solicitud de firma de historia clínica por WhatsApp
   */
  async sendSignatureRequest(params: {
    business_account_id: string
    business_id: string
    customer_phone: string
    customer_name: string
    business_name: string
    record_date: Date
    signature_url: string
    expires_days?: number
  }): Promise<{ success: boolean; error?: string }> {
    const formattedDate = formatDateSpanish(new Date(params.record_date))
    const expiresDays = params.expires_days || 7

    // Intentar con plantilla aprobada primero
    const templateResult = await this.sendTemplateMessage({
      business_account_id: params.business_account_id,
      business_id: params.business_id,
      to: params.customer_phone,
      template_name: 'medical_record_signature_request',
      language_code: 'es_CO',
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: params.customer_name },
            { type: 'text', text: params.business_name },
            { type: 'text', text: formattedDate },
            { type: 'text', text: params.signature_url },
            { type: 'text', text: String(expiresDays) },
          ],
        },
      ],
      customer_name: params.customer_name,
    })

    if (templateResult.success) {
      return { success: true }
    }

    console.log('Signature template failed, trying text message:', templateResult.error)

    // Fallback: mensaje de texto
    const message = `Hola *${params.customer_name}*,

*${params.business_name}* te ha enviado tu historia clínica para firmar digitalmente.

📋 *Documento:* Historia Clínica
📅 *Fecha:* ${formattedDate}

✍️ *Firma aquí:* ${params.signature_url}

⚠️ Este enlace expira en *${expiresDays} días*.

Si tienes dudas, contacta directamente a ${params.business_name}.

_Este enlace es personal e intransferible._`

    const result = await this.sendTextMessage({
      business_account_id: params.business_account_id,
      business_id: params.business_id,
      to: params.customer_phone,
      message,
      customer_name: params.customer_name,
    })

    return { success: result.success, error: result.error }
  }
}
