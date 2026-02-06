import type { EmailReputationProfile } from '@/lib/models/collection/email-reputation'

export interface DashboardStats {
    total_executions: number
    pending_executions: number
    processing_executions: number
    completed_executions: number
    failed_executions: number
    total_emails_sent: number
    total_emails_delivered: number
    total_emails_opened: number
    total_emails_bounced: number
    total_emails_failed: number
    avg_open_rate: number
    avg_bounce_rate: number
    avg_delivery_rate: number
    last_execution_date: string | null
    today_emails_sent: number
    today_emails_delivered: number
}

export interface ActiveExecution {
    id: string
    name: string
    status: string
    created_at: string
    started_at: string | null
    total_clients: number
    emails_sent: number
    emails_delivered: number
    emails_opened: number
    progress_percent: number
    strategy_type: string
    clientStats?: {
        total: number
        pending: number
        sent: number
        delivered: number
        opened: number
        bounced: number
        failed: number
    }
}
