'use server'

import { getSupabaseAdminClient } from './supabase'

export interface DateRangeParams {
  businessId: string
  startDate: string
  endDate: string
}

// ============================================================================
// REPORTES DE EJECUCIONES DE COBRANZA
// ============================================================================

export interface CollectionExecutionMetrics {
  total_executions: number
  pending: number
  processing: number
  completed: number
  failed: number
  total_clients: number
  total_emails_sent: number
  total_emails_delivered: number
  total_emails_opened: number
  total_emails_bounced: number
  avg_open_rate: number
  avg_delivery_rate: number
  avg_bounce_rate: number
}

export interface ExecutionTrendItem {
  date: string
  executions: number
  emails_sent: number
  emails_delivered: number
  emails_opened: number
}

export async function fetchCollectionExecutionMetricsAction(
  params: DateRangeParams
): Promise<CollectionExecutionMetrics> {
  const supabase = await getSupabaseAdminClient()

  const { data, error } = await supabase
    .from('collection_executions')
    .select(
      'status, total_clients, emails_sent, emails_delivered, emails_opened, emails_bounced, open_rate, delivery_rate, bounce_rate'
    )
    .eq('business_id', params.businessId)
    .gte('created_at', params.startDate)
    .lte('created_at', params.endDate)

  if (error) {
    console.error('Error fetching execution metrics:', error)
    return {
      total_executions: 0,
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      total_clients: 0,
      total_emails_sent: 0,
      total_emails_delivered: 0,
      total_emails_opened: 0,
      total_emails_bounced: 0,
      avg_open_rate: 0,
      avg_delivery_rate: 0,
      avg_bounce_rate: 0,
    }
  }

  const executions = data || []

  return {
    total_executions: executions.length,
    pending: executions.filter((e) => e.status === 'pending').length,
    processing: executions.filter((e) => e.status === 'processing').length,
    completed: executions.filter((e) => e.status === 'completed').length,
    failed: executions.filter((e) => e.status === 'failed').length,
    total_clients: executions.reduce((sum, e) => sum + (e.total_clients || 0), 0),
    total_emails_sent: executions.reduce(
      (sum, e) => sum + (e.emails_sent || 0),
      0
    ),
    total_emails_delivered: executions.reduce(
      (sum, e) => sum + (e.emails_delivered || 0),
      0
    ),
    total_emails_opened: executions.reduce(
      (sum, e) => sum + (e.emails_opened || 0),
      0
    ),
    total_emails_bounced: executions.reduce(
      (sum, e) => sum + (e.emails_bounced || 0),
      0
    ),
    avg_open_rate:
      executions.length > 0
        ? executions.reduce((sum, e) => sum + (e.open_rate || 0), 0) /
          executions.length
        : 0,
    avg_delivery_rate:
      executions.length > 0
        ? executions.reduce((sum, e) => sum + (e.delivery_rate || 0), 0) /
          executions.length
        : 0,
    avg_bounce_rate:
      executions.length > 0
        ? executions.reduce((sum, e) => sum + (e.bounce_rate || 0), 0) /
          executions.length
        : 0,
  }
}

export async function fetchExecutionTrendAction(
  params: DateRangeParams
): Promise<ExecutionTrendItem[]> {
  const supabase = await getSupabaseAdminClient()

  const { data, error } = await supabase
    .from('collection_executions')
    .select('created_at, emails_sent, emails_delivered, emails_opened')
    .eq('business_id', params.businessId)
    .gte('created_at', params.startDate)
    .lte('created_at', params.endDate)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching execution trend:', error)
    return []
  }

  // Agrupar por fecha
  const grouped = (data || []).reduce(
    (acc: Record<string, ExecutionTrendItem>, item: any) => {
      const date = item.created_at.split('T')[0]
      if (!acc[date]) {
        acc[date] = {
          date,
          executions: 0,
          emails_sent: 0,
          emails_delivered: 0,
          emails_opened: 0,
        }
      }
      acc[date].executions += 1
      acc[date].emails_sent += item.emails_sent || 0
      acc[date].emails_delivered += item.emails_delivered || 0
      acc[date].emails_opened += item.emails_opened || 0
      return acc
    },
    {}
  )

  return Object.values(grouped)
}

// ============================================================================
// REPORTES DE CLIENTES EN COBRANZA
// ============================================================================

export interface ClientStatusDistribution {
  pending: number
  queued: number
  sent: number
  delivered: number
  opened: number
  bounced: number
  failed: number
}

