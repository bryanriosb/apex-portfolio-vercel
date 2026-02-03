// Collection Config Models
export interface CollectionConfig {
    id: string
    business_account_id: string

    // Email config
    email_from_address: string
    email_from_name: string
    email_reply_to?: string | null

    // SES Config
    ses_configuration_set?: string | null
    ses_region: string

    // Fallback config
    fallback_enabled: boolean
    fallback_default_days: number
    sms_from_number?: string | null
    whatsapp_enabled: boolean

    // Internal alerts
    alert_on_high_bounce: boolean
    bounce_threshold_percent: number
    alert_recipients: string[]

    // Limits
    max_emails_per_execution: number

    created_at: string
    updated_at: string
}

export interface CollectionConfigInsert {
    business_account_id: string
    email_from_address: string
    email_from_name: string
    email_reply_to?: string | null
    ses_configuration_set?: string | null
    ses_region?: string
    fallback_enabled?: boolean
    fallback_default_days?: number
    sms_from_number?: string | null
    whatsapp_enabled?: boolean
    alert_on_high_bounce?: boolean
    bounce_threshold_percent?: number
    alert_recipients?: string[]
    max_emails_per_execution?: number
}

export interface CollectionConfigUpdate {
    email_from_address?: string
    email_from_name?: string
    email_reply_to?: string | null
    ses_configuration_set?: string | null
    ses_region?: string
    fallback_enabled?: boolean
    fallback_default_days?: number
    sms_from_number?: string | null
    whatsapp_enabled?: boolean
    alert_on_high_bounce?: boolean
    bounce_threshold_percent?: number
    alert_recipients?: string[]
    max_emails_per_execution?: number
}
