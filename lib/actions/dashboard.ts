'use server'

import { getSupabaseAdminClient } from '@/lib/actions/supabase'
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  subDays,
  subWeeks,
  addHours,
} from 'date-fns'

export interface TodayStats {
  total_appointments: number
  completed_appointments: number
  pending_appointments: number
  confirmed_appointments: number
  cancelled_appointments: number
  expected_revenue: number
  realized_revenue: number
  occupancy_rate: number
}

export interface ComparisonStats {
  today_revenue: number
  yesterday_revenue: number
  revenue_change: number
  today_appointments: number
  yesterday_appointments: number
  appointments_change: number
  this_week_revenue: number
  last_week_revenue: number
  week_revenue_change: number
}

export interface UpcomingAppointment {
  id: string
  start_time: string
  end_time: string
  status: string
  total_price_cents: number
  specialist: {
    id: string
    first_name: string
    last_name: string | null
    profile_picture_url: string | null
  }
  customer_name: string
  customer_email: string | null
  services: { name: string }[]
}

export interface PendingAction {
  type: 'unconfirmed' | 'no_show_followup' | 'vip_today'
  count: number
  items: {
    id: string
    title: string
    subtitle: string
    time?: string
  }[]
}

export interface SpecialistTodayStatus {
  id: string
  first_name: string
  last_name: string | null
  profile_picture_url: string | null
  total_appointments: number
  completed_appointments: number
  next_appointment_time: string | null
  expected_revenue: number
}

export async function fetchTodayStatsAction(
  businessId: string
): Promise<TodayStats> {
  const supabase = await getSupabaseAdminClient()
  const now = new Date()
  const dayStart = startOfDay(now).toISOString()
  const dayEnd = endOfDay(now).toISOString()

  const { data: appointments, error } = await supabase
    .from('appointments')
    .select('status, total_price_cents')
    .eq('business_id', businessId)
    .gte('start_time', dayStart)
    .lte('start_time', dayEnd)

  if (error) {
    console.error('Error fetching today stats:', error)
    return {
      total_appointments: 0,
      completed_appointments: 0,
      pending_appointments: 0,
      confirmed_appointments: 0,
      cancelled_appointments: 0,
      expected_revenue: 0,
      realized_revenue: 0,
      occupancy_rate: 0,
    }
  }

  const total = appointments?.length || 0
  const completed = appointments?.filter((a) => a.status === 'COMPLETED') || []
  const pending = appointments?.filter((a) => a.status === 'PENDING') || []
  const confirmed = appointments?.filter((a) => a.status === 'CONFIRMED') || []
  const cancelled = appointments?.filter((a) => a.status === 'CANCELLED' || a.status === 'NO_SHOW') || []

  const realizedRevenue = completed.reduce((sum, a) => sum + (a.total_price_cents || 0), 0)
  const expectedRevenue = [...completed, ...confirmed, ...pending].reduce(
    (sum, a) => sum + (a.total_price_cents || 0),
    0
  )

  const activeAppointments = total - cancelled.length
  const occupancyRate = total > 0 ? (activeAppointments / total) * 100 : 0

  return {
    total_appointments: total,
    completed_appointments: completed.length,
    pending_appointments: pending.length,
    confirmed_appointments: confirmed.length,
    cancelled_appointments: cancelled.length,
    expected_revenue: expectedRevenue,
    realized_revenue: realizedRevenue,
    occupancy_rate: occupancyRate,
  }
}

