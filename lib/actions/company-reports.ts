'use server'

import { getSupabaseAdminClient } from './supabase'
import { startOfDay, endOfDay, subDays, format } from 'date-fns'

export interface CompanyRevenueStats {
  total_revenue: number
  total_appointments: number
  total_businesses: number
  total_customers: number
  avg_revenue_per_business: number
  growth_percentage: number
  trial_businesses: number
  top_performing_business: {
    name: string
    revenue: number
  }
}

export interface CompanyBusinessPerformance {
  business_id: string
  business_name: string
  revenue: number
  appointments: number
  customers?: number
  occupancy_rate?: number
  growth_percentage?: number
  is_trial?: boolean
  trial_ends_at?: string | null
}

export interface CompanyGeographicStats {
  city: string
  revenue: number
  businesses_count: number
  customers_count: number
  percentage: number
}

export interface CompanyServiceAnalytics {
  service_name: string
  total_appointments: number
  total_revenue: number
  avg_price: number
  popularity_percentage: number
}

export interface CompanyGrowthTrend {
  date: string
  revenue: number
  appointments: number
  new_customers: number
}

export interface CompanyOperationalMetrics {
  avg_occupancy_rate: number
  total_cancelled_appointments: number
  cancellation_rate: number
  avg_appointment_duration: number
  total_specialists: number
  active_specialists_today: number
}

export async function fetchCompanyRevenueStatsAction(
  startDateISO: string,
  endDateISO: string
): Promise<CompanyRevenueStats> {
  const supabase = await getSupabaseAdminClient()
  const startDate = new Date(startDateISO)
  const endDate = new Date(endDateISO)

  const { data: appointments, error } = await supabase
    .from('appointments')
    .select(`
      id,
      total_price_cents,
      business_id,
      status,
      start_time,
      businesses (
        id,
        name,
        business_account_id
      )
    `)
    .eq('status', 'COMPLETED')
    .gte('start_time', startDate.toISOString())
    .lte('start_time', endDate.toISOString())

  if (error || !appointments || appointments.length === 0) {
    return {
      total_revenue: 0,
      total_appointments: 0,
      total_businesses: 0,
      total_customers: 0,
      avg_revenue_per_business: 0,
      growth_percentage: 0,
      trial_businesses: 0,
      top_performing_business: { name: 'Sin datos', revenue: 0 }
    }
  }

  const totalRevenue = appointments.reduce((sum, apt) => sum + (apt.total_price_cents || 0), 0)
  const totalAppointments = appointments.length

  const uniqueBusinesses = new Set(appointments.map(apt => apt.business_id))
  const totalBusinesses = uniqueBusinesses.size

  const avgRevenuePerBusiness = totalBusinesses > 0 ? totalRevenue / totalBusinesses : 0

  const businessRevenue = new Map<string, { name: string; revenue: number }>()
  appointments.forEach(apt => {
    const businessId = apt.business_id
    const revenue = apt.total_price_cents || 0
    const name = (apt.businesses as any)?.name || 'Sin nombre'

    if (businessRevenue.has(businessId)) {
      businessRevenue.get(businessId)!.revenue += revenue
    } else {
      businessRevenue.set(businessId, { name, revenue })
    }
  })

  const topBusiness = Array.from(businessRevenue.values())
    .sort((a, b) => b.revenue - a.revenue)[0] || { name: '', revenue: 0 }

  const periodDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  const previousPeriodStart = subDays(startDate, periodDays)
  const { data: previousAppointments } = await supabase
    .from('appointments')
    .select('total_price_cents')
    .eq('status', 'COMPLETED')
    .gte('start_time', previousPeriodStart.toISOString())
    .lt('start_time', startDate.toISOString())

  const previousRevenue = previousAppointments?.reduce((sum, apt) => sum + (apt.total_price_cents || 0), 0) || 0
  const growthPercentage = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0

  // Obtener business_ids de la compañía para filtrar clientes
  const { data: companyBusinesses } = await supabase
    .from('businesses')
    .select('id')

  const companyBusinessIds = companyBusinesses?.map(b => b.id) || []

  const { count: customersCount } = await supabase
    .from('business_customers')
    .select('id', { count: 'exact', head: true })
    .in('business_id', companyBusinessIds)

  // Contar negocios en estado trial - obtener todos los business accounts de la compañía
  const { data: allBusinessAccounts } = await supabase
    .from('businesses')
    .select('business_account_id')

  const uniqueBusinessAccountIds = [...new Set(allBusinessAccounts?.map(b => b.business_account_id).filter(Boolean) || [])]

  const { count: trialBusinessesCount } = await supabase
    .from('business_accounts')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'trial')
    .in('id', uniqueBusinessAccountIds)

  return {
    total_revenue: totalRevenue,
    total_appointments: totalAppointments,
    total_businesses: totalBusinesses,
    total_customers: customersCount || 0,
    avg_revenue_per_business: avgRevenuePerBusiness,
    growth_percentage: growthPercentage,
    trial_businesses: trialBusinessesCount || 0,
    top_performing_business: topBusiness
  }
}

