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

        switch (eventType) {
            case 'delivered':
                normalizedEventType = 'email_delivered'
                break
            case 'hard_bounce':
            case 'soft_bounce':
            case 'blocked':
            case 'invalid_email':
                normalizedEventType = 'email_bounced'
                break
            case 'spam':
            case 'unsubscribed':
                normalizedEventType = 'email_complained'
                break
            case 'opened':
            case 'unique_opened':
                normalizedEventType = 'email_opened'
                break
            case 'click':
            case 'clicked':
                normalizedEventType = 'email_clicked'
                break
            case 'error':
            case 'deferred':
                normalizedEventType = 'email_failed'
                break
            case 'request':
                // 'request' means Brevo received the request but hasn't delivered yet.
                // We'll treat it as 'sent' (corresponds to SES 'Send').
                normalizedEventType = 'email_sent'
                break
            default:
                console.warn('Unknown Brevo event type:', eventType)
                return null
        }

        // Brevo typically sends Unix timestamps in 'ts' or 'ts_event' (seconds)
        // These are guaranteed to be UTC.
        const ts = body.ts || body.ts_event || body.ts_epoch
        let eventTimestamp = new Date().toISOString()

        if (ts) {
            // ts_epoch is in milliseconds, others usually in seconds.
            // Heuristic: if ts > 10^10, it's likely already in milliseconds.
            const isMillis = !!body.ts_epoch || Number(ts) > 10000000000
            const multiplier = isMillis ? 1 : 1000
            eventTimestamp = new Date(Number(ts) * multiplier).toISOString()
        } else if (body.date && typeof body.date === 'string') {
            const rawDate = body.date
            const hasTimezone = rawDate.includes('Z') || rawDate.includes('+')

            if (!hasTimezone) {
                // We assume it's Bogota time (-05:00) as fallback
                eventTimestamp = `${rawDate.replace(' ', 'T')}-05:00`
            } else {
                eventTimestamp = rawDate.replace(' ', 'T')
            }
        }

        return {
            messageId: body['message-id'] || body.messageId,
            eventType: normalizedEventType,
            timestamp: eventTimestamp,
            email: body.email,
            metadata: {
                originalEvent: eventType,
                reason: body.reason,
                tag: body.tag,
                subject: body.subject,
                link: body.link, // URL del link clickeado (para eventos click)
            },
        }
    } catch (error) {
        console.error('Error parsing Brevo event:', error)
        return null
    }
}
