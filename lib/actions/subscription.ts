'use server'

import { getSupabaseAdminClient } from '@/lib/actions/supabase'
import {
  mercadoPagoClient,
  mpConfig,
  getMpAccessToken,
} from '@/lib/config/mercadopago'
import {
  PreApprovalPlan,
  PreApproval,
  Payment,
  MercadoPagoConfig,
  CardToken,
} from 'mercadopago'
import type {
  BillingCycle,
  PaymentHistory,
  PaymentHistoryInsert,
  SubscriptionAccess,
  SubscriptionEventInsert,
  SubscriptionStatusInfo,
  SavedCard,
  SavedCardInsert,
} from '@/lib/models/subscription/subscription'
import type { Plan } from '@/lib/models/plan/plan'
import {
  getOrCreateCustomer,
  createCustomerCard,
  deleteCustomerCard as deleteCustomerCardService,
  searchCustomerByEmail,
  createPreApprovalPlan,
  type MPCustomer,
  type MPCustomerCard,
} from '@/lib/services/mercado-pago-subscription'

const preApprovalPlan = new PreApprovalPlan(mercadoPagoClient)
const preApproval = new PreApproval(mercadoPagoClient)
const payment = new Payment(mercadoPagoClient)

function getMpClient() {
  return new MercadoPagoConfig({
    accessToken: getMpAccessToken(),
    options: { timeout: 10000 },
  })
}

// ============================================
// Customer Management Actions
// ============================================

export async function getOrCreateMPCustomerAction(
  businessAccountId: string,
  email: string,
  firstName?: string,
  lastName?: string,
  identificationType?: string,
  identificationNumber?: string
): Promise<{
  success: boolean
  customer?: MPCustomer
  isNew?: boolean
  error?: string
}> {
  try {
    const client = await getSupabaseAdminClient()

    const { data: account } = await client
      .from('business_accounts')
      .select('mp_customer_id, contact_email')
      .eq('id', businessAccountId)
      .single()

    if (account?.mp_customer_id) {
      const existingCustomer = await searchCustomerByEmail(
        account.contact_email || email
      )
      if (existingCustomer) {
        return { success: true, customer: existingCustomer, isNew: false }
      }
    }

    const { customer, isNew } = await getOrCreateCustomer({
      email,
      firstName,
      lastName,
      identification:
        identificationType && identificationNumber
          ? { type: identificationType, number: identificationNumber }
          : undefined,
      description: `Business Account: ${businessAccountId}`,
    })

    if (!customer) {
      return { success: false, error: 'Failed to create customer in MP' }
    }

    if (isNew || !account?.mp_customer_id) {
      await client
        .from('business_accounts')
        .update({ mp_customer_id: customer.id })
        .eq('id', businessAccountId)
    }

    return { success: true, customer, isNew }
  } catch (error: any) {
    console.error('Error in getOrCreateMPCustomerAction:', error)
    return { success: false, error: error.message }
  }
}

export async function saveCardToCustomerAction(
  businessAccountId: string,
  cardToken: string,
  cardholderName: string
): Promise<{ success: boolean; card?: MPCustomerCard; error?: string }> {
  try {
    const client = await getSupabaseAdminClient()

    const { data: account } = await client
      .from('business_accounts')
      .select('mp_customer_id')
      .eq('id', businessAccountId)
      .single()

    if (!account?.mp_customer_id) {
      return { success: false, error: 'No customer found for this account' }
    }

    const card = await createCustomerCard(account.mp_customer_id, cardToken)

    if (!card) {
      return { success: false, error: 'Failed to save card' }
    }

    const { data: existingCards } = await client
      .from('saved_cards')
      .select('id')
      .eq('business_account_id', businessAccountId)

    const isDefault = !existingCards || existingCards.length === 0

    await client.from('saved_cards').insert({
      business_account_id: businessAccountId,
      mp_card_id: card.id,
      mp_customer_id: account.mp_customer_id,
      last_four_digits: card.last_four_digits,
      first_six_digits: card.first_six_digits,
      expiration_month: card.expiration_month,
      expiration_year: card.expiration_year,
      card_brand: card.payment_method.id,
      card_type: card.payment_method.payment_type_id,
      cardholder_name: cardholderName,
      is_default: isDefault,
    } as SavedCardInsert)

    if (isDefault) {
      await client
        .from('business_accounts')
        .update({
          payment_method_last4: card.last_four_digits,
          payment_method_brand: card.payment_method.id,
        })
        .eq('id', businessAccountId)
    }

    return { success: true, card }
  } catch (error: any) {
    console.error('Error in saveCardToCustomerAction:', error)
    return { success: false, error: error.message }
  }
}

