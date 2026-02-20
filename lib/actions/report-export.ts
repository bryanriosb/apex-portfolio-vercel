'use server'

import {
  fetchRevenueTrendAction,
  fetchTopServicesAction,
  fetchSpecialistStatsAction,
  fetchCustomerStatsAction,
  fetchHourlyDistributionAction,
  fetchDailyDistributionAction,
  fetchRevenueStatsAction,
  type DateRangeParams,
} from './reports'
import { getSupabaseAdminClient } from './supabase'
import * as XLSX from 'xlsx'

export type ExportFormat = 'csv' | 'excel'
export type ReportType = 'revenue' | 'appointments' | 'services' | 'specialists' | 'customers'

interface ExportResult {
  success: boolean
  data?: any
  filename?: string
  error?: string
}

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
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
  const dataLines = rows.map(row => row.map(escapeCSV).join(','))
  return BOM + [headerLine, ...dataLines].join('\n')
}

function arrayToExcel(headers: string[], rows: (string | number)[][]): any {
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows])
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Reporte')
  
  return XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' })
}

export async function exportRevenueReportAction(
  params: DateRangeParams,
  format: ExportFormat
): Promise<ExportResult> {
  try {
    const [stats, trend] = await Promise.all([
      fetchRevenueStatsAction(params),
      fetchRevenueTrendAction(params),
    ])

    const headers = ['Fecha', 'Ingresos (COP)', 'Citas Completadas']
    const rows = trend.map(t => [
      t.date,
      formatCurrency(t.revenue),
      t.appointments,
    ])

    rows.unshift(['--- RESUMEN ---', '', ''])
    rows.unshift(['Ingresos Totales', formatCurrency(stats.total_revenue), ''])
    rows.unshift(['Ticket Promedio', formatCurrency(stats.average_ticket), ''])
    rows.unshift(['Total Citas', stats.total_appointments, ''])
    rows.unshift(['Completadas', stats.completed_appointments, ''])
    rows.unshift(['Canceladas', stats.cancelled_appointments, ''])
    rows.unshift(['No Show', stats.no_show_appointments, ''])
    rows.unshift(['', '', ''])
    rows.unshift(['--- TENDENCIA DIARIA ---', '', ''])

    const data = format === 'csv'
      ? arrayToCSV(headers, rows)
      : arrayToExcel(headers, rows)

    return {
      success: true,
      data,
      filename: `reporte-ingresos-${params.start_date.split('T')[0]}.${format === 'csv' ? 'csv' : 'xlsx'}`,
    }
  } catch (error) {
    console.error('Error exporting revenue report:', error)
    return { success: false, error: 'Error al exportar el reporte' }
  }
}

export async function exportAppointmentsReportAction(
  params: DateRangeParams,
  format: ExportFormat
): Promise<ExportResult> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { data: appointments } = await supabase
      .from('appointments')
      .select(`
        id,
        start_time,
        end_time,
        status,
        total_price_cents,
        specialist:specialists(first_name, last_name),
        appointment_services(
          service:services(name)
        )
      `)
      .eq('business_id', params.business_id)
      .gte('start_time', params.start_date)
      .lte('start_time', params.end_date)
      .order('start_time', { ascending: true })

    const [hourly, daily] = await Promise.all([
      fetchHourlyDistributionAction(params),
      fetchDailyDistributionAction(params),
    ])

    const statusMap: Record<string, string> = {
      PENDING: 'Pendiente',
      CONFIRMED: 'Confirmada',
      COMPLETED: 'Completada',
      CANCELLED: 'Cancelada',
      NO_SHOW: 'No Presentado',
    }

    const headers = ['Fecha', 'Hora Inicio', 'Hora Fin', 'Estado', 'Especialista', 'Servicios', 'Total (COP)']
    const rows = (appointments || []).map((apt: any) => [
      apt.start_time.split('T')[0],
      apt.start_time.split('T')[1]?.substring(0, 5) || '',
      apt.end_time.split('T')[1]?.substring(0, 5) || '',
      statusMap[apt.status] || apt.status,
      `${apt.specialist?.first_name || ''} ${apt.specialist?.last_name || ''}`.trim(),
      apt.appointment_services?.map((as: any) => as.service?.name).filter(Boolean).join(', ') || '',
      formatCurrency(apt.total_price_cents || 0),
    ])

    rows.push(['', '', '', '', '', '', ''])
    rows.push(['--- DISTRIBUCIÓN POR HORA ---', '', '', '', '', '', ''])
    hourly.forEach(h => {
      rows.push([`${h.hour}:00`, h.count.toString(), '', '', '', '', ''])
    })

    rows.push(['', '', '', '', '', '', ''])
    rows.push(['--- DISTRIBUCIÓN POR DÍA ---', '', '', '', '', '', ''])
    daily.forEach(d => {
      rows.push([d.day_name, d.count.toString(), '', '', '', '', ''])
    })

    const data = format === 'csv'
      ? arrayToCSV(headers, rows)
      : arrayToExcel(headers, rows)

    return {
      success: true,
      data,
      filename: `reporte-citas-${params.start_date.split('T')[0]}.${format === 'csv' ? 'csv' : 'xlsx'}`,
    }
  } catch (error) {
    console.error('Error exporting appointments report:', error)
    return { success: false, error: 'Error al exportar el reporte' }
  }
}