export async function fetchComparisonStatsAction(
  businessId: string
): Promise<ComparisonStats> {
  const supabase = await getSupabaseAdminClient()
  const now = new Date()

  const todayStart = startOfDay(now).toISOString()
  const todayEnd = endOfDay(now).toISOString()
  const yesterdayStart = startOfDay(subDays(now, 1)).toISOString()
  const yesterdayEnd = endOfDay(subDays(now, 1)).toISOString()
  const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString()
  const thisWeekEnd = endOfWeek(now, { weekStartsOn: 1 }).toISOString()
  const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }).toISOString()
  const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }).toISOString()

  const { data: allAppointments, error } = await supabase
    .from('appointments')
    .select('start_time, status, total_price_cents')
    .eq('business_id', businessId)
    .eq('status', 'COMPLETED')
    .gte('start_time', lastWeekStart)
    .lte('start_time', thisWeekEnd)

  if (error) {
    console.error('Error fetching comparison stats:', error)
    return {
      today_revenue: 0,
      yesterday_revenue: 0,
      revenue_change: 0,
      today_appointments: 0,
      yesterday_appointments: 0,
      appointments_change: 0,
      this_week_revenue: 0,
      last_week_revenue: 0,
      week_revenue_change: 0,
    }
  }

  const filterByRange = (start: string, end: string) =>
    allAppointments?.filter(
      (a) => a.start_time >= start && a.start_time <= end
    ) || []

  const todayAppts = filterByRange(todayStart, todayEnd)
  const yesterdayAppts = filterByRange(yesterdayStart, yesterdayEnd)
  const thisWeekAppts = filterByRange(thisWeekStart, thisWeekEnd)
  const lastWeekAppts = filterByRange(lastWeekStart, lastWeekEnd)

  const sumRevenue = (appts: typeof allAppointments) =>
    appts?.reduce((sum, a) => sum + (a.total_price_cents || 0), 0) || 0

  const todayRevenue = sumRevenue(todayAppts)
  const yesterdayRevenue = sumRevenue(yesterdayAppts)
  const thisWeekRevenue = sumRevenue(thisWeekAppts)
  const lastWeekRevenue = sumRevenue(lastWeekAppts)

  const calcChange = (current: number, previous: number) =>
    previous > 0 ? ((current - previous) / previous) * 100 : current > 0 ? 100 : 0

  return {
    today_revenue: todayRevenue,
    yesterday_revenue: yesterdayRevenue,
    revenue_change: calcChange(todayRevenue, yesterdayRevenue),
    today_appointments: todayAppts.length,
    yesterday_appointments: yesterdayAppts.length,
    appointments_change: calcChange(todayAppts.length, yesterdayAppts.length),
    this_week_revenue: thisWeekRevenue,
    last_week_revenue: lastWeekRevenue,
    week_revenue_change: calcChange(thisWeekRevenue, lastWeekRevenue),
  }
}

export async function fetchUpcomingAppointmentsAction(
  businessId: string,
  limit = 8
): Promise<UpcomingAppointment[]> {
  const supabase = await getSupabaseAdminClient()
  const now = new Date()
  const dayEnd = endOfDay(now).toISOString()

  const { data: appointments, error } = await supabase
    .from('appointments')
    .select(`
      id,
      start_time,
      end_time,
      status,
      total_price_cents,
      specialist:specialists(
        id,
        first_name,
        last_name,
        profile_picture_url
      ),
      user_profile:users_profile!appointments_users_profile_id_fkey(
        id,
        user_id
      ),
      appointment_services(
        service:services(name)
      )
    `)
    .eq('business_id', businessId)
    .in('status', ['PENDING', 'CONFIRMED'])
    .gte('start_time', now.toISOString())
    .lte('start_time', dayEnd)
    .order('start_time', { ascending: true })
    .limit(limit)

  if (error) {
    console.error('Error fetching upcoming appointments:', error)
    return []
  }

  const results: UpcomingAppointment[] = []

  for (const apt of appointments || []) {
    let customerName = 'Cliente'
    let customerEmail: string | null = null

    const userProfile = apt.user_profile as unknown as { id: string; user_id: string } | null
    if (userProfile?.user_id) {
      const { data: authUser } = await supabase.auth.admin.getUserById(
        userProfile.user_id
      )
      if (authUser?.user) {
        customerName = authUser.user.user_metadata?.name || authUser.user.email?.split('@')[0] || 'Cliente'
        customerEmail = authUser.user.email || null
      }
    }

    results.push({
      id: apt.id,
      start_time: apt.start_time,
      end_time: apt.end_time,
      status: apt.status,
      total_price_cents: apt.total_price_cents,
      specialist: apt.specialist as any,
      customer_name: customerName,
      customer_email: customerEmail,
      services: (apt.appointment_services as any[])?.map((as) => ({
        name: as.service?.name || 'Servicio',
      })) || [],
    })
  }

  return results
}

