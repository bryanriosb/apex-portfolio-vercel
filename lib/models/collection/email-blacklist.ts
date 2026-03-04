export type BounceType = 'hard' | 'soft' | 'complaint' | 'manual'

export interface EmailBlacklist {
  id: string
  business_id: string
  email: string
  bounce_type: BounceType | null
  bounce_reason: string | null
  source_customer_id: string | null
  source_execution_id: string | null
  source_client_id: string | null
  provider: string
  bounced_at: string
  created_at: string
  updated_at: string
}

export interface EmailBlacklistInsert {
  business_id: string
  email: string
  bounce_type?: BounceType | null
  bounce_reason?: string | null
  source_customer_id?: string | null
  source_execution_id?: string | null
  source_client_id?: string | null
  provider?: string
}

export interface EmailBlacklistUpdate {
  bounce_type?: BounceType | null
  bounce_reason?: string | null
}

export interface FilteredEmail {
  email: string
  is_blacklisted: boolean
}

export interface BlacklistStats {
  total: number
  hard_bounces: number
  soft_bounces: number
  complaints: number
  last_30_days: number
}
