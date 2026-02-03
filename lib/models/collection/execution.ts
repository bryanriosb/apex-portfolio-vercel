// Collection Execution Models
export type ExecutionStatus =
    | 'pending'
    | 'processing'
    | 'completed'
    | 'failed'
    | 'paused'

export interface CollectionExecution {
    id: string
    business_id: string
    created_by: string

    // Metadata
    name: string
    description?: string | null
    status: ExecutionStatus

    // Files


    // Configuration
    email_template_id?: string | null
    sms_template_id?: string | null
    attachment_ids: string[]

    // Scheduling and Execution Mode
    execution_mode: 'immediate' | 'scheduled'
    scheduled_at?: string | null
    eventbridge_rule_name?: string | null

    // Fallback rules
    fallback_enabled: boolean
    fallback_days: number

    // Progress counters
    total_clients: number
    emails_sent: number
    emails_delivered: number
    emails_opened: number
    emails_bounced: number
    fallback_sent: number

    // Calculated metrics
    open_rate: number
    bounce_rate: number
    delivery_rate: number

    // AWS references
    sqs_queue_url?: string | null
    lambda_execution_arn?: string | null

    // Timestamps
    started_at?: string | null
    completed_at?: string | null
    created_at: string
    updated_at: string
}

export interface CollectionExecutionInsert {
    business_id: string
    created_by: string
    name: string
    description?: string | null
    status?: ExecutionStatus

    email_template_id?: string | null
    sms_template_id?: string | null
    attachment_ids?: string[]
    fallback_enabled?: boolean
    fallback_days?: number

    // Scheduling
    execution_mode?: 'immediate' | 'scheduled'
    scheduled_at?: string | null
    eventbridge_rule_name?: string | null
}

export interface CollectionExecutionUpdate {
    name?: string
    description?: string | null
    status?: ExecutionStatus

    email_template_id?: string | null
    sms_template_id?: string | null
    attachment_ids?: string[]
    fallback_enabled?: boolean
    fallback_days?: number
    total_clients?: number
    emails_sent?: number
    emails_delivered?: number
    emails_opened?: number
    emails_bounced?: number
    fallback_sent?: number
    open_rate?: number
    bounce_rate?: number
    delivery_rate?: number
    sqs_queue_url?: string | null
    lambda_execution_arn?: string | null
    started_at?: string | null
    completed_at?: string | null

    // Scheduling
    execution_mode?: 'immediate' | 'scheduled'
    scheduled_at?: string | null
    eventbridge_rule_name?: string | null
}
