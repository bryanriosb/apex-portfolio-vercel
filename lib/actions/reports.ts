'use server'

import { getSupabaseAdminClient } from '@/lib/actions/supabase'

export interface DateRangeParams {
  business_id: string
  start_date: string
  end_date: string
}

export interface RevenueData {
  total_revenue: number
  total_appointments: number
  completed_appointments: number
  cancelled_appointments: number
  no_show_appointments: number
  average_ticket: number
}

export interface RevenueTrendItem {
  date: string
  revenue: number
  appointments: number
}

export interface ServiceStats {
  service_id: string
  service_name: string
  category_name: string
  total_bookings: number
  total_revenue: number
}

export interface SpecialistStats {
  specialist_id: string
  first_name: string
  last_name: string | null
  profile_picture_url: string | null
  total_appointments: number
  completed_appointments: number
  total_revenue: number
  cancellation_rate: number
}

export interface CustomerStats {
  new_customers: number
  returning_customers: number
  total_customers: number
  top_customers: {
    id: string
    first_name: string
    last_name: string | null
    total_visits: number
    total_spent_cents: number
  }[]
}

export interface HourlyDistribution {
  hour: number
  count: number
}

export interface DailyDistribution {
  day: number
  day_name: string
  count: number
}

export async function fetchRevenueStatsAction(
  params: DateRangeParams
): Promise<RevenueData> {
  const supabase = await getSupabaseAdminClient()

  const { data: appointments, error } = await supabase
    .from('appointments')
    .select('status, total_price_cents')
    .eq('business_id', params.business_id)
    .gte('start_time', params.start_date)
    .lte('start_time', params.end_date)

  if (error) {
    console.error('Error fetching revenue stats:', error)
    return {
      total_revenue: 0,
      total_appointments: 0,
      completed_appointments: 0,
      cancelled_appointments: 0,
      no_show_appointments: 0,
      average_ticket: 0,
    }
  }

  const total_appointments = appointments?.length || 0
  const completed = appointments?.filter((a) => a.status === 'COMPLETED') || []
  const cancelled = appointments?.filter((a) => a.status === 'CANCELLED') || []
  const noShow = appointments?.filter((a) => a.status === 'NO_SHOW') || []

  const total_revenue = completed.reduce(
    (sum, a) => sum + (a.total_price_cents || 0),
    0
  )

  return {
    total_revenue,
    total_appointments,
    completed_appointments: completed.length,
    cancelled_appointments: cancelled.length,
    no_show_appointments: noShow.length,
    average_ticket: completed.length > 0 ? total_revenue / completed.length : 0,
  }
}

export async function fetchRevenueTrendAction(
  params: DateRangeParams
): Promise<RevenueTrendItem[]> {
  const supabase = await getSupabaseAdminClient()

  const { data: appointments, error } = await supabase
    .from('appointments')
    .select('start_time, total_price_cents, status')
    .eq('business_id', params.business_id)
    .eq('status', 'COMPLETED')
    .gte('start_time', params.start_date)
    .lte('start_time', params.end_date)
    .order('start_time', { ascending: true })

  if (error) {
    console.error('Error fetching revenue trend:', error)
    return []
  }

  const dailyMap = new Map<string, { revenue: number; appointments: number }>()

  appointments?.forEach((apt) => {
    const date = apt.start_time.split('T')[0]
    const existing = dailyMap.get(date) || { revenue: 0, appointments: 0 }
    dailyMap.set(date, {
      revenue: existing.revenue + (apt.total_price_cents || 0),
      appointments: existing.appointments + 1,
    })
  })

  return Array.from(dailyMap.entries()).map(([date, data]) => ({
    date,
    revenue: data.revenue,
    appointments: data.appointments,
  }))
}

export async function fetchTopServicesAction(
  params: DateRangeParams,
  limit = 10
): Promise<ServiceStats[]> {
  const supabase = await getSupabaseAdminClient()

  const { data: appointmentServices, error } = await supabase
    .from('appointment_services')
    .select(`
      service_id,
      price_at_booking_cents,
      service:services!inner(
        id,
        name,
        business_id,
        service_category:service_categories(name)
      ),
      appointment:appointments!inner(
        id,
        status,
        start_time,
        business_id
      )
    `)
    .eq('appointment.business_id', params.business_id)
    .eq('appointment.status', 'COMPLETED')
    .gte('appointment.start_time', params.start_date)
    .lte('appointment.start_time', params.end_date)

  if (error) {
    console.error('Error fetching top services:', error)
    return []
  }

  const serviceMap = new Map<string, ServiceStats>()

  appointmentServices?.forEach((as: any) => {
    const serviceId = as.service_id
    const existing = serviceMap.get(serviceId)

    if (existing) {
      existing.total_bookings += 1
      existing.total_revenue += as.price_at_booking_cents || 0
    } else {
      serviceMap.set(serviceId, {
        service_id: serviceId,
        service_name: as.service?.name || 'Sin nombre',
        category_name: as.service?.service_category?.name || 'Sin categoría',
        total_bookings: 1,
        total_revenue: as.price_at_booking_cents || 0,
      })
    }
  })

  return Array.from(serviceMap.values())
    .sort((a, b) => b.total_bookings - a.total_bookings)
    .slice(0, limit)
}

