'use server'

import {
  fetchCollectionExecutionMetricsAction,
  fetchExecutionTrendAction,
  fetchClientMetricsAction,
  fetchBlacklistMetricsAction,
  fetchBatchMetricsAction,
  fetchCustomerMetricsAction,
  type DateRangeParams,
} from './reports'
import { getSupabaseAdminClient } from './supabase'
import * as XLSX from 'xlsx'

export type ExportFormat = 'csv' | 'excel'
export type ReportType =
  | 'executions'
  | 'emails'
  | 'blacklist'
  | 'clients'
  | 'batches'
  | 'customers'

interface ExportResult {
  success: boolean
  data?: any
  filename?: string
  error?: string
}

function escapeCSV(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function arrayToCSV(headers: string[], rows: (string | number)[][]): string {
  const BOM = '\uFEFF'
  const headerLine = headers.map(escapeCSV).join(',')
  const dataLines = rows.map((row) => row.map(escapeCSV).join(','))
  return BOM + [headerLine, ...dataLines].join('\n')
}

function arrayToExcel(
  headers: string[],
  rows: (string | number)[][]
): ArrayBuffer {
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows])
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Reporte')

  return XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' })
}

// ============================================================================
// REPORTE DE EJECUCIONES DE COBRANZA
// ============================================================================

export async function exportExecutionsReportAction(
  params: DateRangeParams,
  format: ExportFormat
): Promise<ExportResult> {
  try {
    const [metrics, trend] = await Promise.all([
      fetchCollectionExecutionMetricsAction(params),
      fetchExecutionTrendAction(params),
    ])

    const headers = ['Fecha', 'Ejecuciones', 'Emails Enviados', 'Entregados', 'Abiertos']
    const rows = trend.map((t) => [
      t.date,
      t.executions,
      t.emails_sent,
      t.emails_delivered,
      t.emails_opened,
    ])

    // Agregar resumen al inicio
    rows.unshift(['', '', '', '', ''])
    rows.unshift(['--- TENDENCIA DIARIA ---', '', '', '', ''])
    rows.unshift(['', '', '', '', ''])
    rows.unshift([
      'Tasa de Apertura Promedio',
      `${metrics.avg_open_rate.toFixed(2)}%`,
      '',
      '',
      '',
    ])
    rows.unshift([
      'Tasa de Entrega Promedio',
      `${metrics.avg_delivery_rate.toFixed(2)}%`,
      '',
      '',
      '',
    ])
    rows.unshift([
      'Tasa de Rebote Promedio',
      `${metrics.avg_bounce_rate.toFixed(2)}%`,
      '',
      '',
      '',
    ])
    rows.unshift(['', '', '', '', ''])
    rows.unshift(['Emails Rebotados', metrics.total_emails_bounced, '', '', ''])
    rows.unshift(['Emails Abiertos', metrics.total_emails_opened, '', '', ''])
    rows.unshift(['Emails Entregados', metrics.total_emails_delivered, '', '', ''])
    rows.unshift(['Emails Enviados', metrics.total_emails_sent, '', '', ''])
    rows.unshift(['Total Clientes', metrics.total_clients, '', '', ''])
    rows.unshift(['Ejecuciones Fallidas', metrics.failed, '', '', ''])
    rows.unshift(['Ejecuciones Completadas', metrics.completed, '', '', ''])
    rows.unshift(['Ejecuciones en Proceso', metrics.processing, '', '', ''])
    rows.unshift(['Ejecuciones Pendientes', metrics.pending, '', '', ''])
    rows.unshift(['Total Ejecuciones', metrics.total_executions, '', '', ''])
    rows.unshift(['--- RESUMEN ---', '', '', '', ''])

    const data =
      format === 'csv'
        ? arrayToCSV(headers, rows)
        : arrayToExcel(headers, rows)

    return {
      success: true,
      data,
      filename: `reporte-ejecuciones-${params.startDate.split('T')[0]}.${format === 'csv' ? 'csv' : 'xlsx'}`,
    }
  } catch (error) {
    console.error('Error exporting executions report:', error)
    return { success: false, error: 'Error al exportar el reporte de ejecuciones' }
  }
}

// ============================================================================
// REPORTE DE MÉTRICAS DE EMAIL
// ============================================================================

