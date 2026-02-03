import {
  fetchSignatureRequestsAction,
  getSignatureRequestByTokenAction,
  getMedicalRecordForSignatureAction,
  createSignatureRequestAction,
  generateSignatureLinkAction,
  updateSignatureRequestSentAction,
  processSignatureAction,
  cancelSignatureRequestAction,
  getLatestSignatureRequestAction,
} from '@/lib/actions/signature-request'
import { sendWhatsAppTextMessageAction } from '@/lib/actions/whatsapp'
import { sendEmailMailgun } from '@/lib/actions/mailgun'
import { sendSMSContiguity } from '@/lib/actions/contiguity'
import type {
  SignatureRequest,
  SignatureRequestPublicData,
  SignatureRequestMedicalRecordView,
  CreateSignatureRequestResponse,
  ProcessSignatureResponse,
  SignatureRequestChannel,
} from '@/lib/models/signature-request/signature-request'

export interface SendSignatureRequestParams {
  medicalRecordId: string
  channel: SignatureRequestChannel
  businessAccountId: string
  businessId: string
  businessName: string
  customerName: string
  customerContact: string // phone or email
  recordDate: string
  createdBy?: string
  expiresDays?: number
}

export default class SignatureRequestService {
  async fetchItems(params: {
    business_id: string
    submission_id?: string
    status?: string
    page?: number
    page_size?: number
  }): Promise<{ data: SignatureRequest[]; total: number }> {
    return fetchSignatureRequestsAction(params)
  }

  async getByToken(token: string): Promise<SignatureRequestPublicData | null> {
    return getSignatureRequestByTokenAction(token)
  }

  async getMedicalRecordForSignature(
    token: string
  ): Promise<SignatureRequestMedicalRecordView | null> {
    return getMedicalRecordForSignatureAction(token)
  }

  async createRequest(
    medicalRecordId: string,
    createdBy?: string,
    expiresDays?: number
  ): Promise<CreateSignatureRequestResponse> {
    return createSignatureRequestAction(medicalRecordId, createdBy, expiresDays)
  }

  // Generar enlace de firma sin enviarlo
  async generateLink(
    medicalRecordId: string,
    createdBy?: string,
    expiresDays?: number
  ): Promise<CreateSignatureRequestResponse> {
    return generateSignatureLinkAction(medicalRecordId, createdBy, expiresDays)
  }

  async processSignature(
    token: string,
    signatureData: string,
    signedByName: string,
    signedByDocument?: string,
    signatureIp?: string
  ): Promise<ProcessSignatureResponse> {
    return processSignatureAction(
      token,
      signatureData,
      signedByName,
      signedByDocument,
      signatureIp
    )
  }

  async cancelRequest(requestId: string): Promise<{ success: boolean; error?: string }> {
    return cancelSignatureRequestAction(requestId)
  }

  async getLatest(medicalRecordId: string): Promise<SignatureRequest | null> {
    return getLatestSignatureRequestAction(medicalRecordId)
  }

  async sendSignatureRequest(
    params: SendSignatureRequestParams
  ): Promise<{ success: boolean; signature_url?: string; error?: string }> {
    // Crear la solicitud de firma
    const createResult = await this.createRequest(
      params.medicalRecordId,
      params.createdBy,
      params.expiresDays
    )

    if (!createResult.success || !createResult.signature_url) {
      return { success: false, error: createResult.error || 'Error al crear solicitud' }
    }

    const signatureUrl = createResult.signature_url
    const expiresDays = params.expiresDays || 7

    // Formatear fecha
    const formattedDate = new Date(params.recordDate).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    let sendResult: { success: boolean; error?: string }

    switch (params.channel) {
      case 'whatsapp':
        sendResult = await this.sendViaWhatsApp({
          businessAccountId: params.businessAccountId,
          businessId: params.businessId,
          businessName: params.businessName,
          customerName: params.customerName,
          customerPhone: params.customerContact,
          recordDate: formattedDate,
          signatureUrl,
          expiresDays,
        })
        break

      case 'email':
        sendResult = await this.sendViaEmail({
          businessName: params.businessName,
          customerName: params.customerName,
          customerEmail: params.customerContact,
          recordDate: formattedDate,
          signatureUrl,
          expiresDays,
        })
        break

      case 'sms':
        sendResult = await this.sendViaSMS({
          businessName: params.businessName,
          customerName: params.customerName,
          customerPhone: params.customerContact,
          signatureUrl,
        })
        break

      default:
        return { success: false, error: 'Canal de envío no válido' }
    }

    if (sendResult.success && createResult.request_id) {
      // Marcar como enviado
      await updateSignatureRequestSentAction(
        createResult.request_id,
        params.channel,
        params.customerContact
      )
    }

    return {
      success: sendResult.success,
      signature_url: signatureUrl,
      error: sendResult.error,
    }
  }

  private async sendViaWhatsApp(params: {
    businessAccountId: string
    businessId: string
    businessName: string
    customerName: string
    customerPhone: string
    recordDate: string
    signatureUrl: string
    expiresDays: number
  }): Promise<{ success: boolean; error?: string }> {
    const message = `Hola *${params.customerName}*,

*${params.businessName}* te ha enviado tu historia clínica para firmar digitalmente.

📋 *Documento:* Historia Clínica
📅 *Fecha:* ${params.recordDate}

✍️ *Firma aquí:* ${params.signatureUrl}

⚠️ Este enlace expira en *${params.expiresDays} días*.

Si tienes dudas, contacta directamente a ${params.businessName}.

_Este enlace es personal e intransferible._`

    try {
      const result = await sendWhatsAppTextMessageAction({
        business_account_id: params.businessAccountId,
        business_id: params.businessId,
        to: params.customerPhone,
        message,
        customer_name: params.customerName,
      })

      return { success: result.success, error: result.error }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error al enviar WhatsApp'
      return { success: false, error: errorMessage }
    }
  }

  private async sendViaEmail(params: {
    businessName: string
    customerName: string
    customerEmail: string
    recordDate: string
    signatureUrl: string
    expiresDays: number
  }): Promise<{ success: boolean; error?: string }> {
    const subject = `${params.businessName} - Firma tu Historia Clínica`

    const body = `Hola ${params.customerName},

${params.businessName} te ha enviado tu historia clínica para firmar digitalmente.

Documento: Historia Clínica
Fecha: ${params.recordDate}

Para firmar tu documento, haz clic en el siguiente enlace:
${params.signatureUrl}

IMPORTANTE: Este enlace expira en ${params.expiresDays} días.

Si tienes dudas, contacta directamente a ${params.businessName}.

---
Este enlace es personal e intransferible.`

    try {
      await sendEmailMailgun({
        to: params.customerEmail,
        from: `${params.businessName} <noreply@beluvio.borls.com>`,
        subject,
        body: { text: body },
      })

      return { success: true }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error al enviar email'
      return { success: false, error: errorMessage }
    }
  }

  private async sendViaSMS(params: {
    businessName: string
    customerName: string
    customerPhone: string
    signatureUrl: string
  }): Promise<{ success: boolean; error?: string }> {
    const message = `${params.businessName}: Hola ${params.customerName}, firma tu historia clinica aqui: ${params.signatureUrl}`

    try {
      await sendSMSContiguity({
        to: params.customerPhone,
        message,
      })

      return { success: true }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error al enviar SMS'
      return { success: false, error: errorMessage }
    }
  }
}