export async function fetchSpecialistStatsAction(
  params: DateRangeParams
): Promise<SpecialistStats[]> {
  const supabase = await getSupabaseAdminClient()

  const { data: specialists, error: specialistsError } = await supabase
    .from('specialists')
    .select('id, first_name, last_name, profile_picture_url')
    .eq('business_id', params.business_id)

  if (specialistsError) {
    console.error('Error fetching specialists:', specialistsError)
    return []
  }

  const { data: appointments, error: appointmentsError } = await supabase
    .from('appointments')
    .select('specialist_id, status, total_price_cents')
    .eq('business_id', params.business_id)
    .gte('start_time', params.start_date)
    .lte('start_time', params.end_date)

  if (appointmentsError) {
    console.error('Error fetching appointments:', appointmentsError)
    return []
  }

  const statsMap = new Map<string, {
    total: number
    completed: number
    cancelled: number
    revenue: number
  }>()

  appointments?.forEach((apt) => {
    const existing = statsMap.get(apt.specialist_id) || {
      total: 0,
      completed: 0,
      cancelled: 0,
      revenue: 0,
    }

    existing.total += 1
    if (apt.status === 'COMPLETED') {
      existing.completed += 1
      existing.revenue += apt.total_price_cents || 0
    } else if (apt.status === 'CANCELLED' || apt.status === 'NO_SHOW') {
      existing.cancelled += 1
    }

    statsMap.set(apt.specialist_id, existing)
  })

  return (specialists || []).map((spec) => {
    const stats = statsMap.get(spec.id) || {
      total: 0,
      completed: 0,
      cancelled: 0,
      revenue: 0,
    }

    return {
      specialist_id: spec.id,
      first_name: spec.first_name,
      last_name: spec.last_name,
      profile_picture_url: spec.profile_picture_url,
      total_appointments: stats.total,
      completed_appointments: stats.completed,
      total_revenue: stats.revenue,
      cancellation_rate: stats.total > 0
        ? (stats.cancelled / stats.total) * 100
        : 0,
    }
  }).sort((a, b) => b.total_revenue - a.total_revenue)
}

export async function fetchCustomerStatsAction(
  params: DateRangeParams
): Promise<CustomerStats> {
  const supabase = await getSupabaseAdminClient()

  const { data: customers, error: customersError } = await supabase
    .from('business_customers')
    .select('id, first_name, last_name, total_visits, total_spent_cents, created_at')
    .eq('business_id', params.business_id)

  if (customersError) {
    console.error('Error fetching customers:', customersError)
    return {
      new_customers: 0,
      returning_customers: 0,
      total_customers: 0,
      top_customers: [],
    }
  }

  const startDate = new Date(params.start_date)
  const newCustomers = (customers || []).filter(
    (c) => new Date(c.created_at) >= startDate
  )

  const returningCustomers = (customers || []).filter(
    (c) => c.total_visits > 1 && new Date(c.created_at) < startDate
  )

  const topCustomers = [...(customers || [])]
    .sort((a, b) => b.total_spent_cents - a.total_spent_cents)
    .slice(0, 10)
    .map((c) => ({
      id: c.id,
      first_name: c.first_name,
      last_name: c.last_name,
      total_visits: c.total_visits,
      total_spent_cents: c.total_spent_cents,
    }))

  return {
    new_customers: newCustomers.length,
    returning_customers: returningCustomers.length,
    total_customers: customers?.length || 0,
    top_customers: topCustomers,
  }
}

export async function fetchHourlyDistributionAction(
  params: DateRangeParams
): Promise<HourlyDistribution[]> {
  const supabase = await getSupabaseAdminClient()

  const { data: appointments, error } = await supabase
    .from('appointments')
    .select('start_time')
    .eq('business_id', params.business_id)
    .eq('status', 'COMPLETED')
    .gte('start_time', params.start_date)
    .lte('start_time', params.end_date)

  if (error) {
    console.error('Error fetching hourly distribution:', error)
    return []
  }

  const hourMap = new Map<number, number>()

  appointments?.forEach((apt) => {
    const hour = new Date(apt.start_time).getHours()
    hourMap.set(hour, (hourMap.get(hour) || 0) + 1)
  })

  return Array.from(hourMap.entries())
    .map(([hour, count]) => ({ hour, count }))
    .sort((a, b) => a.hour - b.hour)
}

