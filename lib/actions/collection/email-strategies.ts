'use server'

import { getSupabaseAdminClient } from '@/lib/actions/supabase'
import { DeliveryStrategy, DeliveryStrategyInsert, DeliveryStrategyUpdate } from '@/lib/models/collection/delivery-strategy'
import { EmailReputationProfile } from '@/lib/models/collection/email-reputation'

/**
 * Obtiene todas las estrategias de entrega para un negocio
 */
export async function getBusinessStrategiesAction(businessId: string): Promise<DeliveryStrategy[]> {
  const supabase = await getSupabaseAdminClient()

  const { data, error } = await supabase
    .from('delivery_strategies')
    .select('*')
    .eq('business_id', businessId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching business strategies:', error)
    throw new Error(`Error fetching business strategies: ${error.message}`)
  }

  return (data || []).map(item => ({ ...item }))
}

/**
 * Obtiene una estrategia por ID
 */
export async function getStrategyByIdAction(strategyId: string): Promise<DeliveryStrategy | null> {
  const supabase = await getSupabaseAdminClient()

  const { data, error } = await supabase
    .from('delivery_strategies')
    .select('*')
    .eq('id', strategyId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    console.error('Error fetching strategy by id:', error)
    throw new Error(`Error fetching strategy: ${error.message}`)
  }

  return data ? { ...data } : null
}

/**
 * Obtiene la estrategia por defecto para un negocio
 */
export async function getDefaultStrategyAction(businessId: string): Promise<DeliveryStrategy | null> {
  const supabase = await getSupabaseAdminClient()

  const { data, error } = await supabase
    .from('delivery_strategies')
    .select('*')
    .eq('business_id', businessId)
    .eq('is_default', true)
    .eq('is_active', true)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    console.error('Error fetching default strategy:', error)
    throw new Error(`Error fetching default strategy: ${error.message}`)
  }

  return data ? { ...data } : null
}

/**
 * Crea una nueva estrategia de entrega
 */
export async function createDeliveryStrategyAction(strategy: DeliveryStrategyInsert): Promise<DeliveryStrategy> {
  const supabase = await getSupabaseAdminClient()

  if (strategy.is_default) {
    await supabase
      .from('delivery_strategies')
      .update({ is_default: false })
      .eq('business_id', strategy.business_id)
      .eq('is_default', true)
  }

  const { data, error } = await supabase
    .from('delivery_strategies')
    .insert(strategy)
    .select()
    .single()

  if (error) {
    console.error('Error creating delivery strategy:', error)
    throw new Error(`Error creating delivery strategy: ${error.message}`)
  }

  return { ...data }
}

/**
 * Actualiza una estrategia de entrega
 */
export async function updateDeliveryStrategyAction(strategyId: string, updates: DeliveryStrategyUpdate): Promise<DeliveryStrategy> {
  const supabase = await getSupabaseAdminClient()

  if (updates.is_default) {
    const { data: currentStrategy } = await supabase
      .from('delivery_strategies')
      .select('business_id')
      .eq('id', strategyId)
      .single()

    if (currentStrategy) {
      await supabase
        .from('delivery_strategies')
        .update({ is_default: false })
        .eq('business_id', currentStrategy.business_id)
        .eq('is_default', true)
    }
  }

  const { data, error } = await supabase
    .from('delivery_strategies')
    .update(updates)
    .eq('id', strategyId)
    .select()
    .single()

  if (error) {
    console.error('Error updating delivery strategy:', error)
    throw new Error(`Error updating delivery strategy: ${error.message}`)
  }

  return { ...data }
}

/**
 * Elimina una estrategia (soft delete)
 */
export async function deleteDeliveryStrategyAction(strategyId: string): Promise<void> {
  const supabase = await getSupabaseAdminClient()

  const { error } = await supabase
    .from('delivery_strategies')
    .update({ is_active: false })
    .eq('id', strategyId)

  if (error) {
    console.error('Error deleting delivery strategy:', error)
    throw new Error(`Error deleting delivery strategy: ${error.message}`)
  }
}

/**
 * Establece una estrategia como predeterminada
 */
export async function setDefaultStrategyAction(strategyId: string): Promise<DeliveryStrategy> {
  const supabase = await getSupabaseAdminClient()

  const { data: strategy, error: fetchError } = await supabase
    .from('delivery_strategies')
    .select('business_id')
    .eq('id', strategyId)
    .single()

  if (fetchError) {
    console.error('Error fetching strategy:', fetchError)
    throw new Error(`Error fetching strategy: ${fetchError.message}`)
  }

  if (!strategy) {
    throw new Error('Strategy not found')
  }

  await supabase
    .from('delivery_strategies')
    .update({ is_default: false })
    .eq('business_id', strategy.business_id)
    .eq('is_default', true)

  const { data, error } = await supabase
    .from('delivery_strategies')
    .update({ is_default: true })
    .eq('id', strategyId)
    .select()
    .single()

  if (error) {
    console.error('Error setting default strategy:', error)
    throw new Error(`Error setting default strategy: ${error.message}`)
  }

  return { ...data }
}

/**
 * Obtiene un resumen de reputación para un negocio (objetos planos)
 */
export async function getReputationSummaryAction(businessId: string): Promise<EmailReputationProfile[]> {
  const supabase = await getSupabaseAdminClient()

  const { data, error } = await supabase
    .from('email_reputation_profiles')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching reputation summary:', error)
    return []
  }

  return (data || []).map(item => ({ ...item }))
}

/**
 * Obtiene los dominios únicos configurados para un negocio
 */
export async function getBusinessDomainsAction(businessId: string): Promise<string[]> {
  const supabase = await getSupabaseAdminClient()

  // Obtenemos dominios únicos usando distinct
  const { data, error } = await supabase
    .from('email_reputation_profiles')
    .select('domain')
    .eq('business_id', businessId)

  if (error) {
    console.error('Error fetching business domains:', error)
    return []
  }

  // Filtrar duplicados en memoria y ordenar
  // Nota: Podríamos usar .select('domain', { count: 'exact', head: false }) si tuviéramos tabla de dominios
  // pero como es reputación, mejor filtramos en JS
  const domains = Array.from(new Set((data || []).map((item: any) => item.domain))).sort()

  return domains
}

/**
 * Obtiene los clientes de una ejecución con sus estados actuales
 */
export async function getExecutionClientsAction(executionId: string): Promise<{
  total: number
  pending: number
  sent: number
  delivered: number
  opened: number
  bounced: number
  failed: number
}> {
  const supabase = await getSupabaseAdminClient()

  const { data, error } = await supabase
    .from('collection_clients')
    .select('status')
    .eq('execution_id', executionId)

  if (error || !data) {
    return { total: 0, pending: 0, sent: 0, delivered: 0, opened: 0, bounced: 0, failed: 0 }
  }

  return {
    total: data.length,
    pending: data.filter((c: { status: string }) => c.status === 'pending').length,
    sent: data.filter((c: { status: string }) => c.status === 'sent').length,
    delivered: data.filter((c: { status: string }) => c.status === 'delivered').length,
    opened: data.filter((c: { status: string }) => c.status === 'opened').length,
    bounced: data.filter((c: { status: string }) => c.status === 'bounced').length,
    failed: data.filter((c: { status: string }) => c.status === 'failed').length,
  }
}
