import { NextRequest, NextResponse } from 'next/server'
import { parseSesEvent } from '@/lib/webhooks/parsers/ses-parser'
import { parseBrevoEvent } from '@/lib/webhooks/parsers/brevo-parser'
import { processEmailEvent } from '@/lib/webhooks/handlers/email-webhook-handler'
import { isIpInCidr } from '@/lib/utils/network'

/**
 * Webhook endpoint para eventos de email de múltiples proveedores
 * Ruta dinámica: /api/webhooks/email/[provider]
 * 
 * Proveedores soportados:
 * - ses: AWS Simple Email Service (via SNS)
 * - brevo: Brevo transactional email
 */
export async function POST(
    request: NextRequest,
    { params }: { params: { provider: string } }
) {
    const provider = params.provider.toLowerCase()

    try {
        const body = await request.json()

        console.log(`[${provider.toUpperCase()}] Webhook received:`, JSON.stringify(body).substring(0, 200))

        // Validación de SNS para SES
        if (provider === 'ses') {
            const messageType = request.headers.get('x-amz-sns-message-type')

            // Manejar confirmación de suscripción SNS
            if (messageType === 'SubscriptionConfirmation') {
                console.log('SNS Subscription confirmation received')
                if (body.SubscribeURL) {
                    console.log('Subscribe URL:', body.SubscribeURL)
                    // En producción, deberías confirmar automáticamente
                    return NextResponse.json({
                        message: 'Please visit the SubscribeURL to confirm subscription',
                        subscribeUrl: body.SubscribeURL
                    })
                }
            }

            // Manejar notificación SNS
            if (messageType === 'Notification') {
                const event = parseSesEvent(body)

                if (!event) {
                    console.warn('Could not parse SES event')
                    return NextResponse.json({ error: 'Invalid SES event format' }, { status: 400 })
                }

                await processEmailEvent('ses', event)
                return NextResponse.json({ received: true })
            }

            return NextResponse.json({ error: 'Unknown SNS message type' }, { status: 400 })
        }

        // Manejar eventos de Brevo
        if (provider === 'brevo') {
            // Validar whitelist de IPs de Brevo
            const BREVO_IPS = [
                '1.179.112.0/20',
                '172.246.240.0/20'
            ]

            // Obtener IP del cliente (considerando proxies)
            const forwardedFor = request.headers.get('x-forwarded-for')
            const clientIp = forwardedFor ? forwardedFor.split(',')[0].trim() : (request.ip || '127.0.0.1')

            // Permitir localhost en desarrollo
            const isLocal = clientIp === '127.0.0.1' || clientIp === '::1'
            const isAllowedIp = isLocal || BREVO_IPS.some((cidr: string) => isIpInCidr(clientIp, cidr))

            if (!isAllowedIp) {
                console.warn(`[BREVO] Blocked request from unauthorized IP: ${clientIp}`)
                return NextResponse.json({ error: 'Unauthorized IP' }, { status: 403 })
            }

            // Validar autenticación del webhook
            let webhookKey = request.headers.get('x-webhook-key')
            const authHeader = request.headers.get('authorization')

            // Si viene en header Authorization, puede tener prefijo Bearer
            if (!webhookKey && authHeader) {
                if (authHeader.startsWith('Bearer ')) {
                    webhookKey = authHeader.substring(7)
                } else {
                    webhookKey = authHeader
                }
            }

            const expectedKey = process.env.BREVO_WEBHOOK_KEY

            if (expectedKey && webhookKey !== expectedKey) {
                console.error('Invalid Brevo webhook authentication. Received:', webhookKey ? '***' : 'null')
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
            }

            const event = parseBrevoEvent(body)

            if (!event) {
                console.warn('Could not parse Brevo event')
                return NextResponse.json({ error: 'Invalid Brevo event format' }, { status: 400 })
            }

            await processEmailEvent('brevo', event)
            return NextResponse.json({ received: true })
        }

        // Proveedor no soportado
        return NextResponse.json(
            { error: `Provider '${provider}' not supported` },
            { status: 400 }
        )
    } catch (error) {
        console.error(`[${provider.toUpperCase()}] Webhook error:`, error)
        return NextResponse.json(
            { error: 'Webhook processing failed', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        )
    }
}

/**
 * GET endpoint para verificar que el webhook está activo
 */
export async function GET(
    request: NextRequest,
    { params }: { params: { provider: string } }
) {
    const provider = params.provider
    return NextResponse.json({
        status: 'Webhook endpoint active',
        provider: provider,
        supportedProviders: ['ses', 'brevo'],
    })
}
