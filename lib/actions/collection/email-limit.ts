'use server'

import { getSupabaseAdminClient } from '@/lib/actions/supabase'
import type { BusinessAccount } from '@/lib/models/business-account/business-account'

export interface EmailCountResult {
  emailsSent: number
  periodStart: Date
  periodEnd: Date
}

export interface EmailLimitValidation {
  maxEmails: number | null
  emailsSent: number
  emailsRemaining: number | null
  hasReachedLimit: boolean
  periodStart: Date
  periodEnd: Date
}

/**
 * Cuenta los emails enviados por un business_account en un período específico.
 * 
 * Para trials: cuenta desde trial_ends_at - trial_days hasta ahora
 * Para planes pagos: cuenta desde subscription_started_at según billing_cycle
 */
export async function countEmailsSentAction(
  businessAccountId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<EmailCountResult> {
  const supabase = await getSupabaseAdminClient()

  try {
    // Obtener todos los business_id que pertenecen al business_account
    const { data: businesses, error: businessesError } = await supabase
      .from('businesses')
      .select('id')
      .eq('business_account_id', businessAccountId)

    if (businessesError) {
      throw new Error(`Error fetching businesses: ${businessesError.message}`)
    }

    if (!businesses || businesses.length === 0) {
      return {
        emailsSent: 0,
        periodStart,
        periodEnd,
      }
    }

    const businessIds = businesses.map((b) => b.id)

    // Contar total_clients de collection_executions en el período
    // Usamos created_at para determinar cuándo se creó la ejecución
    const { data: executions, error: executionsError } = await supabase
      .from('collection_executions')
      .select('total_clients')
      .in('business_id', businessIds)
      .gte('created_at', periodStart.toISOString())
      .lte('created_at', periodEnd.toISOString())

    if (executionsError) {
      throw new Error(`Error counting executions: ${executionsError.message}`)
    }

    const emailsSent = executions?.reduce((sum, exec) => sum + (exec.total_clients || 0), 0) || 0

    return {
      emailsSent,
      periodStart,
      periodEnd,
    }
  } catch (error: any) {
    console.error('Error counting emails sent:', error)
    throw error
  }
}

/**
 * Obtiene el período de conteo según el tipo de cuenta.
 * 
 * Trial: desde trial_ends_at - trial_days hasta ahora (14 días por defecto)
 * Plan pagado: desde subscription_started_at según billing_cycle hasta ahora
 */
export async function getEmailPeriodForAccount(
  account: BusinessAccount,
  currentDate: Date = new Date()
): Promise<{ start: Date; end: Date }> {
  const end = currentDate

  if (account.status === 'trial' && account.trial_ends_at) {
    // Trial: período desde inicio del trial hasta ahora
    const trialDays = account.custom_trial_days || 14
    const trialEndsAt = new Date(account.trial_ends_at)
    const start = new Date(trialEndsAt)
    start.setDate(start.getDate() - trialDays)
    
    return { start, end }
  }

  // Plan pagado: período según billing_cycle
  if (!account.subscription_started_at) {
    // Sin fecha de inicio, usar desde siempre (inicio de época)
    return { start: new Date(0), end }
  }

  const subscriptionStart = new Date(account.subscription_started_at)
  const billingCycle = account.billing_cycle || 'monthly'

  // Calcular inicio del período actual basado en billing_cycle
  const start = calculatePeriodStart(subscriptionStart, billingCycle, currentDate)
  
  return { start, end }
}

/**
 * Calcula el inicio del período actual basado en el ciclo de facturación.
 * Esta función es síncrona - no realiza operaciones async.
 */
function calculatePeriodStart(
  subscriptionStart: Date,
  billingCycle: string,
  currentDate: Date
): Date {
  const start = new Date(subscriptionStart)
  
  if (billingCycle === 'monthly') {
    // Avanzar mes a mes desde subscription_start hasta currentDate
    while (start < currentDate) {
      const nextMonth = new Date(start)
      nextMonth.setMonth(nextMonth.getMonth() + 1)
      if (nextMonth > currentDate) break
      start.setMonth(start.getMonth() + 1)
    }
  } else if (billingCycle === 'yearly') {
    // Avanzar año a año desde subscription_start hasta currentDate
    while (start < currentDate) {
      const nextYear = new Date(start)
      nextYear.setFullYear(nextYear.getFullYear() + 1)
      if (nextYear > currentDate) break
      start.setFullYear(start.getFullYear() + 1)
    }
  }

  return start
}

/**
 * Obtiene el límite de emails efectivo considerando override en settings.
 * Prioridad: settings.max_emails_override > plan.features.max_emails
 */
function getEffectiveEmailLimit(account: BusinessAccount): number | null {
  // Primero verificar si hay un override en settings
  const settings = account.settings as Record<string, unknown> | null
  const override = settings?.max_emails_override
  
  if (override !== undefined && (typeof override === 'number' || override === null)) {
    return override as number | null
  }

  // Si no hay override, retornar null para consultar el plan
  return null
}

/**
 * Valida si una cuenta puede enviar la cantidad solicitada de emails.
 * Retorna información detallada sobre el límite y uso actual.
 */
export async function validateEmailLimitAction(
  account: BusinessAccount,
  requestedCount: number
): Promise<EmailLimitValidation> {
  const supabase = await getSupabaseAdminClient()

  try {
    // Verificar primero si hay un override en settings
    let maxEmails = getEffectiveEmailLimit(account)

    // Si no hay override, obtener del plan
    if (maxEmails === undefined || maxEmails === null) {
      const { data: plan, error: planError } = await supabase
        .from('plans')
        .select('features')
        .eq('id', account.plan_id)
        .single()

      if (planError) {
        throw new Error(`Error fetching plan: ${planError.message}`)
      }

      maxEmails = plan?.features?.max_emails ?? null
    }

    // Si no hay límite (null), permitir sin restricciones
    if (maxEmails === null) {
      const { start, end } = await getEmailPeriodForAccount(account)
      return {
        maxEmails: null,
        emailsSent: 0,
        emailsRemaining: null,
        hasReachedLimit: false,
        periodStart: start,
        periodEnd: end,
      }
    }

    // Si el límite es 0, bloquear completamente
    if (maxEmails === 0) {
      const { start, end } = await getEmailPeriodForAccount(account)
      return {
        maxEmails: 0,
        emailsSent: 0,
        emailsRemaining: 0,
        hasReachedLimit: true,
        periodStart: start,
        periodEnd: end,
      }
    }

    // Calcular período y contar emails enviados
    const { start, end } = await getEmailPeriodForAccount(account)
    const { emailsSent } = await countEmailsSentAction(account.id, start, end)

    const emailsRemaining = Math.max(0, maxEmails - emailsSent)
    const hasReachedLimit = emailsRemaining === 0

    return {
      maxEmails,
      emailsSent,
      emailsRemaining,
      hasReachedLimit,
      periodStart: start,
      periodEnd: end,
    }
  } catch (error: any) {
    console.error('Error validating email limit:', error)
    throw error
  }
}