export async function exportEmailMetricsReportAction(
  params: DateRangeParams,
  format: ExportFormat
): Promise<ExportResult> {
  try {
    const metrics = await fetchCollectionExecutionMetricsAction(params)

    const headers = ['Métrica', 'Valor', 'Porcentaje']
    const rows: (string | number)[][] = []

    const total = metrics.total_emails_sent || 1 // Evitar división por cero

    rows.push(['Emails Enviados', metrics.total_emails_sent, '100%'])
    rows.push([
      'Emails Entregados',
      metrics.total_emails_delivered,
      `${((metrics.total_emails_delivered / total) * 100).toFixed(2)}%`,
    ])
    rows.push([
      'Emails Abiertos',
      metrics.total_emails_opened,
      `${((metrics.total_emails_opened / total) * 100).toFixed(2)}%`,
    ])
    rows.push([
      'Emails Rebotados',
      metrics.total_emails_bounced,
      `${((metrics.total_emails_bounced / total) * 100).toFixed(2)}%`,
    ])
    rows.push(['', '', ''])
    rows.push(['--- TASAS PROMEDIO ---', '', ''])
    rows.push(['Tasa de Entrega Promedio', `${metrics.avg_delivery_rate.toFixed(2)}%`, ''])
    rows.push(['Tasa de Apertura Promedio', `${metrics.avg_open_rate.toFixed(2)}%`, ''])
    rows.push(['Tasa de Rebote Promedio', `${metrics.avg_bounce_rate.toFixed(2)}%`, ''])

    const data =
      format === 'csv'
        ? arrayToCSV(headers, rows)
        : arrayToExcel(headers, rows)

    return {
      success: true,
      data,
      filename: `reporte-metricas-email-${params.startDate.split('T')[0]}.${format === 'csv' ? 'csv' : 'xlsx'}`,
    }
  } catch (error) {
    console.error('Error exporting email metrics report:', error)
    return { success: false, error: 'Error al exportar el reporte de métricas de email' }
  }
}

// ============================================================================
// REPORTE DE BLACKLIST
// ============================================================================

export async function exportBlacklistReportAction(
  businessId: string,
  format: ExportFormat
): Promise<ExportResult> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { data: blacklist, error } = await supabase
      .from('email_blacklist')
      .select('email, bounce_type, bounce_reason, bounced_at')
      .eq('business_id', businessId)
      .order('bounced_at', { ascending: false })

    if (error) throw error

    const metrics = await fetchBlacklistMetricsAction(businessId)

    const headers = ['Email', 'Tipo de Rebote', 'Razón', 'Fecha']
    const rows = (blacklist || []).map((item) => [
      item.email,
      item.bounce_type || 'N/A',
      item.bounce_reason || 'N/A',
      item.bounced_at ? item.bounced_at.split('T')[0] : 'N/A',
    ])

    // Agregar resumen
    rows.unshift(['', '', '', ''])
    rows.unshift(['--- LISTADO DE EMAILS ---', '', '', ''])
    rows.unshift(['', '', '', ''])
    rows.unshift(['Rebotes Recientes (30 días)', metrics.recent_bounces, '', ''])
    rows.unshift(['Quejas', metrics.complaints, '', ''])
    rows.unshift(['Rebotes Suaves', metrics.soft_bounces, '', ''])
    rows.unshift(['Rebotes Duros', metrics.hard_bounces, '', ''])
    rows.unshift(['Total en Blacklist', metrics.total_blacklisted, '', ''])
    rows.unshift(['--- RESUMEN ---', '', '', ''])

    const data =
      format === 'csv'
        ? arrayToCSV(headers, rows)
        : arrayToExcel(headers, rows)

    return {
      success: true,
      data,
      filename: `reporte-blacklist-${new Date().toISOString().split('T')[0]}.${format === 'csv' ? 'csv' : 'xlsx'}`,
    }
  } catch (error) {
    console.error('Error exporting blacklist report:', error)
    return { success: false, error: 'Error al exportar el reporte de blacklist' }
  }
}

// ============================================================================
// REPORTE DE CLIENTES EN COBRANZA
// ============================================================================