export async function getSavedCardsAction(
  businessAccountId: string
): Promise<SavedCard[]> {
  try {
    const client = await getSupabaseAdminClient()

    const { data, error } = await client
      .from('saved_cards')
      .select('*')
      .eq('business_account_id', businessAccountId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching saved cards:', error)
    return []
  }
}

export async function deleteCardAction(
  businessAccountId: string,
  cardId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = await getSupabaseAdminClient()

    const { data: card } = await client
      .from('saved_cards')
      .select('mp_card_id, mp_customer_id, is_default')
      .eq('id', cardId)
      .eq('business_account_id', businessAccountId)
      .single()

    if (!card) {
      return { success: false, error: 'Card not found' }
    }

    const deleted = await deleteCustomerCardService(
      card.mp_customer_id,
      card.mp_card_id
    )

    if (!deleted) {
      console.warn(
        'Could not delete card from MP, continuing with local delete'
      )
    }

    await client.from('saved_cards').delete().eq('id', cardId)

    if (card.is_default) {
      const { data: otherCards } = await client
        .from('saved_cards')
        .select('id')
        .eq('business_account_id', businessAccountId)
        .order('created_at', { ascending: false })
        .limit(1)

      if (otherCards && otherCards.length > 0) {
        await client
          .from('saved_cards')
          .update({ is_default: true })
          .eq('id', otherCards[0].id)
      } else {
        await client
          .from('business_accounts')
          .update({
            payment_method_last4: null,
            payment_method_brand: null,
          })
          .eq('id', businessAccountId)
      }
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error in deleteCardAction:', error)
    return { success: false, error: error.message }
  }
}

export async function setDefaultCardAction(
  businessAccountId: string,
  cardId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = await getSupabaseAdminClient()

    const { data: card } = await client
      .from('saved_cards')
      .select('*')
      .eq('id', cardId)
      .eq('business_account_id', businessAccountId)
      .single()

    if (!card) {
      return { success: false, error: 'Card not found' }
    }

    await client
      .from('saved_cards')
      .update({ is_default: false })
      .eq('business_account_id', businessAccountId)

    await client
      .from('saved_cards')
      .update({ is_default: true })
      .eq('id', cardId)

    await client
      .from('business_accounts')
      .update({
        payment_method_last4: card.last_four_digits,
        payment_method_brand: card.card_brand,
      })
      .eq('id', businessAccountId)

    return { success: true }
  } catch (error: any) {
    console.error('Error in setDefaultCardAction:', error)
    return { success: false, error: error.message }
  }
}

// ============================================
// Subscription Plan Management
// ============================================

export async function createMPPlanAction(
  planId: string,
  billingCycle: BillingCycle
): Promise<{ success: boolean; mpPlanId?: string; error?: string }> {
  try {
    const client = await getSupabaseAdminClient()
    const { data: plan, error } = await client
      .from('plans')
      .select('*')
      .eq('id', planId)
      .single()

    if (error || !plan) {
      return { success: false, error: 'Plan not found' }
    }

    const amount =
      billingCycle === 'yearly'
        ? plan.yearly_price_cents / 100
        : plan.monthly_price_cents / 100

    const frequency = billingCycle === 'yearly' ? 12 : 1
    const backUrl = `${process.env.NEXT_PUBLIC_APP_URL}/admin/settings/billing/success?plan=${encodeURIComponent(plan.name)}&cycle=${billingCycle}&amount=${Math.round(amount)}`

    const {
      success,
      plan: mpPlan,
      error: planError,
    } = await createPreApprovalPlan(
      `${plan.name} - ${billingCycle === 'yearly' ? 'Anual' : 'Mensual'}`,
      {
        frequency,
        frequencyType: 'months',
        transactionAmount: amount,
        currencyId: mpConfig.currency,
      },
      backUrl
    )

    if (!success || !mpPlan) {
      return { success: false, error: planError || 'Failed to create MP plan' }
    }

    const fieldToUpdate =
      billingCycle === 'yearly' ? 'mp_plan_yearly_id' : 'mp_plan_monthly_id'
    await client
      .from('plans')
      .update({ [fieldToUpdate]: mpPlan.id })
      .eq('id', planId)

    return { success: true, mpPlanId: mpPlan.id }
  } catch (error: any) {
    console.error('Error creating MP plan:', error)
    return { success: false, error: error.message }
  }
}

// ============================================
// Subscription Actions
// ============================================

