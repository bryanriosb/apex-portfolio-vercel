// Collection Client Models
export type ClientStatus =
    | 'pending'
    | 'queued'
    | 'sent'
    | 'delivered'
    | 'opened'
    | 'bounced'
    | 'failed'

export type BounceType = 'hard' | 'soft' | 'complaint'

export type FallbackType = 'sms' | 'whatsapp'

export interface CollectionClient {
    id: string
    execution_id: string
    customer_id?: string | null



    // Debt data
    invoices?: any[] | null

    // Custom variables (flexible)
    custom_data: Record<string, any>

    // Status
    status: ClientStatus

    // Email tracking
    email_sent_at?: string | null
    email_delivered_at?: string | null
    email_opened_at?: string | null
    email_bounce_type?: BounceType | null
    email_bounce_reason?: string | null

    // Fallback tracking
    fallback_required: boolean
    fallback_sent_at?: string | null
    fallback_type?: FallbackType | null
    fallback_status?: string | null

    // AWS SES
    ses_message_id?: string | null

    // Error handling
    error_message?: string | null
    retry_count: number

    created_at: string
    updated_at: string
}

export interface CollectionClientInsert {
    execution_id: string
    customer_id?: string | null
    invoices?: any[] | null
    custom_data?: Record<string, any>
    status?: ClientStatus
}

export interface CollectionClientUpdate {
    status?: ClientStatus
    email_sent_at?: string | null
    email_delivered_at?: string | null
    email_opened_at?: string | null
    email_bounce_type?: BounceType | null
    email_bounce_reason?: string | null
    fallback_required?: boolean
    fallback_sent_at?: string | null
    fallback_type?: FallbackType | null
    fallback_status?: string | null
    ses_message_id?: string | null
    error_message?: string | null
    retry_count?: number
}
