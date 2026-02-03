// Daily Sending Limit Models
// Control diario de límites de envío para cumplir estrategias de ramp-up

export interface DailySendingLimit {
    id: string
    reputation_profile_id: string
    
    // Fecha del tracking
    date: string // ISO date string (YYYY-MM-DD)
    
    // Límites
    daily_limit: number
    
    // Contadores
    emails_sent: number
    emails_delivered: number
    emails_opened: number
    emails_bounced: number
    
    // Estado
    limit_reached: boolean
    paused_until?: string | null
    pause_reason?: string | null
    
    // Engagement del día
    day_open_rate?: number | null
    day_delivery_rate?: number | null
    day_bounce_rate?: number | null
    
    // Progresión
    can_progress_to_next_day: boolean
    
    created_at: string
    updated_at: string
}

export interface DailySendingLimitInsert {
    reputation_profile_id: string
    date: string
    daily_limit: number
    limit_reached?: boolean
    pause_reason?: string | null
}

export interface DailySendingLimitUpdate {
    emails_sent?: number
    emails_delivered?: number
    emails_opened?: number
    emails_bounced?: number
    limit_reached?: boolean
    paused_until?: string | null
    pause_reason?: string | null
    day_open_rate?: number | null
    day_delivery_rate?: number | null
    day_bounce_rate?: number | null
    can_progress_to_next_day?: boolean
}
