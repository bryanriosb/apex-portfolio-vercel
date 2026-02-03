// Batch Queue Message Models
// Tracking de mensajes SQS para batches de email

export type QueueMessageStatus = 
    | 'queued'
    | 'in_flight'
    | 'processed'
    | 'failed'
    | 'dlq'

export interface BatchQueueMessage {
    id: string
    batch_id: string
    
    // SQS Info
    sqs_queue_url: string
    sqs_message_id: string
    sqs_receipt_handle?: string | null
    
    // Estado
    status: QueueMessageStatus
    
    // Payload
    payload?: Record<string, any> | null
    
    // Timestamps
    sent_at: string
    received_at?: string | null
    processed_at?: string | null
    visible_at?: string | null
    
    // Reintentos
    receive_count: number
    max_receives: number
    
    // Error
    error_message?: string | null
    
    created_at: string
    updated_at: string
}

export interface BatchQueueMessageInsert {
    batch_id: string
    sqs_queue_url: string
    sqs_message_id: string
    sqs_receipt_handle?: string | null
    status?: QueueMessageStatus
    payload?: Record<string, any> | null
    max_receives?: number
}

export interface BatchQueueMessageUpdate {
    status?: QueueMessageStatus
    sqs_receipt_handle?: string | null
    received_at?: string | null
    processed_at?: string | null
    visible_at?: string | null
    receive_count?: number
    error_message?: string | null
}