export async function fetchPendingActionsAction(
  businessId: string
): Promise<PendingAction[]> {
  const supabase = await getSupabaseAdminClient()
  const now = new Date()
  const dayStart = startOfDay(now).toISOString()
  const dayEnd = endOfDay(now).toISOString()
  const threeDaysAgo = subDays(now, 3).toISOString()

  const actions: PendingAction[] = []

  // 1. Citas sin confirmar (PENDING) para hoy
  const { data: unconfirmed } = await supabase
    .from('appointments')
    .select(`
      id,
      start_time,
      user_profile:users_profile!appointments_users_profile_id_fkey(user_id)
    `)
    .eq('business_id', businessId)
    .eq('status', 'PENDING')
    .gte('start_time', dayStart)
    .lte('start_time', dayEnd)
    .order('start_time', { ascending: true })
    .limit(5)

  if (unconfirmed && unconfirmed.length > 0) {
    const items = await Promise.all(
      unconfirmed.map(async (apt) => {
        let name = 'Cliente'
        const userProfile = apt.user_profile as unknown as { user_id: string } | null
        if (userProfile?.user_id) {
          const { data: authUser } = await supabase.auth.admin.getUserById(
            userProfile.user_id
          )
          name = authUser?.user?.user_metadata?.name || authUser?.user?.email?.split('@')[0] || 'Cliente'
        }
        return {
          id: apt.id,
          title: name,
          subtitle: 'Pendiente de confirmar',
          time: apt.start_time,
        }
      })
    )

    actions.push({
      type: 'unconfirmed',
      count: unconfirmed.length,
      items,
    })
  }

  // 2. No-shows recientes para seguimiento
  const { data: noShows } = await supabase
    .from('appointments')
    .select(`
      id,
      start_time,
      user_profile:users_profile!appointments_users_profile_id_fkey(user_id)
    `)
    .eq('business_id', businessId)
    .eq('status', 'NO_SHOW')
    .gte('start_time', threeDaysAgo)
    .order('start_time', { ascending: false })
    .limit(5)

  if (noShows && noShows.length > 0) {
    const items = await Promise.all(
      noShows.map(async (apt) => {
        let name = 'Cliente'
        const userProfile = apt.user_profile as unknown as { user_id: string } | null
        if (userProfile?.user_id) {
          const { data: authUser } = await supabase.auth.admin.getUserById(
            userProfile.user_id
          )
          name = authUser?.user?.user_metadata?.name || authUser?.user?.email?.split('@')[0] || 'Cliente'
        }
        return {
          id: apt.id,
          title: name,
          subtitle: 'No se presentó',
          time: apt.start_time,
        }
      })
    )

    actions.push({
      type: 'no_show_followup',
      count: noShows.length,
      items,
    })
  }

  return actions
}

export async function fetchSpecialistsTodayAction(
  businessId: string
): Promise<SpecialistTodayStatus[]> {
  const supabase = await getSupabaseAdminClient()
  const now = new Date()
  const dayStart = startOfDay(now).toISOString()
  const dayEnd = endOfDay(now).toISOString()

  const { data: specialists, error: specError } = await supabase
    .from('specialists')
    .select('id, first_name, last_name, profile_picture_url')
    .eq('business_id', businessId)

  if (specError || !specialists) {
    console.error('Error fetching specialists:', specError)
    return []
  }

  const { data: appointments, error: aptError } = await supabase
    .from('appointments')
    .select('specialist_id, status, total_price_cents, start_time')
    .eq('business_id', businessId)
    .gte('start_time', dayStart)
    .lte('start_time', dayEnd)

  if (aptError) {
    console.error('Error fetching appointments:', aptError)
    return []
  }

  return specialists.map((spec) => {
    const specAppts = appointments?.filter((a) => a.specialist_id === spec.id) || []
    const completed = specAppts.filter((a) => a.status === 'COMPLETED')
    const upcoming = specAppts
      .filter((a) => ['PENDING', 'CONFIRMED'].includes(a.status) && a.start_time > now.toISOString())
      .sort((a, b) => a.start_time.localeCompare(b.start_time))

    const expectedRevenue = specAppts
      .filter((a) => ['COMPLETED', 'CONFIRMED', 'PENDING'].includes(a.status))
      .reduce((sum, a) => sum + (a.total_price_cents || 0), 0)

    return {
      id: spec.id,
      first_name: spec.first_name,
      last_name: spec.last_name,
      profile_picture_url: spec.profile_picture_url,
      total_appointments: specAppts.length,
      completed_appointments: completed.length,
      next_appointment_time: upcoming[0]?.start_time || null,
      expected_revenue: expectedRevenue,
    }
  }).filter((s) => s.total_appointments > 0)
    .sort((a, b) => b.total_appointments - a.total_appointments)
}
