// Delivery Strategy Models
// Configuración de estrategias de entrega: ramp_up, batch, conservative, aggressive

export type StrategyType = 'ramp_up' | 'batch' | 'conservative' | 'aggressive'

export interface DeliveryStrategy {
    id: string
    business_id: string
    
    // Información básica
    name: string
    description?: string | null
    strategy_type: StrategyType
    is_default: boolean
    is_active: boolean
    
    // Parámetros de Ramp-Up
    rampup_day_1_limit: number
    rampup_day_2_limit: number
    rampup_day_3_5_limit: number
    rampup_day_6_plus_limit: number
    
    // Parámetros de Batch
    batch_size: number
    batch_interval_minutes: number
    max_batches_per_day: number
    concurrent_batches: number
    
    // Umbrales de engagement
    min_open_rate_threshold: number
    min_delivery_rate_threshold: number
    max_bounce_rate_threshold: number
    max_complaint_rate_threshold: number
    
    // Reglas de pausa
    pause_on_high_bounce: boolean
    pause_on_complaint: boolean
    auto_resume_after_minutes: number
    
    // Reintentos
    max_retry_attempts: number
    retry_interval_minutes: number
    
    // Reglas de envío
    respect_timezone: boolean
    preferred_send_hour_start: number
    preferred_send_hour_end: number
    avoid_weekends: boolean
    
    // Timestamps
    created_at: string
    updated_at: string
    created_by?: string | null
}

export interface DeliveryStrategyInsert {
    business_id: string
    name: string
    description?: string | null
    strategy_type: StrategyType
    is_default?: boolean
    is_active?: boolean
    rampup_day_1_limit?: number
    rampup_day_2_limit?: number
    rampup_day_3_5_limit?: number
    rampup_day_6_plus_limit?: number
    batch_size?: number
    batch_interval_minutes?: number
    max_batches_per_day?: number
    concurrent_batches?: number
    min_open_rate_threshold?: number
    min_delivery_rate_threshold?: number
    max_bounce_rate_threshold?: number
    max_complaint_rate_threshold?: number
    pause_on_high_bounce?: boolean
    pause_on_complaint?: boolean
    auto_resume_after_minutes?: number
    max_retry_attempts?: number
    retry_interval_minutes?: number
    respect_timezone?: boolean
    preferred_send_hour_start?: number
    preferred_send_hour_end?: number
    avoid_weekends?: boolean
    created_by?: string | null
}

export interface DeliveryStrategyUpdate {
    name?: string
    description?: string | null
    strategy_type?: StrategyType
    is_default?: boolean
    is_active?: boolean
    rampup_day_1_limit?: number
    rampup_day_2_limit?: number
    rampup_day_3_5_limit?: number
    rampup_day_6_plus_limit?: number
    batch_size?: number
    batch_interval_minutes?: number
    max_batches_per_day?: number
    concurrent_batches?: number
    min_open_rate_threshold?: number
    min_delivery_rate_threshold?: number
    max_bounce_rate_threshold?: number
    max_complaint_rate_threshold?: number
    pause_on_high_bounce?: boolean
    pause_on_complaint?: boolean
    auto_resume_after_minutes?: number
    max_retry_attempts?: number
    retry_interval_minutes?: number
    respect_timezone?: boolean
    preferred_send_hour_start?: number
    preferred_send_hour_end?: number
    avoid_weekends?: boolean
}