export async function createSubscriptionAction(
  businessAccountId: string,
  planId: string,
  billingCycle: BillingCycle,
  payerEmail: string,
  cardTokenId: string,
  saveCard: boolean = false,
  cardholderName?: string
): Promise<{ success: boolean; subscriptionId?: string; error?: string }> {
  try {
    const client = await getSupabaseAdminClient()

    const { data: plan } = await client
      .from('plans')
      .select('*')
      .eq('id', planId)
      .single()

    if (!plan) {
      return { success: false, error: 'Plan not found' }
    }

    const { data: account } = await client
      .from('business_accounts')
      .select('contact_name, mp_customer_id')
      .eq('id', businessAccountId)
      .single()

    const isSandbox = mpConfig.isSandbox

    let customerResult: {
      success: boolean
      customer?: MPCustomer
      isNew?: boolean
      error?: string
    } = {
      success: true,
      customer: account?.mp_customer_id
        ? ({ id: account.mp_customer_id } as MPCustomer)
        : undefined,
    }

    if (!isSandbox) {
      customerResult = await getOrCreateMPCustomerAction(
        businessAccountId,
        payerEmail,
        account?.contact_name?.split(' ')[0],
        account?.contact_name?.split(' ').slice(1).join(' ')
      )

      if (!customerResult.success || !customerResult.customer) {
        return {
          success: false,
          error: customerResult.error || 'Failed to get customer',
        }
      }

      if (saveCard && cardholderName) {
        await saveCardToCustomerAction(
          businessAccountId,
          cardTokenId,
          cardholderName
        )
      }
    }

    let mpPlanId =
      billingCycle === 'yearly'
        ? plan.mp_plan_yearly_id
        : plan.mp_plan_monthly_id

    if (!mpPlanId) {
      const createResult = await createMPPlanAction(planId, billingCycle)
      if (!createResult.success || !createResult.mpPlanId) {
        return { success: false, error: 'Failed to create MP plan' }
      }
      mpPlanId = createResult.mpPlanId
    }

    const effectivePayerEmail = mpConfig.isSandbox
      ? mpConfig.testUser.email
      : payerEmail

    const subscription = await preApproval.create({
      body: {
        preapproval_plan_id: mpPlanId,
        payer_email: effectivePayerEmail,
        card_token_id: cardTokenId,
        external_reference: businessAccountId,
        status: 'authorized',
      },
    })

    const expiresAt = new Date()
    if (billingCycle === 'yearly') {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1)
    } else {
      expiresAt.setMonth(expiresAt.getMonth() + 1)
    }

    const updateData: any = {
      mp_subscription_id: subscription.id,
      billing_cycle: billingCycle,
      subscription_expires_at: expiresAt.toISOString(),
      last_payment_at: new Date().toISOString(),
      payment_status: 'active',
      plan_id: planId,
      status: 'active',
      subscription_plan: plan.code,
    }

    if (customerResult.customer?.id) {
      updateData.mp_customer_id = customerResult.customer.id
    }

    await client
      .from('business_accounts')
      .update(updateData)
      .eq('id', businessAccountId)

    // Register initial payment in payment history
    const amount = billingCycle === 'yearly' ? plan.yearly_price_cents : plan.monthly_price_cents
    await client.from('payment_history').insert({
      business_account_id: businessAccountId,
      mp_payment_id: `subscription_${subscription.id}_initial`,
      amount_cents: amount,
      currency: mpConfig.currency,
      status: 'approved',
      status_detail: 'accredited',
      payment_type: 'credit_card',
      payment_method: 'card',
      installments: 1,
      description: `Suscripción ${plan.name} - ${billingCycle === 'yearly' ? 'Anual' : 'Mensual'} - Pago inicial`,
      external_reference: businessAccountId,
      payer_email: payerEmail,
    } as PaymentHistoryInsert)

    return { success: true, subscriptionId: subscription.id }
  } catch (error: any) {
    console.error('Error creating subscription:', error)
    return { success: false, error: error.message }
  }
}

export async function cancelSubscriptionAction(
  businessAccountId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = await getSupabaseAdminClient()

    const { data: account } = await client
      .from('business_accounts')
      .select('mp_subscription_id')
      .eq('id', businessAccountId)
      .single()

    if (!account?.mp_subscription_id) {
      return { success: false, error: 'No subscription found' }
    }

    await preApproval.update({
      id: account.mp_subscription_id,
      body: { status: 'cancelled' },
    })

    await client
      .from('business_accounts')
      .update({ payment_status: 'cancelled' })
      .eq('id', businessAccountId)

    return { success: true }
  } catch (error: any) {
    console.error('Error cancelling subscription:', error)
    return { success: false, error: error.message }
  }
}

