// Warmup Progression Rule Models
// Reglas de progresión día a día en estrategias de ramp-up

export interface WarmupProgressionRule {
    id: string
    strategy_id: string
    
    // Día de la estrategia
    day_number: number
    
    // Límite de envío
    daily_limit: number
    
    // Condiciones para progresar
    required_min_opens?: number | null
    required_open_rate?: number | null
    required_delivery_rate?: number | null
    max_bounce_rate?: number | null
    
    // Duración mínima
    min_duration_hours: number
    
    // Flags
    is_final_day: boolean
    
    created_at: string
}

export interface WarmupProgressionRuleInsert {
    strategy_id: string
    day_number: number
    daily_limit: number
    required_min_opens?: number | null
    required_open_rate?: number | null
    required_delivery_rate?: number | null
    max_bounce_rate?: number | null
    min_duration_hours?: number
    is_final_day?: boolean
}
