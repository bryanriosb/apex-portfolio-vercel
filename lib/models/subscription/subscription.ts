export type BillingCycle = 'monthly' | 'yearly'

export type PaymentStatus = 'none' | 'active' | 'pending' | 'failed' | 'cancelled' | 'paused'

export type PaymentHistoryStatus =
  | 'pending'
  | 'approved'
  | 'authorized'
  | 'in_process'
  | 'in_mediation'
  | 'rejected'
  | 'cancelled'
  | 'refunded'
  | 'charged_back'

export type SubscriptionAccessStatus =
  | 'active'
  | 'trial'
  | 'grace_period'
  | 'expired'
  | 'trial_expired'
  | 'no_subscription'
  | 'free'
  | 'not_found'

export interface SubscriptionAccess {
  hasAccess: boolean
  isInGracePeriod: boolean
  daysUntilExpiry: number | null
  subscriptionStatus: SubscriptionAccessStatus
  reason: string
}

export interface PaymentHistory {
  id: string
  business_account_id: string
  mp_payment_id: string | null
  mp_subscription_id: string | null
  amount_cents: number
  currency: string
  status: PaymentHistoryStatus
  status_detail: string | null
  payment_type: string | null
  payment_method: string | null
  installments: number
  description: string | null
  external_reference: string | null
  payer_email: string | null
  failure_reason: string | null
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export interface PaymentHistoryInsert {
  business_account_id: string
  mp_payment_id?: string | null
  mp_subscription_id?: string | null
  amount_cents: number
  currency?: string
  status: PaymentHistoryStatus
  status_detail?: string | null
  payment_type?: string | null
  payment_method?: string | null
  installments?: number
  description?: string | null
  external_reference?: string | null
  payer_email?: string | null
  failure_reason?: string | null
  metadata?: Record<string, unknown> | null
}

export interface SubscriptionEvent {
  id: string
  event_type: string
  mp_event_id: string | null
  mp_subscription_id: string | null
  mp_payment_id: string | null
  business_account_id: string | null
  payload: Record<string, unknown>
  processed: boolean
  processed_at: string | null
  error_message: string | null
  created_at: string
}

export interface SubscriptionEventInsert {
  event_type: string
  mp_event_id?: string | null
  mp_subscription_id?: string | null
  mp_payment_id?: string | null
  business_account_id?: string | null
  payload: Record<string, unknown>
  processed?: boolean
  processed_at?: string | null
  error_message?: string | null
}

export interface PlanPricing {
  planId: string
  planCode: string
  planName: string
  monthlyPriceCents: number
  yearlyPriceCents: number
  yearlyDiscountPercent: number
  features: Record<string, unknown>
}


export interface MPPreapprovalPlan {
  id: string
  status: string
  reason: string
  auto_recurring: {
    frequency: number
    frequency_type: string
    transaction_amount: number
    currency_id: string
  }
  back_url: string
  init_point: string
}

export interface MPSubscription {
  id: string
  status: 'pending' | 'authorized' | 'paused' | 'cancelled'
  preapproval_plan_id: string
  payer_id: number
  payer_email: string
  external_reference: string
  reason: string
  auto_recurring: {
    frequency: number
    frequency_type: string
    transaction_amount: number
    currency_id: string
    start_date: string
    end_date: string
  }
  next_payment_date: string
  summarized: {
    charged_quantity: number
    charged_amount: number
    pending_charge_amount: number
    last_charged_date: string
    last_charged_amount: number
  }
}

export interface MPWebhookPayload {
  id: string
  live_mode: boolean
  type: string
  date_created: string
  user_id: string
  api_version: string
  action: string
  data: {
    id: string
  }
}

export interface SubscriptionStatusInfo {
  status: PaymentStatus
  billingCycle: BillingCycle | null
  expiresAt: string | null
  lastPaymentAt: string | null
  daysRemaining: number | null
  isInGracePeriod: boolean
  planName: string | null
  monthlyPrice: number
  yearlyPrice: number
}

export interface SavedCard {
  id: string
  business_account_id: string
  mp_card_id: string
  mp_customer_id: string
  last_four_digits: string
  first_six_digits: string
  expiration_month: number
  expiration_year: number
  card_brand: string
  card_type: string
  cardholder_name: string
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface SavedCardInsert {
  business_account_id: string
  mp_card_id: string
  mp_customer_id: string
  last_four_digits: string
  first_six_digits: string
  expiration_month: number
  expiration_year: number
  card_brand: string
  card_type: string
  cardholder_name: string
  is_default?: boolean
}

export interface CustomerInfo {
  mpCustomerId: string
  email: string
  firstName?: string
  lastName?: string
  hasCards: boolean
  defaultCardId?: string
}