export async function pauseSubscriptionAction(
  businessAccountId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = await getSupabaseAdminClient()

    const { data: account } = await client
      .from('business_accounts')
      .select('mp_subscription_id')
      .eq('id', businessAccountId)
      .single()

    if (!account?.mp_subscription_id) {
      return { success: false, error: 'No subscription found' }
    }

    await preApproval.update({
      id: account.mp_subscription_id,
      body: { status: 'paused' },
    })

    await client
      .from('business_accounts')
      .update({ payment_status: 'paused' })
      .eq('id', businessAccountId)

    return { success: true }
  } catch (error: any) {
    console.error('Error pausing subscription:', error)
    return { success: false, error: error.message }
  }
}

export async function reactivateSubscriptionAction(
  businessAccountId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = await getSupabaseAdminClient()

    const { data: account } = await client
      .from('business_accounts')
      .select('mp_subscription_id')
      .eq('id', businessAccountId)
      .single()

    if (!account?.mp_subscription_id) {
      return { success: false, error: 'No subscription found' }
    }

    await preApproval.update({
      id: account.mp_subscription_id,
      body: { status: 'authorized' },
    })

    await client
      .from('business_accounts')
      .update({ payment_status: 'active' })
      .eq('id', businessAccountId)

    return { success: true }
  } catch (error: any) {
    console.error('Error reactivating subscription:', error)
    return { success: false, error: error.message }
  }
}

// ============================================
// Access & Status Actions
// ============================================

export async function checkSubscriptionAccessAction(
  businessAccountId: string
): Promise<SubscriptionAccess> {
  const noAccess: SubscriptionAccess = {
    hasAccess: false,
    isInGracePeriod: false,
    daysUntilExpiry: null,
    subscriptionStatus: 'not_found',
    reason: 'Account not found',
  }

  try {
    const client = await getSupabaseAdminClient()

    const { data, error } = await client.rpc('check_subscription_access', {
      p_business_account_id: businessAccountId,
      p_grace_days: mpConfig.gracePeriodDays,
    })

    if (error || !data || data.length === 0) {
      return noAccess
    }

    const result = data[0]
    return {
      hasAccess: result.has_access,
      isInGracePeriod: result.is_in_grace_period,
      daysUntilExpiry: result.days_until_expiry,
      subscriptionStatus: result.subscription_status,
      reason: result.reason,
    }
  } catch (error) {
    console.error('Error checking subscription access:', error)
    return noAccess
  }
}

export async function getSubscriptionStatusAction(
  businessAccountId: string
): Promise<SubscriptionStatusInfo | null> {
  try {
    const client = await getSupabaseAdminClient()

    const { data: account, error } = await client
      .from('business_accounts')
      .select(
        `
        payment_status,
        billing_cycle,
        subscription_expires_at,
        last_payment_at,
        plan:plans(name, monthly_price_cents, yearly_price_cents)
      `
      )
      .eq('id', businessAccountId)
      .single()

    if (error || !account) return null

    let daysRemaining: number | null = null
    let isInGracePeriod = false

    if (account.subscription_expires_at) {
      const expiresAt = new Date(account.subscription_expires_at)
      const now = new Date()
      const diffMs = expiresAt.getTime() - now.getTime()
      daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

      if (daysRemaining < 0 && daysRemaining >= -mpConfig.gracePeriodDays) {
        isInGracePeriod = true
        daysRemaining = mpConfig.gracePeriodDays + daysRemaining
      }
    }

    const planData = account.plan as any

    return {
      status: account.payment_status,
      billingCycle: account.billing_cycle,
      expiresAt: account.subscription_expires_at,
      lastPaymentAt: account.last_payment_at,
      daysRemaining,
      isInGracePeriod,
      planName: planData?.name || null,
      monthlyPrice: (planData?.monthly_price_cents || 0) / 100,
      yearlyPrice: (planData?.yearly_price_cents || 0) / 100,
    }
  } catch (error) {
    console.error('Error getting subscription status:', error)
    return null
  }
}

// ============================================
// Payment History Actions
// ============================================

export async function getPaymentHistoryAction(
  businessAccountId: string,
  limit = 10
): Promise<PaymentHistory[]> {
  try {
    const client = await getSupabaseAdminClient()

    const { data, error } = await client
      .from('payment_history')
      .select('*')
      .eq('business_account_id', businessAccountId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching payment history:', error)
    return []
  }
}

export async function insertPaymentHistoryAction(
  payment: PaymentHistoryInsert
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = await getSupabaseAdminClient()

    const { error } = await client.from('payment_history').insert(payment)

    if (error) throw error
    return { success: true }
  } catch (error: any) {
    console.error('Error inserting payment history:', error)
    return { success: false, error: error.message }
  }
}

