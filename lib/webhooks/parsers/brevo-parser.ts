import type { EmailEvent } from './ses-parser'

/**
 * Parser para eventos webhook de Brevo
 * Brevo envía eventos directamente sin wrapper adicional
 */
export function parseBrevoEvent(body: any): EmailEvent | null {
    try {
        const rawEventType = body.event
        if (!rawEventType) return null

        const eventType = rawEventType.trim().toLowerCase()

        // Map Brevo event types to our internal types
        let normalizedEventType: EmailEvent['eventType']
        let bounceType: 'hard' | 'soft' | undefined

        switch (eventType) {
            case 'delivered':
                normalizedEventType = 'email_delivered'
                break
            case 'hard_bounce':
            case 'soft_bounce':
            case 'blocked':
            case 'invalid_email':
                normalizedEventType = 'email_bounced'
                bounceType = eventType === 'soft_bounce' ? 'soft' : 'hard'
                break
            case 'spam':
            case 'unsubscribed':
                normalizedEventType = 'email_complained'
                break
            case 'unique_opened':
                // First opening of the email - should update metrics
                normalizedEventType = 'email_opened'
                break
            case 'opened':
            case 'loadedbyproxy':
            case 'proxy_open':
            case 'unique_proxy_open':
                // Subsequent openings - should NOT update metrics if already opened
                normalizedEventType = 'email_opened'
                break
            case 'click':
            case 'clicked':
                normalizedEventType = 'email_clicked'
                break
            case 'error':
                normalizedEventType = 'email_failed'
                break
            case 'deferred':
                // Deferred means temporarily delayed - not a failure, will retry automatically
                // We skip this event as it's not a final state
                console.log('[BREVO] Deferred event received - skipping (temporary delay, will retry)')
                return null
            case 'request':
                // 'request' means Brevo received the request but hasn't delivered yet.
                // We'll treat it as 'sent' (corresponds to SES 'Send').
                normalizedEventType = 'email_sent'
                break
            default:
                console.warn('Unknown Brevo event type:', eventType)
                return null
        }

        // Use our own UTC timestamp when event is received
        // This ensures consistent timezone handling across all providers
        const eventTimestamp = new Date().toISOString()
        
        // Keep original provider timestamp in metadata for reference
        let providerTimestamp: string | undefined
        if (body.date && typeof body.date === 'string') {
            providerTimestamp = body.date.trim()
        } else if (body.ts || body.ts_event) {
            const ts = body.ts || body.ts_event
            const tsNum = Number(ts)
            const parsedDate = new Date(tsNum * 1000)
            if (!isNaN(parsedDate.getTime())) {
                providerTimestamp = parsedDate.toISOString()
            }
        }

        return {
            messageId: body['message-id'] || body.messageId,
            eventType: normalizedEventType,
            timestamp: eventTimestamp,
            email: body.email,
            metadata: {
                originalEvent: eventType,
                bounceType,
                reason: body.reason,
                tag: body.tag,
                subject: body.subject,
                link: body.link,
                providerTimestamp: providerTimestamp,
            },
        }
    } catch (error) {
        console.error('Error parsing Brevo event:', error)
        return null
    }
}