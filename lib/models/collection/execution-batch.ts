// Execution Batch Models
// Grupos de clientes para envío organizado y rate-limited

export type BatchStatus = 
    | 'pending'
    | 'queued'
    | 'processing'
    | 'completed'
    | 'failed'
    | 'paused'

export interface ExecutionBatch {
    id: string
    execution_id: string
    strategy_id?: string | null
    
    // Identificación
    batch_number: number
    batch_name?: string | null
    
    // Estado
    status: BatchStatus
    
    // Clientes
    total_clients: number
    client_ids: string[]
    
    // Programación
    scheduled_for?: string | null
    processed_at?: string | null
    completed_at?: string | null
    
    // Métricas
    emails_sent: number
    emails_delivered: number
    emails_opened: number
    emails_bounced: number
    emails_failed: number
    
    // AWS SQS
    sqs_message_id?: string | null
    sqs_receipt_handle?: string | null
    
    // Error handling
    error_message?: string | null
    retry_count: number
    
    // Timestamps
    created_at: string
    updated_at: string
}

export interface ExecutionBatchInsert {
    execution_id: string
    strategy_id?: string | null
    batch_number: number
    batch_name?: string | null
    status?: BatchStatus
    total_clients: number
    client_ids: string[]
    scheduled_for?: string | null
}

export interface ExecutionBatchUpdate {
    status?: BatchStatus
    scheduled_for?: string | null
    processed_at?: string | null
    completed_at?: string | null
    emails_sent?: number
    emails_delivered?: number
    emails_opened?: number
    emails_bounced?: number
    emails_failed?: number
    sqs_message_id?: string | null
    sqs_receipt_handle?: string | null
    error_message?: string | null
    retry_count?: number
}
