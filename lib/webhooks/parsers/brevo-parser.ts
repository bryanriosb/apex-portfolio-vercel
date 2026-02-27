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

        // Parse timestamp - prioritize 'date' field as it's more reliable
        // Brevo sends 'date' in format: "2026-02-27 03:38:07" (UTC time)
        let eventTimestamp = new Date().toISOString()
        let usedDateField = false

        if (body.date && typeof body.date === 'string') {
            const rawDate = body.date.trim()
            // Parse "2026-02-27 03:38:07" format - it's UTC time from Brevo
            const isoDate = rawDate.replace(' ', 'T') + 'Z'
            const parsedDate = new Date(isoDate)
            
            if (!isNaN(parsedDate.getTime())) {
                eventTimestamp = parsedDate.toISOString()
                usedDateField = true
            } else {
                console.warn(`[BREVO] Failed to parse date field: ${rawDate}`)
            }
        }

        // Fallback to timestamp fields if date field wasn't used
        if (!usedDateField) {
            const ts = body.ts || body.ts_event
            
            if (ts) {
                const tsNum = Number(ts)
                // ts_event is typically in seconds
                const parsedDate = new Date(tsNum * 1000)
                
                // Validate the parsed date
                const minValidDate = new Date('2020-01-01')
                const maxValidDate = new Date('2030-12-31')
                
                if (parsedDate >= minValidDate && parsedDate <= maxValidDate) {
                    eventTimestamp = parsedDate.toISOString()
                } else {
                    console.warn(`[BREVO] Invalid timestamp received: ts=${ts}, parsedDate=${parsedDate.toISOString()}. Using current time.`)
                    console.warn(`[BREVO] Full body:`, JSON.stringify(body))
                }
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
                link: body.link,
            },
        }
    } catch (error) {
        console.error('Error parsing Brevo event:', error)
        return null
    }
}