export interface ClientMetrics {
  total_clients: number
  with_fallback: number
  fallback_sent: number
  status_distribution: ClientStatusDistribution
}

export async function fetchClientMetricsAction(
  params: DateRangeParams
): Promise<ClientMetrics> {
  const supabase = await getSupabaseAdminClient()

  // Primero obtener los execution_ids del período
  const { data: executions, error: execError } = await supabase
    .from('collection_executions')
    .select('id')
    .eq('business_id', params.businessId)
    .gte('created_at', params.startDate)
    .lte('created_at', params.endDate)

  if (execError) {
    console.error('Error fetching executions:', execError)
    return {
      total_clients: 0,
      with_fallback: 0,
      fallback_sent: 0,
      status_distribution: {
        pending: 0,
        queued: 0,
        sent: 0,
        delivered: 0,
        opened: 0,
        bounced: 0,
        failed: 0,
      },
    }
  }

  const executionIds = executions?.map((e) => e.id) || []

  if (executionIds.length === 0) {
    return {
      total_clients: 0,
      with_fallback: 0,
      fallback_sent: 0,
      status_distribution: {
        pending: 0,
        queued: 0,
        sent: 0,
        delivered: 0,
        opened: 0,
        bounced: 0,
        failed: 0,
      },
    }
  }

  const { data, error } = await supabase
    .from('collection_clients')
    .select('status, fallback_required, fallback_sent_at')
    .in('execution_id', executionIds)

  if (error) {
    console.error('Error fetching client metrics:', error)
    return {
      total_clients: 0,
      with_fallback: 0,
      fallback_sent: 0,
      status_distribution: {
        pending: 0,
        queued: 0,
        sent: 0,
        delivered: 0,
        opened: 0,
        bounced: 0,
        failed: 0,
      },
    }
  }

  const clients = data || []

  return {
    total_clients: clients.length,
    with_fallback: clients.filter((c) => c.fallback_required).length,
    fallback_sent: clients.filter((c) => c.fallback_sent_at).length,
    status_distribution: {
      pending: clients.filter((c) => c.status === 'pending').length,
      queued: clients.filter((c) => c.status === 'queued').length,
      sent: clients.filter((c) => c.status === 'sent').length,
      delivered: clients.filter((c) => c.status === 'delivered').length,
      opened: clients.filter((c) => c.status === 'opened').length,
      bounced: clients.filter((c) => c.status === 'bounced').length,
      failed: clients.filter((c) => c.status === 'failed').length,
    },
  }
}

// ============================================================================
// REPORTES DE REPUTACIÓN DE EMAIL Y BLACKLIST
// ============================================================================

export interface BlacklistMetrics {
  total_blacklisted: number
  hard_bounces: number
  soft_bounces: number
  complaints: number
  recent_bounces: number // Últimos 30 días
}

export async function fetchBlacklistMetricsAction(
  businessId: string
): Promise<BlacklistMetrics> {
  const supabase = await getSupabaseAdminClient()

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data, error } = await supabase
    .from('email_blacklist')
    .select('bounce_type, bounced_at')
    .eq('business_id', businessId)

  if (error) {
    console.error('Error fetching blacklist metrics:', error)
    return {
      total_blacklisted: 0,
      hard_bounces: 0,
      soft_bounces: 0,
      complaints: 0,
      recent_bounces: 0,
    }
  }

  const blacklisted = data || []
  const recentDate = thirtyDaysAgo.toISOString()

  return {
    total_blacklisted: blacklisted.length,
    hard_bounces: blacklisted.filter((b) => b.bounce_type === 'hard').length,
    soft_bounces: blacklisted.filter((b) => b.bounce_type === 'soft').length,
    complaints: blacklisted.filter((b) => b.bounce_type === 'complaint').length,
    recent_bounces: blacklisted.filter((b) => b.bounced_at >= recentDate)
      .length,
  }
}

// ============================================================================
// REPORTES DE LOTES DE EJECUCIÓN
// ============================================================================

export interface BatchMetrics {
  total_batches: number
  pending: number
  queued: number
  processing: number
  completed: number
  failed: number
  total_clients: number
  total_emails_sent: number
  total_emails_delivered: number
  total_emails_opened: number
}