export async function exportCollectionClientsReportAction(
  params: DateRangeParams,
  format: ExportFormat
): Promise<ExportResult> {
  try {
    const metrics = await fetchClientMetricsAction(params)
    const supabase = await getSupabaseAdminClient()

    // Obtener execution_ids del período
    const { data: executions } = await supabase
      .from('collection_executions')
      .select('id')
      .eq('business_id', params.businessId)
      .gte('created_at', params.startDate)
      .lte('created_at', params.endDate)

    const executionIds = executions?.map((e) => e.id) || []

    let clients: any[] = []
    if (executionIds.length > 0) {
      const { data } = await supabase
        .from('collection_clients')
        .select(
          'status, email_sent_at, email_delivered_at, email_opened_at, fallback_required, fallback_sent_at, business_customers(full_name, email, nit)'
        )
        .in('execution_id', executionIds)

      clients = data || []
    }

    const headers = [
      'Cliente',
      'NIT',
      'Email',
      'Estado',
      'Email Enviado',
      'Email Entregado',
      'Email Abierto',
      'Fallback Requerido',
      'Fallback Enviado',
    ]
    const rows = clients.map((c: any) => {
      const customer = c.business_customers || {}
      return [
        customer.full_name || 'N/A',
        customer.nit || 'N/A',
        customer.email || 'N/A',
        c.status,
        c.email_sent_at ? c.email_sent_at.split('T')[0] : 'N/A',
        c.email_delivered_at ? c.email_delivered_at.split('T')[0] : 'N/A',
        c.email_opened_at ? c.email_opened_at.split('T')[0] : 'N/A',
        c.fallback_required ? 'Sí' : 'No',
        c.fallback_sent_at ? 'Sí' : 'No',
      ]
    })

    // Agregar resumen
    rows.unshift(['', '', '', '', '', '', '', '', ''])
    rows.unshift(['--- LISTADO DE CLIENTES ---', '', '', '', '', '', '', '', ''])
    rows.unshift(['', '', '', '', '', '', '', '', ''])
    rows.unshift(['Fallidos', metrics.status_distribution.failed, '', '', '', '', '', '', ''])
    rows.unshift(['Rebotados', metrics.status_distribution.bounced, '', '', '', '', '', '', ''])
    rows.unshift(['Abiertos', metrics.status_distribution.opened, '', '', '', '', '', '', ''])
    rows.unshift(['Entregados', metrics.status_distribution.delivered, '', '', '', '', '', '', ''])
    rows.unshift(['Enviados', metrics.status_distribution.sent, '', '', '', '', '', '', ''])
    rows.unshift(['En Cola', metrics.status_distribution.queued, '', '', '', '', '', '', ''])
    rows.unshift(['Pendientes', metrics.status_distribution.pending, '', '', '', '', '', '', ''])
    rows.unshift(['Con Fallback Enviado', metrics.fallback_sent, '', '', '', '', '', '', ''])
    rows.unshift(['Con Fallback Requerido', metrics.with_fallback, '', '', '', '', '', '', ''])
    rows.unshift(['Total Clientes', metrics.total_clients, '', '', '', '', '', '', ''])
    rows.unshift(['--- RESUMEN ---', '', '', '', '', '', '', '', ''])

    const data =
      format === 'csv'
        ? arrayToCSV(headers, rows)
        : arrayToExcel(headers, rows)

    return {
      success: true,
      data,
      filename: `reporte-clientes-cobranza-${params.startDate.split('T')[0]}.${format === 'csv' ? 'csv' : 'xlsx'}`,
    }
  } catch (error) {
    console.error('Error exporting collection clients report:', error)
    return { success: false, error: 'Error al exportar el reporte de clientes' }
  }
}

// ============================================================================
// REPORTE DE LOTES DE EJECUCIÓN
// ============================================================================

