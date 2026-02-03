import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import { getSupabaseAdminClient } from '@/lib/actions/supabase'
import {
  processPaymentNotificationAction,
  logSubscriptionEventAction,
} from '@/lib/actions/subscription'
import { mpConfig } from '@/lib/config/mercadopago'

function verifyWebhookSignature(
  xSignature: string | null,
  xRequestId: string | null,
  dataId: string,
  secret: string
): boolean {
  if (!xSignature || !xRequestId || !secret) return false

  try {
    const parts = xSignature.split(',')
    let ts = ''
    let hash = ''

    for (const part of parts) {
      const [key, value] = part.split('=')
      if (key === 'ts') ts = value
      if (key === 'v1') hash = value
    }

    const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`
    const hmac = createHmac('sha256', secret)
    hmac.update(manifest)
    const calculatedHash = hmac.digest('hex')

    return calculatedHash === hash
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const xSignature = request.headers.get('x-signature')
    const xRequestId = request.headers.get('x-request-id')

    if (mpConfig.webhookSecret && body.data?.id) {
      const isValid = verifyWebhookSignature(
        xSignature,
        xRequestId,
        body.data.id,
        mpConfig.webhookSecret
      )

      if (!isValid && !mpConfig.isSandbox) {
        console.error('Invalid webhook signature')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }

    await logSubscriptionEventAction({
      event_type: body.type || body.action || 'unknown',
      mp_event_id: body.id,
      mp_subscription_id: body.data?.id,
      payload: body,
    })

    const eventType = body.type || body.action

    switch (eventType) {
      case 'payment':
      case 'payment.created':
      case 'payment.updated':
        if (body.data?.id) {
          await processPaymentNotificationAction(body.data.id)
        }
        break

      case 'subscription_preapproval':
      case 'subscription_preapproval.updated':
        await handleSubscriptionUpdate(body.data?.id)
        break

      case 'subscription_authorized_payment':
        if (body.data?.id) {
          await processPaymentNotificationAction(body.data.id)
        }
        break

      default:
        console.log('Unhandled webhook event:', eventType)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

async function handleSubscriptionUpdate(subscriptionId: string | undefined) {
  if (!subscriptionId) return

  try {
    const { PreApproval } = await import('mercadopago')
    const { mercadoPagoClient } = await import('@/lib/config/mercadopago')

    const preApproval = new PreApproval(mercadoPagoClient)
    const subscription = await preApproval.get({ id: subscriptionId })

    if (!subscription || !subscription.external_reference) return

    const client = await getSupabaseAdminClient()
    const businessAccountId = subscription.external_reference

    const statusMapping: Record<string, string> = {
      authorized: 'active',
      paused: 'paused',
      cancelled: 'cancelled',
      pending: 'pending',
    }

    const paymentStatus = statusMapping[subscription.status || ''] || 'pending'

    await client
      .from('business_accounts')
      .update({
        payment_status: paymentStatus,
        mp_customer_id: subscription.payer_id ? String(subscription.payer_id) : null,
      })
      .eq('id', businessAccountId)

    await logSubscriptionEventAction({
      event_type: 'subscription_status_updated',
      mp_subscription_id: subscriptionId,
      business_account_id: businessAccountId,
      payload: {
        status: subscription.status,
        payment_status: paymentStatus,
      },
      processed: true,
      processed_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error handling subscription update:', error)
  }
}

export async function GET() {
  return NextResponse.json({ status: 'Webhook endpoint active' })
}
