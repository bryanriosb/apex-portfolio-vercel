// Email Reputation Profile Models
// Para gestión de reputación de dominios con AWS SES

export interface EmailReputationProfile {
    id: string
    business_id: string
    domain: string
    sending_ip?: string | null
    
    // Estado de warm-up
    is_warmed_up: boolean
    warmup_start_date?: string | null
    warmup_completed_date?: string | null
    current_warmup_day: number
    
    // Métricas de reputación
    total_emails_sent: number
    total_emails_delivered: number
    total_emails_opened: number
    total_emails_bounced: number
    total_complaints: number
    
    // Tasas calculadas
    delivery_rate: number
    open_rate: number
    bounce_rate: number
    complaint_rate: number
    
    // Configuración de envío
    daily_sending_limit: number
    max_sending_limit: number
    
    // Estrategia actual
    current_strategy: 'ramp_up' | 'batch' | 'conservative'
    
    // Flags de alerta
    is_under_review: boolean
    has_reputation_issues: boolean
    last_issue_date?: string | null
    
    // Engagement thresholds
    required_open_rate: number
    required_delivery_rate: number
    
    // Timestamps
    created_at: string
    updated_at: string
}

export interface EmailReputationProfileInsert {
    business_id: string
    domain: string
    sending_ip?: string | null
    is_warmed_up?: boolean
    warmup_start_date?: string | null
    current_warmup_day?: number
    current_strategy?: 'ramp_up' | 'batch' | 'conservative'
    daily_sending_limit?: number
    max_sending_limit?: number
    required_open_rate?: number
    required_delivery_rate?: number
}

export interface EmailReputationProfileUpdate {
    is_warmed_up?: boolean
    warmup_start_date?: string | null
    warmup_completed_date?: string | null
    current_warmup_day?: number
    total_emails_sent?: number
    total_emails_delivered?: number
    total_emails_opened?: number
    total_emails_bounced?: number
    total_complaints?: number
    delivery_rate?: number
    open_rate?: number
    bounce_rate?: number
    complaint_rate?: number
    daily_sending_limit?: number
    max_sending_limit?: number
    current_strategy?: 'ramp_up' | 'batch' | 'conservative'
    is_under_review?: boolean
    has_reputation_issues?: boolean
    last_issue_date?: string | null
}