export async function fetchCompanyBusinessPerformanceAction(
  startDateISO: string,
  endDateISO: string,
  limit: number = 10
): Promise<CompanyBusinessPerformance[]> {
  const supabase = await getSupabaseAdminClient()
  const startDate = new Date(startDateISO)
  const endDate = new Date(endDateISO)

  const { data, error } = await supabase
    .from('appointments')
    .select(`
      total_price_cents,
      business_id,
      businesses (
        id,
        name,
        business_account_id,
        business_accounts (
          status,
          trial_ends_at
        )
      )
    `)
    .eq('status', 'COMPLETED')
    .gte('start_time', startDate.toISOString())
    .lte('start_time', endDate.toISOString())

  if (error || !data) {
    return []
  }

  const businessStats = new Map<string, CompanyBusinessPerformance>()

  data.forEach(apt => {
    const businessId = apt.business_id
    const businessName = (apt.businesses as any)?.name || 'Sin nombre'
    const revenue = apt.total_price_cents || 0
    const businessAccount = (apt.businesses as any)?.business_accounts
    const isTrial = businessAccount?.status === 'trial'
    const trialEndsAt = businessAccount?.trial_ends_at

    if (businessStats.has(businessId)) {
      const stats = businessStats.get(businessId)!
      stats.revenue += revenue
      stats.appointments += 1
    } else {
      businessStats.set(businessId, {
        business_id: businessId,
        business_name: businessName,
        revenue,
        appointments: 1,
        customers: 0,
        occupancy_rate: 0,
        growth_percentage: 0,
        is_trial: isTrial,
        trial_ends_at: trialEndsAt
      })
    }
  })

  const result = Array.from(businessStats.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit)

  for (const business of result) {
    const { count: customersCount } = await supabase
      .from('customers')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', business.business_id)

    business.customers = customersCount || 0
    business.occupancy_rate = 75

    const periodDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    const previousPeriodStart = subDays(startDate, periodDays)
    const { data: previousData } = await supabase
      .from('appointments')
      .select('total_price_cents')
      .eq('business_id', business.business_id)
      .eq('status', 'COMPLETED')
      .gte('start_time', previousPeriodStart.toISOString())
      .lt('start_time', startDate.toISOString())

    const previousRevenue = previousData?.reduce((sum, apt) => sum + (apt.total_price_cents || 0), 0) || 0
    business.growth_percentage = previousRevenue > 0 ? ((business.revenue - previousRevenue) / previousRevenue) * 100 : 0
  }

  return result
}

export async function fetchCompanyGeographicDistributionAction(
  startDateISO: string,
  endDateISO: string
): Promise<CompanyGeographicStats[]> {
  const supabase = await getSupabaseAdminClient()
  const startDate = new Date(startDateISO)
  const endDate = new Date(endDateISO)

  const { data, error } = await supabase
    .from('appointments')
    .select(`
      total_price_cents,
      businesses (
        city,
        business_account_id
      )
    `)
    .eq('status', 'COMPLETED')
    .gte('start_time', startDate.toISOString())
    .lte('start_time', endDate.toISOString())

  if (error || !data) {
    return []
  }

  const cityStats = new Map<string, {
    revenue: number
    businesses: Set<string>
    customers: number
  }>()

  data.forEach(apt => {
    const city = (apt.businesses as any)?.city || 'Sin ciudad'
    const revenue = apt.total_price_cents || 0

    if (cityStats.has(city)) {
      cityStats.get(city)!.revenue += revenue
    } else {
      cityStats.set(city, {
        revenue,
        businesses: new Set(),
        customers: 0
      })
    }
  })

  const totalRevenue = Array.from(cityStats.values()).reduce((sum, stats) => sum + stats.revenue, 0)

  return Array.from(cityStats.entries())
    .map(([city, stats]) => ({
      city,
      revenue: stats.revenue,
      businesses_count: stats.businesses.size,
      customers_count: stats.customers,
      percentage: totalRevenue > 0 ? (stats.revenue / totalRevenue) * 100 : 0
    }))
    .sort((a, b) => b.revenue - a.revenue)
}