export async function fetchBatchMetricsAction(
  params: DateRangeParams
): Promise<BatchMetrics> {
  const supabase = await getSupabaseAdminClient()

  // Obtener execution_ids del período
  const { data: executions, error: execError } = await supabase
    .from('collection_executions')
    .select('id')
    .eq('business_id', params.businessId)
    .gte('created_at', params.startDate)
    .lte('created_at', params.endDate)

  if (execError) {
    console.error('Error fetching executions for batches:', execError)
    return {
      total_batches: 0,
      pending: 0,
      queued: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      total_clients: 0,
      total_emails_sent: 0,
      total_emails_delivered: 0,
      total_emails_opened: 0,
    }
  }

  const executionIds = executions?.map((e) => e.id) || []

  if (executionIds.length === 0) {
    return {
      total_batches: 0,
      pending: 0,
      queued: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      total_clients: 0,
      total_emails_sent: 0,
      total_emails_delivered: 0,
      total_emails_opened: 0,
    }
  }

  const { data, error } = await supabase
    .from('execution_batches')
    .select(
      'status, total_clients, emails_sent, emails_delivered, emails_opened'
    )
    .in('execution_id', executionIds)

  if (error) {
    console.error('Error fetching batch metrics:', error)
    return {
      total_batches: 0,
      pending: 0,
      queued: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      total_clients: 0,
      total_emails_sent: 0,
      total_emails_delivered: 0,
      total_emails_opened: 0,
    }
  }

  const batches = data || []

  return {
    total_batches: batches.length,
    pending: batches.filter((b) => b.status === 'pending').length,
    queued: batches.filter((b) => b.status === 'queued').length,
    processing: batches.filter((b) => b.status === 'processing').length,
    completed: batches.filter((b) => b.status === 'completed').length,
    failed: batches.filter((b) => b.status === 'failed').length,
    total_clients: batches.reduce((sum, b) => sum + (b.total_clients || 0), 0),
    total_emails_sent: batches.reduce(
      (sum, b) => sum + (b.emails_sent || 0),
      0
    ),
    total_emails_delivered: batches.reduce(
      (sum, b) => sum + (b.emails_delivered || 0),
      0
    ),
    total_emails_opened: batches.reduce(
      (sum, b) => sum + (b.emails_opened || 0),
      0
    ),
  }
}

// ============================================================================
// REPORTES DE CLIENTES DEL NEGOCIO
// ============================================================================

export interface CustomerMetrics {
  total_customers: number
  active: number
  inactive: number
  vip: number
  blocked: number
  new_this_period: number
}

export async function fetchCustomerMetricsAction(
  params: DateRangeParams
): Promise<CustomerMetrics> {
  const supabase = await getSupabaseAdminClient()

  const { data, error } = await supabase
    .from('business_customers')
    .select('status, created_at')
    .eq('business_id', params.businessId)
    .gte('created_at', params.startDate)
    .lte('created_at', params.endDate)

  if (error) {
    console.error('Error fetching customer metrics:', error)
    return {
      total_customers: 0,
      active: 0,
      inactive: 0,
      vip: 0,
      blocked: 0,
      new_this_period: 0,
    }
  }

  const customers = data || []

  return {
    total_customers: customers.length,
    active: customers.filter((c) => c.status === 'active').length,
    inactive: customers.filter((c) => c.status === 'inactive').length,
    vip: customers.filter((c) => c.status === 'vip').length,
    blocked: customers.filter((c) => c.status === 'blocked').length,
    new_this_period: customers.length,
  }
}

// ============================================================================
// TIPOS Y FUNCIONES LEGACY (mantenidas para compatibilidad)
// ============================================================================

export interface HourlyDistribution {
  hour: number
  count: number
}

export interface DailyDistribution {
  day: number
  day_name: string
  count: number
}

export async function fetchHourlyDistributionAction(
  params: DateRangeParams
): Promise<HourlyDistribution[]> {
  const supabase = await getSupabaseAdminClient()

  const { data, error } = await supabase.rpc('get_hourly_distribution', {
    p_business_id: params.businessId,
    p_start_date: params.startDate,
    p_end_date: params.endDate,
  })

  if (error) {
    console.error('Error fetching hourly distribution:', error)
    return []
  }

  return (data || []).map((item: any) => ({
    hour: item.hour || 0,
    count: item.count || 0,
  }))
}

export async function fetchDailyDistributionAction(
  params: DateRangeParams
): Promise<DailyDistribution[]> {
  const supabase = await getSupabaseAdminClient()

  const { data, error } = await supabase.rpc('get_daily_distribution', {
    p_business_id: params.businessId,
    p_start_date: params.startDate,
    p_end_date: params.endDate,
  })

  if (error) {
    console.error('Error fetching daily distribution:', error)
    return []
  }

  return (data || []).map((item: any) => ({
    day: item.day || 0,
    day_name: item.day_name || '',
    count: item.count || 0,
  }))
}
