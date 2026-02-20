'use server'

import {
  PreApprovalPlan,
  PreApproval,
  MercadoPagoConfig,
} from 'mercadopago'
import { getMpAccessToken } from '@/lib/config/mercadopago'

function getPreApprovalPlanClient() {
  const config = new MercadoPagoConfig({
    accessToken: getMpAccessToken(),
    options: { timeout: 10000 },
  })
  return new PreApprovalPlan(config)
}

function getPreApprovalClient() {
  const config = new MercadoPagoConfig({
    accessToken: getMpAccessToken(),
    options: { timeout: 10000 },
  })
  return new PreApproval(config)
}

export interface MPPreApprovalPlan {
  id: string
  auto_recurring: {
    frequency: number
    frequency_type: 'months' | 'days'
    transaction_amount: number
    currency_id: string
    free_trial?: {
      frequency: number
      frequency_type: 'months' | 'days'
    }
  }
  back_url: string
  reason: string
  status: 'active' | 'inactive'
  date_created?: string
}

export interface MPPreApproval {
  id: string
  payer_id: number
  payer_email: string
  back_url: string
  collector_id: number
  application_id: number
  status: 'pending' | 'authorized' | 'paused' | 'cancelled'
  reason: string
  external_reference: string
  date_created: string
  last_modified: string
  init_point: string
  preapproval_plan_id: string
  auto_recurring: {
    frequency: number
    frequency_type: string
    transaction_amount: number
    currency_id: string
    start_date?: string
    end_date?: string
  }
  summarized: {
    quotas: number
    charged_quantity: number
    charged_amount: number
    pending_charge_quantity: number
    pending_charge_amount: number
    semaphore: string
    last_charged_date?: string
    last_charged_amount?: number
  }
}

export async function createPreApprovalPlan(
  reason: string,
  autoRecurring: {
    frequency: number
    frequencyType: 'months' | 'days'
    transactionAmount: number
    currencyId: string
  },
  backUrl: string
): Promise<{ success: boolean; plan?: MPPreApprovalPlan; error?: string }> {
  try {
    const client = getPreApprovalPlanClient()

    const response = await client.create({
      body: {
        reason,
        auto_recurring: {
          frequency: autoRecurring.frequency,
          frequency_type: autoRecurring.frequencyType,
          transaction_amount: autoRecurring.transactionAmount,
          currency_id: autoRecurring.currencyId,
        },
        back_url: backUrl,
      },
    })

    return { success: true, plan: response as unknown as MPPreApprovalPlan }
  } catch (error: any) {
    console.error('Error creating preapproval plan:', error)
    return { success: false, error: error.message }
  }
}

export async function getPreApprovalPlan(
  planId: string
): Promise<MPPreApprovalPlan | null> {
  try {
    const client = getPreApprovalPlanClient()
    const response = await client.get({ id: planId } as any)
    return response as unknown as MPPreApprovalPlan
  } catch (error) {
    console.error('Error getting preapproval plan:', error)
    return null
  }
}

export async function createPreApproval(
  preapprovalPlanId: string,
  externalReference: string,
  payerEmail: string,
  backUrl: string,
  cardTokenId?: string
): Promise<{ success: boolean; preapproval?: MPPreApproval; error?: string }> {
  try {
    const client = getPreApprovalClient()

    const body: any = {
      preapproval_plan_id: preapprovalPlanId,
      external_reference: externalReference,
      payer_email: payerEmail,
      back_url: backUrl,
      status: 'pending',
    }

    if (cardTokenId) {
      body.card_token_id = cardTokenId
    }

    const response = await client.create({ body })

    return {
      success: true,
      preapproval: response as unknown as MPPreApproval,
    }
  } catch (error: any) {
    console.error('Error creating preapproval:', error)
    return { success: false, error: error.message }
  }
}

export async function getPreApproval(
  preapprovalId: string
): Promise<MPPreApproval | null> {
  try {
    const client = getPreApprovalClient()
    const response = await client.get({ id: preapprovalId })
    return response as unknown as MPPreApproval
  } catch (error) {
    console.error('Error getting preapproval:', error)
    return null
  }
}

export async function cancelPreApproval(
  preapprovalId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getPreApprovalClient()
    await client.update({
      id: preapprovalId,
      body: { status: 'cancelled' },
    })
    return { success: true }
  } catch (error: any) {
    console.error('Error cancelling preapproval:', error)
    return { success: false, error: error.message }
  }
}

export async function pausePreApproval(
  preapprovalId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getPreApprovalClient()
    await client.update({
      id: preapprovalId,
      body: { status: 'paused' },
    })
    return { success: true }
  } catch (error: any) {
    console.error('Error pausing preapproval:', error)
    return { success: false, error: error.message }
  }
}