export async function fetchCompanyServiceAnalyticsAction(
  startDateISO: string,
  endDateISO: string,
  businessIds?: string[] | string,
  limit: number = 10
): Promise<CompanyServiceAnalytics[]> {
  const supabase = await getSupabaseAdminClient()
  const startDate = new Date(startDateISO)
  const endDate = new Date(endDateISO)

  let query = supabase
    .from('appointment_services')
    .select(`
      price_at_booking_cents,
      appointments!inner (
        start_time,
        status,
        business_id
      ),
      services (
        name
      )
    `)
    .eq('appointments.status', 'COMPLETED')
    .gte('appointments.start_time', startDate.toISOString())
    .lte('appointments.start_time', endDate.toISOString())

  // Filter by business(es) if provided
  if (businessIds) {
    if (Array.isArray(businessIds)) {
      query = query.in('appointments.business_id', businessIds)
    } else {
      query = query.eq('appointments.business_id', businessIds)
    }
  }

  const { data, error } = await query

  if (error || !data) {
    return []
  }

  const serviceStats = new Map<string, {
    total_appointments: number
    total_revenue: number
    prices: number[]
  }>()

  data.forEach(item => {
    const serviceName = (item.services as any)?.name || 'Sin nombre'
    const revenue = item.price_at_booking_cents || 0

    if (serviceStats.has(serviceName)) {
      const stats = serviceStats.get(serviceName)!
      stats.total_appointments += 1
      stats.total_revenue += revenue
      stats.prices.push(revenue)
    } else {
      serviceStats.set(serviceName, {
        total_appointments: 1,
        total_revenue: revenue,
        prices: [revenue]
      })
    }
  })

  const totalAppointments = Array.from(serviceStats.values()).reduce((sum, stats) => sum + stats.total_appointments, 0)

  return Array.from(serviceStats.entries())
    .map(([service_name, stats]) => ({
      service_name,
      total_appointments: stats.total_appointments,
      total_revenue: stats.total_revenue,
      avg_price: stats.prices.length > 0 ? stats.prices.reduce((sum, price) => sum + price, 0) / stats.prices.length : 0,
      popularity_percentage: totalAppointments > 0 ? (stats.total_appointments / totalAppointments) * 100 : 0
    }))
    .sort((a, b) => b.total_appointments - a.total_appointments)
    .slice(0, limit)
}

export async function fetchCompanyGrowthTrendsAction(
  days: number = 30
): Promise<CompanyGrowthTrend[]> {
  const supabase = await getSupabaseAdminClient()
  const endDate = new Date()
  const startDate = subDays(endDate, days)

  const { data: appointments } = await supabase
    .from('appointments')
    .select('total_price_cents, start_time')
    .eq('status', 'COMPLETED')
    .gte('start_time', startDate.toISOString())
    .lte('start_time', endDate.toISOString())

  const { data: customers } = await supabase
    .from('customers')
    .select('created_at')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())

  const trends: CompanyGrowthTrend[] = []

  for (let i = 0; i < days; i++) {
    const currentDate = subDays(endDate, days - i - 1)
    const dayStart = startOfDay(currentDate)
    const dayEnd = endOfDay(currentDate)

    const dayAppointments = appointments?.filter(apt => {
      const aptDate = new Date(apt.start_time)
      return aptDate >= dayStart && aptDate <= dayEnd
    }) || []

    const dayCustomers = customers?.filter(c => {
      const cDate = new Date(c.created_at)
      return cDate >= dayStart && cDate <= dayEnd
    }) || []

    trends.push({
      date: format(currentDate, 'yyyy-MM-dd'),
      revenue: dayAppointments.reduce((sum, apt) => sum + (apt.total_price_cents || 0), 0),
      appointments: dayAppointments.length,
      new_customers: dayCustomers.length
    })
  }

  return trends
}

export async function fetchCompanyOperationalMetricsAction(
  startDateISO: string,
  endDateISO: string
): Promise<CompanyOperationalMetrics> {
  const supabase = await getSupabaseAdminClient()
  const startDate = new Date(startDateISO)
  const endDate = new Date(endDateISO)

  const { data: appointments } = await supabase
    .from('appointments')
    .select('status, duration_minutes')
    .gte('start_time', startDate.toISOString())
    .lte('start_time', endDate.toISOString())

  const totalAppointments = appointments?.length || 0
  const cancelledAppointments = appointments?.filter(apt =>
    apt.status === 'CANCELLED' || apt.status === 'NO_SHOW'
  ).length || 0

  const cancellationRate = totalAppointments > 0 ? (cancelledAppointments / totalAppointments) * 100 : 0

  const validAppointments = appointments?.filter(apt => apt.duration_minutes && apt.duration_minutes > 0) || []
  const avgAppointmentDuration = validAppointments.length > 0
    ? validAppointments.reduce((sum, apt) => sum + (apt.duration_minutes || 0), 0) / validAppointments.length
    : 0

  const { count: specialistsCount } = await supabase
    .from('specialists')
    .select('id', { count: 'exact', head: true })

  const today = new Date()
  const todayStart = startOfDay(today)
  const todayEnd = endOfDay(today)

  const { data: todayAppointments } = await supabase
    .from('appointments')
    .select('specialist_id')
    .gte('start_time', todayStart.toISOString())
    .lte('start_time', todayEnd.toISOString())
    .not('status', 'eq', 'CANCELLED')

  const activeSpecialistsToday = new Set(todayAppointments?.map(apt => apt.specialist_id)).size

  return {
    avg_occupancy_rate: 75,
    total_cancelled_appointments: cancelledAppointments,
    cancellation_rate: cancellationRate,
    avg_appointment_duration: avgAppointmentDuration,
    total_specialists: specialistsCount || 0,
    active_specialists_today: activeSpecialistsToday
  }
}
