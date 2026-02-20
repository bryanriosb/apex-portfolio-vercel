/**
 * Estructura normalizada de eventos de email
 * Común para todos los proveedores (SES, Brevo, etc)
 */
export interface EmailEvent {
    messageId: string
    eventType: 'delivered' | 'bounced' | 'opened' | 'complained' | 'failed' | 'clicked'
    timestamp: string
    email: string
    metadata?: Record<string, any>
}

/**
 * Parser para eventos SNS de AWS SES
 */
export function parseSesEvent(body: any): EmailEvent | null {
    try {
        // SNS envía un mensaje envuelto, necesitamos parsearlo
        const message = typeof body.Message === 'string'
            ? JSON.parse(body.Message)
            : body.Message

        const eventType = message.eventType || message.notificationType

        switch (eventType) {
            case 'Delivery':
                return {
                    messageId: message.mail.messageId,
                    eventType: 'delivered',
                    timestamp: message.delivery.timestamp,
                    email: message.mail.destination[0],
                    metadata: {
                        processingTimeMillis: message.delivery.processingTimeMillis,
                        smtpResponse: message.delivery.smtpResponse,
                    },
                }

            case 'Bounce':
                return {
                    messageId: message.mail.messageId,
                    eventType: 'bounced',
                    timestamp: message.bounce.timestamp,
                    email: message.bounce.bouncedRecipients[0]?.emailAddress || message.mail.destination[0],
                    metadata: {
                        bounceType: message.bounce.bounceType,
                        bounceSubType: message.bounce.bounceSubType,
                        diagnosticCode: message.bounce.bouncedRecipients[0]?.diagnosticCode,
                    },
                }

            case 'Complaint':
                return {
                    messageId: message.mail.messageId,
                    eventType: 'complained',
                    timestamp: message.complaint.timestamp,
                    email: message.complaint.complainedRecipients[0]?.emailAddress || message.mail.destination[0],
                    metadata: {
                        complaintFeedbackType: message.complaint.complaintFeedbackType,
                        userAgent: message.complaint.userAgent,
                    },
                }

            case 'Open':
                return {
                    messageId: message.mail.messageId,
                    eventType: 'opened',
                    timestamp: message.open.timestamp,
                    email: message.mail.destination[0],
                    metadata: {
                        userAgent: message.open.userAgent,
                        ipAddress: message.open.ipAddress,
                    },
                }

            default:
                console.warn('Unknown SES event type:', eventType)
                return null
        }
    } catch (error) {
        console.error('Error parsing SES event:', error)
        return null
    }
}