export async function exportBatchesReportAction(
  params: DateRangeParams,
  format: ExportFormat
): Promise<ExportResult> {
  try {
    const metrics = await fetchBatchMetricsAction(params)
    const supabase = await getSupabaseAdminClient()

    // Obtener execution_ids del período
    const { data: executions } = await supabase
      .from('collection_executions')
      .select('id, name')
      .eq('business_id', params.businessId)
      .gte('created_at', params.startDate)
      .lte('created_at', params.endDate)

    const executionMap = new Map(executions?.map((e) => [e.id, e.name]) || [])
    const executionIds = executions?.map((e) => e.id) || []

    let batches: any[] = []
    if (executionIds.length > 0) {
      const { data } = await supabase
        .from('execution_batches')
        .select(
          'execution_id, batch_number, batch_name, status, total_clients, emails_sent, emails_delivered, emails_opened, scheduled_for, processed_at, completed_at'
        )
        .in('execution_id', executionIds)
        .order('scheduled_for', { ascending: true })

      batches = data || []
    }

    const headers = [
      'Ejecución',
      'Lote #',
      'Nombre',
      'Estado',
      'Clientes',
      'Emails Enviados',
      'Entregados',
      'Abiertos',
      'Programado Para',
      'Procesado',
      'Completado',
    ]
    const rows = batches.map((b) => [
      executionMap.get(b.execution_id) || 'N/A',
      b.batch_number,
      b.batch_name || `Lote ${b.batch_number}`,
      b.status,
      b.total_clients,
      b.emails_sent,
      b.emails_delivered,
      b.emails_opened,
      b.scheduled_for ? b.scheduled_for.split('T')[0] : 'N/A',
      b.processed_at ? b.processed_at.split('T')[0] : 'N/A',
      b.completed_at ? b.completed_at.split('T')[0] : 'N/A',
    ])

    // Agregar resumen
    rows.unshift(['', '', '', '', '', '', '', '', '', '', ''])
    rows.unshift(['--- LISTADO DE LOTES ---', '', '', '', '', '', '', '', '', '', ''])
    rows.unshift(['', '', '', '', '', '', '', '', '', '', ''])
    rows.unshift(['Fallidos', metrics.failed, '', '', '', '', '', '', '', '', ''])
    rows.unshift(['Completados', metrics.completed, '', '', '', '', '', '', '', '', ''])
    rows.unshift(['En Proceso', metrics.processing, '', '', '', '', '', '', '', '', ''])
    rows.unshift(['En Cola', metrics.queued, '', '', '', '', '', '', '', '', ''])
    rows.unshift(['Pendientes', metrics.pending, '', '', '', '', '', '', '', '', ''])
    rows.unshift(['Emails Abiertos', metrics.total_emails_opened, '', '', '', '', '', '', '', '', ''])
    rows.unshift(['Emails Entregados', metrics.total_emails_delivered, '', '', '', '', '', '', '', '', ''])
    rows.unshift(['Emails Enviados', metrics.total_emails_sent, '', '', '', '', '', '', '', '', ''])
    rows.unshift(['Total Clientes', metrics.total_clients, '', '', '', '', '', '', '', '', ''])
    rows.unshift(['Total Lotes', metrics.total_batches, '', '', '', '', '', '', '', '', ''])
    rows.unshift(['--- RESUMEN ---', '', '', '', '', '', '', '', '', '', ''])

    const data =
      format === 'csv'
        ? arrayToCSV(headers, rows)
        : arrayToExcel(headers, rows)

    return {
      success: true,
      data,
      filename: `reporte-lotes-${params.startDate.split('T')[0]}.${format === 'csv' ? 'csv' : 'xlsx'}`,
    }
  } catch (error) {
    console.error('Error exporting batches report:', error)
    return { success: false, error: 'Error al exportar el reporte de lotes' }
  }
}

// ============================================================================
// REPORTE DE CLIENTES DEL NEGOCIO
// ============================================================================

export async function exportCustomersReportAction(
  params: DateRangeParams,
  format: ExportFormat
): Promise<ExportResult> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { data: customers, error } = await supabase
      .from('business_customers')
      .select(
        'id, full_name, nit, emails, phone, status, notes, created_at, updated_at'
      )
      .eq('business_id', params.businessId)
      .order('created_at', { ascending: false })

    if (error) throw error

    const metrics = await fetchCustomerMetricsAction(params)

    const statusMap: Record<string, string> = {
      active: 'Activo',
      inactive: 'Inactivo',
      vip: 'VIP',
      blocked: 'Bloqueado',
    }

    const headers = [
      'Nombre',
      'NIT',
      'Email',
      'Teléfono',
      'Estado',
      'Notas',
      'Fecha Registro',
    ]
    const rows = (customers || []).map((c: any) => [
      c.full_name || 'N/A',
      c.nit || 'N/A',
      c.emails?.[0] || 'N/A',
      c.phone || 'N/A',
      statusMap[c.status] || c.status,
      c.notes || '',
      c.created_at ? c.created_at.split('T')[0] : 'N/A',
    ])

    // Agregar resumen
    rows.unshift(['', '', '', '', '', '', ''])
    rows.unshift(['--- LISTADO DE CLIENTES ---', '', '', '', '', '', ''])
    rows.unshift(['', '', '', '', '', '', ''])
    rows.unshift(['Bloqueados', metrics.blocked, '', '', '', '', ''])
    rows.unshift(['VIP', metrics.vip, '', '', '', '', ''])
    rows.unshift(['Inactivos', metrics.inactive, '', '', '', '', ''])
    rows.unshift(['Activos', metrics.active, '', '', '', '', ''])
    rows.unshift(['Nuevos (período)', metrics.new_this_period, '', '', '', '', ''])
    rows.unshift(['Total Clientes', metrics.total_customers, '', '', '', '', ''])
    rows.unshift(['--- RESUMEN ---', '', '', '', '', '', ''])

    const data =
      format === 'csv'
        ? arrayToCSV(headers, rows)
        : arrayToExcel(headers, rows)

    return {
      success: true,
      data,
      filename: `reporte-clientes-${params.startDate.split('T')[0]}.${format === 'csv' ? 'csv' : 'xlsx'}`,
    }
  } catch (error) {
    console.error('Error exporting customers report:', error)
    return { success: false, error: 'Error al exportar el reporte de clientes' }
  }
}
