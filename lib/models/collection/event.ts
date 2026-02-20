// Collection Event Models
export type EventType =
    | 'execution_started'
    | 'execution_completed'
    | 'execution_failed'
    | 'batch_started'
    | 'batch_completed'
    | 'email_queued'
    | 'email_sent'
    | 'email_delivered'
    | 'email_opened'
    | 'email_bounced'
    | 'fallback_triggered'
    | 'fallback_sent'
    | 'retry_attempted'
    | 'error'

export type EventStatus = 'success' | 'error' | 'pending'

export interface CollectionEvent {
    id: string
    execution_id: string
    client_id?: string | null

    // Event type
    event_type: EventType

    // Metadata
    event_status: EventStatus
    event_data: Record<string, any>
    error_details?: string | null

    // AWS metadata
    aws_request_id?: string | null
    lambda_function_name?: string | null

    timestamp: string
}

export interface CollectionEventInsert {
    execution_id: string
    client_id?: string | null
    event_type: EventType
    event_status?: EventStatus
    event_data?: Record<string, any>
    error_details?: string | null
    aws_request_id?: string | null
    lambda_function_name?: string | null
    timestamp?: string
}

// Helper function to create event
export function createEvent(
    execution_id: string,
    event_type: EventType,
    options?: {
        client_id?: string
        event_status?: EventStatus
        event_data?: Record<string, any>
        error_details?: string
        aws_request_id?: string
        lambda_function_name?: string
    }
): CollectionEventInsert {
    return {
        execution_id,
        event_type,
        event_status: options?.event_status || 'success',
        event_data: options?.event_data || {},
        client_id: options?.client_id,
        error_details: options?.error_details,
        aws_request_id: options?.aws_request_id,
        lambda_function_name: options?.lambda_function_name,
    }
}