export async function exportServicesReportAction(
  params: DateRangeParams,
  format: ExportFormat
): Promise<ExportResult> {
  try {
    const services = await fetchTopServicesAction(params, 100)

    const headers = ['#', 'Servicio', 'Categoría', 'Veces Realizado', 'Ingresos (COP)']
    const rows = services.map((s, i) => [
      i + 1,
      s.service_name,
      s.category_name,
      s.total_bookings,
      formatCurrency(s.total_revenue),
    ])

    const totalBookings = services.reduce((sum, s) => sum + s.total_bookings, 0)
    const totalRevenue = services.reduce((sum, s) => sum + s.total_revenue, 0)

    rows.push(['', '', '', '', ''])
    rows.push(['', 'TOTAL', '', totalBookings, formatCurrency(totalRevenue)])

    const data = format === 'csv'
      ? arrayToCSV(headers, rows)
      : arrayToExcel(headers, rows)

    return {
      success: true,
      data,
      filename: `reporte-servicios-${params.start_date.split('T')[0]}.${format === 'csv' ? 'csv' : 'xlsx'}`,
    }
  } catch (error) {
    console.error('Error exporting services report:', error)
    return { success: false, error: 'Error al exportar el reporte' }
  }
}

export async function exportSpecialistsReportAction(
  params: DateRangeParams,
  format: ExportFormat
): Promise<ExportResult> {
  try {
    const specialists = await fetchSpecialistStatsAction(params)

    const headers = ['Especialista', 'Total Citas', 'Completadas', 'Tasa Cancelación (%)', 'Ingresos (COP)']
    const rows = specialists.map(s => [
      `${s.first_name} ${s.last_name || ''}`.trim(),
      s.total_appointments,
      s.completed_appointments,
      s.cancellation_rate.toFixed(1),
      formatCurrency(s.total_revenue),
    ])

    const totalAppointments = specialists.reduce((sum, s) => sum + s.total_appointments, 0)
    const totalCompleted = specialists.reduce((sum, s) => sum + s.completed_appointments, 0)
    const totalRevenue = specialists.reduce((sum, s) => sum + s.total_revenue, 0)

    rows.push(['', '', '', '', ''])
    rows.push(['TOTAL', totalAppointments, totalCompleted, '', formatCurrency(totalRevenue)])

    const data = format === 'csv'
      ? arrayToCSV(headers, rows)
      : arrayToExcel(headers, rows)

    return {
      success: true,
      data,
      filename: `reporte-especialistas-${params.start_date.split('T')[0]}.${format === 'csv' ? 'csv' : 'xlsx'}`,
    }
  } catch (error) {
    console.error('Error exporting specialists report:', error)
    return { success: false, error: 'Error al exportar el reporte' }
  }
}

export async function exportCustomersReportAction(
  params: DateRangeParams,
  format: ExportFormat
): Promise<ExportResult> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { data: customers } = await supabase
      .from('business_customers')
      .select('id, first_name, last_name, email, phone, total_visits, total_spent_cents, created_at, status')
      .eq('business_id', params.business_id)
      .order('total_spent_cents', { ascending: false })

    const stats = await fetchCustomerStatsAction(params)

    const statusMap: Record<string, string> = {
      active: 'Activo',
      inactive: 'Inactivo',
      vip: 'VIP',
      blocked: 'Bloqueado',
    }

    const headers = ['Nombre', 'Email', 'Teléfono', 'Estado', 'Visitas', 'Total Gastado (COP)', 'Fecha Registro']
    const rows = (customers || []).map((c: any) => [
      `${c.first_name} ${c.last_name || ''}`.trim(),
      c.email || '',
      c.phone || '',
      statusMap[c.status] || c.status,
      c.total_visits,
      formatCurrency(c.total_spent_cents),
      c.created_at.split('T')[0],
    ])

    rows.unshift(['--- RESUMEN ---', '', '', '', '', '', ''])
    rows.unshift(['Total Clientes', stats.total_customers, '', '', '', '', ''])
    rows.unshift(['Nuevos (período)', stats.new_customers, '', '', '', '', ''])
    rows.unshift(['Recurrentes', stats.returning_customers, '', '', '', '', ''])
    rows.unshift(['', '', '', '', '', '', ''])
    rows.unshift(['--- DETALLE DE CLIENTES ---', '', '', '', '', '', ''])

    const data = format === 'csv'
      ? arrayToCSV(headers, rows)
      : arrayToExcel(headers, rows)

    return {
      success: true,
      data,
      filename: `reporte-clientes-${params.start_date.split('T')[0]}.${format === 'csv' ? 'csv' : 'xlsx'}`,
    }
  } catch (error) {
    console.error('Error exporting customers report:', error)
    return { success: false, error: 'Error al exportar el reporte' }
  }
}
