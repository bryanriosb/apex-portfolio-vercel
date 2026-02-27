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
                normalizedEventType = 'delivered'
                break
            case 'hard_bounce':
            case 'soft_bounce':
            case 'blocked':
            case 'invalid_email':
                normalizedEventType = 'bounced'
                break
            case 'spam':
            case 'unsubscribed':
                normalizedEventType = 'complained'
                break
            case 'opened':
            case 'unique_opened':
                normalizedEventType = 'opened'
                break
            case 'click':
            case 'clicked':
                normalizedEventType = 'clicked'
                break
            case 'error':
            case 'deferred':
                normalizedEventType = 'failed'
                break
            case 'request':
                // 'request' means Brevo received the request but hasn't delivered yet.
                // We'll treat it as 'delivered' to track the start.
                normalizedEventType = 'delivered'
                break
            default:
                console.warn('Unknown Brevo event type:', eventType)
                return null
        }

        return {
            messageId: body['message-id'] || body.messageId,
            eventType: normalizedEventType,
            timestamp: body.date || new Date().toISOString(),
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