export async function fetchDailyDistributionAction(
  params: DateRangeParams
): Promise<DailyDistribution[]> {
  const supabase = await getSupabaseAdminClient()
  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

  const { data: appointments, error } = await supabase
    .from('appointments')
    .select('start_time')
    .eq('business_id', params.business_id)
    .eq('status', 'COMPLETED')
    .gte('start_time', params.start_date)
    .lte('start_time', params.end_date)

  if (error) {
    console.error('Error fetching daily distribution:', error)
    return []
  }

  const dayMap = new Map<number, number>()

  appointments?.forEach((apt) => {
    const day = new Date(apt.start_time).getDay()
    dayMap.set(day, (dayMap.get(day) || 0) + 1)
  })

  return [1, 2, 3, 4, 5, 6, 0].map((day) => ({
    day,
    day_name: dayNames[day],
    count: dayMap.get(day) || 0,
  }))
}

export async function fetchRevenueByServiceAction(
  params: DateRangeParams
): Promise<{ name: string; value: number }[]> {
  const services = await fetchTopServicesAction(params, 5)

  return services.map((s) => ({
    name: s.service_name,
    value: s.total_revenue,
  }))
}

export async function fetchRevenueBySpecialistAction(
  params: DateRangeParams
): Promise<{ name: string; value: number }[]> {
  const specialists = await fetchSpecialistStatsAction(params)

  return specialists
    .filter((s) => s.total_revenue > 0)
    .slice(0, 5)
    .map((s) => ({
      name: `${s.first_name} ${s.last_name || ''}`.trim(),
      value: s.total_revenue,
    }))
}

export interface SupplyConsumptionStats {
  product_id: string
  product_name: string
  category_name: string | null
  unit_abbreviation: string
  total_consumed: number
  total_cost_cents: number
  appointment_count: number
}

export interface SupplyConsumptionSummary {
  total_consumption_cost: number
  total_movements: number
  unique_products_consumed: number
  top_consumed: SupplyConsumptionStats[]
}

export async function fetchSupplyConsumptionStatsAction(
  params: DateRangeParams
): Promise<SupplyConsumptionSummary> {
  const supabase = await getSupabaseAdminClient()

  const { data: movements, error } = await supabase
    .from('inventory_movements')
    .select(`
      id,
      product_id,
      quantity,
      unit_cost_cents,
      appointment_id,
      product:products(
        id,
        name,
        category:product_categories(name),
        unit_of_measure:unit_of_measures(abbreviation)
      )
    `)
    .eq('business_id', params.business_id)
    .eq('movement_type', 'CONSUMPTION')
    .gte('created_at', params.start_date)
    .lte('created_at', params.end_date)

  if (error) {
    console.error('Error fetching supply consumption:', error)
    return {
      total_consumption_cost: 0,
      total_movements: 0,
      unique_products_consumed: 0,
      top_consumed: [],
    }
  }

  const productMap = new Map<string, SupplyConsumptionStats>()
  let totalCost = 0
  const appointmentSet = new Set<string>()

  movements?.forEach((mov: any) => {
    const productId = mov.product_id
    const cost = (mov.unit_cost_cents || 0) * mov.quantity
    totalCost += cost

    if (mov.appointment_id) {
      appointmentSet.add(mov.appointment_id)
    }

    const existing = productMap.get(productId)
    if (existing) {
      existing.total_consumed += mov.quantity
      existing.total_cost_cents += cost
      existing.appointment_count += mov.appointment_id ? 1 : 0
    } else {
      productMap.set(productId, {
        product_id: productId,
        product_name: mov.product?.name || 'Producto desconocido',
        category_name: mov.product?.category?.name || null,
        unit_abbreviation: mov.product?.unit_of_measure?.abbreviation || 'und',
        total_consumed: mov.quantity,
        total_cost_cents: cost,
        appointment_count: mov.appointment_id ? 1 : 0,
      })
    }
  })

  const topConsumed = Array.from(productMap.values())
    .sort((a, b) => b.total_cost_cents - a.total_cost_cents)

  return {
    total_consumption_cost: totalCost,
    total_movements: movements?.length || 0,
    unique_products_consumed: productMap.size,
    top_consumed: topConsumed,
  }
}

export interface SupplyConsumptionTrendItem {
  date: string
  consumption_count: number
  total_cost_cents: number
}

export async function fetchSupplyConsumptionTrendAction(
  params: DateRangeParams
): Promise<SupplyConsumptionTrendItem[]> {
  const supabase = await getSupabaseAdminClient()

  const { data: movements, error } = await supabase
    .from('inventory_movements')
    .select('created_at, quantity, unit_cost_cents')
    .eq('business_id', params.business_id)
    .eq('movement_type', 'CONSUMPTION')
    .gte('created_at', params.start_date)
    .lte('created_at', params.end_date)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching consumption trend:', error)
    return []
  }

  const dailyMap = new Map<string, { count: number; cost: number }>()

  movements?.forEach((mov) => {
    const date = mov.created_at.split('T')[0]
    const cost = (mov.unit_cost_cents || 0) * mov.quantity
    const existing = dailyMap.get(date) || { count: 0, cost: 0 }
    dailyMap.set(date, {
      count: existing.count + 1,
      cost: existing.cost + cost,
    })
  })

  return Array.from(dailyMap.entries()).map(([date, data]) => ({
    date,
    consumption_count: data.count,
    total_cost_cents: data.cost,
  }))
}
