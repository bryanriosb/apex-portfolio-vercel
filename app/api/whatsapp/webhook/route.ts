import { NextRequest, NextResponse } from 'next/server'
import {
  processIncomingWhatsAppMessageAction,
  updateWhatsAppMessageStatusAction,
  getWhatsAppConfigByPhoneNumberIdAction,
} from '@/lib/actions/whatsapp'
import type {
  WhatsAppWebhookPayload,
  WhatsAppIncomingMessage,
  WhatsAppMessageStatusUpdate,
} from '@/lib/models/whatsapp/whatsapp-config'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (!mode || !token || !challenge) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
  }

  if (mode !== 'subscribe') {
    return NextResponse.json({ error: 'Invalid mode' }, { status: 403 })
  }

  const expectedToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN
  if (token !== expectedToken) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 403 })
  }

  return new NextResponse(challenge, { status: 200 })
}

export async function POST(request: NextRequest) {
  try {
    const body: WhatsAppWebhookPayload = await request.json()

    if (body.object !== 'whatsapp_business_account') {
      return NextResponse.json({ status: 'ignored' }, { status: 200 })
    }

    for (const entry of body.entry) {
      for (const change of entry.changes) {
        if (change.field !== 'messages') continue

        const { metadata, messages, statuses, contacts } = change.value
        const phoneNumberId = metadata.phone_number_id

        const contactMap = new Map<string, string>()
        if (contacts) {
          for (const contact of contacts) {
            contactMap.set(contact.wa_id, contact.profile.name)
          }
        }

        if (messages && messages.length > 0) {
          await processIncomingMessages(phoneNumberId, messages, contactMap)
        }

        if (statuses && statuses.length > 0) {
          await processStatusUpdates(statuses)
        }
      }
    }

    return NextResponse.json({ status: 'processed' }, { status: 200 })
  } catch (error) {
    console.error('Error processing WhatsApp webhook:', error)
    return NextResponse.json({ status: 'error' }, { status: 200 })
  }
}

async function processIncomingMessages(
  phoneNumberId: string,
  messages: WhatsAppIncomingMessage[],
  contactMap: Map<string, string>
) {
  for (const message of messages) {
    try {
      const { from, id, type } = message
      const customerName = contactMap.get(from)
      let content = ''
      let mediaUrl: string | undefined

      switch (type) {
        case 'text':
          content = message.text?.body || ''
          break
        case 'image':
          content = message.image?.caption || '[Imagen]'
          mediaUrl = await getMediaUrl(phoneNumberId, message.image?.id)
          break
        case 'document':
          content = `[Documento: ${message.document?.filename || 'archivo'}]`
          mediaUrl = await getMediaUrl(phoneNumberId, message.document?.id)
          break
        case 'audio':
          content = '[Audio]'
          mediaUrl = await getMediaUrl(phoneNumberId, message.audio?.id)
          break
        case 'video':
          content = message.video?.caption || '[Video]'
          mediaUrl = await getMediaUrl(phoneNumberId, message.video?.id)
          break
        case 'interactive':
          if (message.interactive?.button_reply) {
            content = message.interactive.button_reply.title
          } else if (message.interactive?.list_reply) {
            content = message.interactive.list_reply.title
          }
          break
        default:
          content = `[${type}]`
      }

      await processIncomingWhatsAppMessageAction(
        phoneNumberId,
        from,
        id,
        type,
        content,
        customerName,
        mediaUrl
      )
    } catch (error) {
      console.error('Error processing message:', message.id, error)
    }
  }
}

async function processStatusUpdates(statuses: WhatsAppMessageStatusUpdate[]) {
  for (const status of statuses) {
    try {
      const errorMessage = status.errors?.[0]
        ? `${status.errors[0].title}: ${status.errors[0].message}`
        : undefined

      await updateWhatsAppMessageStatusAction(
        status.id,
        status.status,
        status.timestamp,
        errorMessage
      )
    } catch (error) {
      console.error('Error processing status update:', status.id, error)
    }
  }
}

async function getMediaUrl(
  phoneNumberId: string,
  mediaId?: string
): Promise<string | undefined> {
  if (!mediaId) return undefined

  try {
    const config = await getWhatsAppConfigByPhoneNumberIdAction(phoneNumberId)
    if (!config) return undefined

    const response = await fetch(
      `https://graph.facebook.com/v21.0/${mediaId}`,
      {
        headers: {
          Authorization: `Bearer ${config.access_token}`,
        },
      }
    )

    if (!response.ok) return undefined

    const data = await response.json()
    return data.url
  } catch (error) {
    console.error('Error getting media URL:', error)
    return undefined
  }
}