export async function logSubscriptionEventAction(
  event: SubscriptionEventInsert
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = await getSupabaseAdminClient()

    const { error } = await client.from('subscription_events').insert(event)

    if (error) throw error
    return { success: true }
  } catch (error: any) {
    console.error('Error logging subscription event:', error)
    return { success: false, error: error.message }
  }
}

// ============================================
// Plan Actions
// ============================================

export async function getActivePlansWithPricingAction(): Promise<Plan[]> {
  try {
    const client = await getSupabaseAdminClient()

    const { data, error } = await client
      .from('plans')
      .select('*')
      .eq('status', 'active')
      .neq('code', 'trial')
      .neq('code', 'free')
      .order('sort_order', { ascending: true })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching plans with pricing:', error)
    return []
  }
}

export async function getMPSubscriptionDetailsAction(
  subscriptionId: string
): Promise<any | null> {
  try {
    const subscription = await preApproval.get({ id: subscriptionId })
    return subscription
  } catch (error) {
    console.error('Error fetching MP subscription:', error)
    return null
  }
}

export async function processPaymentNotificationAction(
  paymentId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const paymentData = await payment.get({ id: paymentId })

    if (!paymentData || !paymentData.external_reference) {
      return { success: false, error: 'Payment not found or no reference' }
    }

    const businessAccountId = paymentData.external_reference
    const client = await getSupabaseAdminClient()

    await client.from('payment_history').insert({
      business_account_id: businessAccountId,
      mp_payment_id: String(paymentData.id),
      amount_cents: Math.round((paymentData.transaction_amount || 0) * 100),
      currency: paymentData.currency_id || 'COP',
      status: paymentData.status as any,
      status_detail: paymentData.status_detail,
      payment_type: paymentData.payment_type_id,
      payment_method: paymentData.payment_method_id,
      installments: paymentData.installments || 1,
      description: paymentData.description,
      external_reference: paymentData.external_reference,
      payer_email: paymentData.payer?.email,
    })

    if (paymentData.status === 'approved') {
      const { data: account } = await client
        .from('business_accounts')
        .select('billing_cycle')
        .eq('id', businessAccountId)
        .single()

      const billingCycle = account?.billing_cycle || 'monthly'
      const expiresAt = new Date()

      if (billingCycle === 'yearly') {
        expiresAt.setFullYear(expiresAt.getFullYear() + 1)
      } else {
        expiresAt.setMonth(expiresAt.getMonth() + 1)
      }

      await client
        .from('business_accounts')
        .update({
          payment_status: 'active',
          last_payment_at: new Date().toISOString(),
          subscription_expires_at: expiresAt.toISOString(),
          status: 'active',
          payment_method_last4: paymentData.card?.last_four_digits,
          payment_method_brand: paymentData.payment_method_id,
        })
        .eq('id', businessAccountId)
    } else if (paymentData.status === 'rejected') {
      await client
        .from('business_accounts')
        .update({ payment_status: 'failed' })
        .eq('id', businessAccountId)
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error processing payment notification:', error)
    return { success: false, error: error.message }
  }
}

export async function changePlanAction(
  businessAccountId: string,
  newPlanId: string,
  billingCycle: BillingCycle
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = await getSupabaseAdminClient()

    const { data: account } = await client
      .from('business_accounts')
      .select('mp_subscription_id, contact_email')
      .eq('id', businessAccountId)
      .single()

    if (account?.mp_subscription_id) {
      await preApproval.update({
        id: account.mp_subscription_id,
        body: { status: 'cancelled' },
      })
    }

    await client
      .from('business_accounts')
      .update({
        plan_id: newPlanId,
        billing_cycle: billingCycle,
        mp_subscription_id: null,
        payment_status: 'pending',
      })
      .eq('id', businessAccountId)

    return { success: true }
  } catch (error: any) {
    console.error('Error changing plan:', error)
    return { success: false, error: error.message }
  }
}

// ============================================
// Card Token Action
// ============================================

export async function createCardToken(cardBody: {
  cardNumber: string
  securityCode: string
  expirationMonth: string
  expirationYear: string
}): Promise<any> {
  try {
    const cardToken = new CardToken(getMpClient())

    const token = await cardToken.create({
      body: {
        card_number: cardBody.cardNumber,
        security_code: cardBody.securityCode,
        expiration_month: cardBody.expirationMonth,
        expiration_year: cardBody.expirationYear,
      },
    })

    return token as any
  } catch (error: any) {
    console.error('Error creating card token:', error)
    return { error: error.message || 'Error creating card token' }
  }
}
