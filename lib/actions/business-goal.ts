'use server'

import { getSupabaseAdminClient } from '@/lib/actions/supabase'
import type {
  BusinessGoal,
  BusinessGoalInsert,
  BusinessGoalUpdate,
  BusinessGoalWithContributions,
  SpecialistContribution,
  GoalType,
} from '@/lib/models/business/business-goal'

export async function fetchBusinessGoalsAction(params: {
  business_id: string
  is_active?: boolean
}): Promise<{ success: boolean; data: BusinessGoal[]; error?: string }> {
  try {
    const supabase = await getSupabaseAdminClient()

    let query = supabase
      .from('business_goals')
      .select('*')
      .eq('business_id', params.business_id)
      .order('created_at', { ascending: false })

    if (params.is_active !== undefined) {
      query = query.eq('is_active', params.is_active)
    }

    const { data, error } = await query

    if (error) {
      return { success: false, data: [], error: error.message }
    }

    return { success: true, data: data || [] }
  } catch (error: any) {
    return { success: false, data: [], error: error.message }
  }
}

export async function getActiveBusinessGoalAction(
  businessId: string
): Promise<BusinessGoal | null> {
  try {
    const supabase = await getSupabaseAdminClient()
    const now = new Date().toISOString()

    const { data, error } = await supabase
      .from('business_goals')
      .select('*')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .lte('period_start', now)
      .gte('period_end', now)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching active business goal:', error)
      return null
    }

    return data || null
  } catch (error) {
    console.error('Error fetching active business goal:', error)
    return null
  }
}

export async function createBusinessGoalAction(
  data: BusinessGoalInsert
): Promise<{ success: boolean; data?: BusinessGoal; error?: string }> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { data: goal, error } = await supabase
      .from('business_goals')
      .insert({
        ...data,
        current_value: data.current_value ?? 0,
        is_active: data.is_active ?? true,
      })
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data: goal }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function updateBusinessGoalAction(
  id: string,
  data: BusinessGoalUpdate
): Promise<{ success: boolean; data?: BusinessGoal; error?: string }> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { data: goal, error } = await supabase
      .from('business_goals')
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data: goal }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function deleteBusinessGoalAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { error } = await supabase
      .from('business_goals')
      .delete()
      .eq('id', id)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getBusinessGoalWithContributionsAction(
  goalId: string
): Promise<{ success: boolean; data?: BusinessGoalWithContributions; error?: string }> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { data: goal, error: goalError } = await supabase
      .from('business_goals')
      .select('*')
      .eq('id', goalId)
      .single()

    if (goalError || !goal) {
      return { success: false, error: goalError?.message || 'Meta no encontrada' }
    }

    const contributions = await calculateContributions(
      supabase,
      goal.business_id,
      goal.goal_type,
      goal.period_start,
      goal.period_end
    )

    return {
      success: true,
      data: {
        ...goal,
        contributions,
        total_specialists: contributions.length,
      },
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function recalculateBusinessGoalProgressAction(
  goalId: string
): Promise<{ success: boolean; data?: BusinessGoal; error?: string }> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { data: goal, error: goalError } = await supabase
      .from('business_goals')
      .select('*')
      .eq('id', goalId)
      .single()

    if (goalError || !goal) {
      return { success: false, error: goalError?.message || 'Meta no encontrada' }
    }

    const currentValue = await calculateGoalCurrentValue(
      supabase,
      goal.business_id,
      goal.goal_type,
      goal.period_start,
      goal.period_end
    )

    const { data: updatedGoal, error: updateError } = await supabase
      .from('business_goals')
      .update({ current_value: currentValue })
      .eq('id', goalId)
      .select()
      .single()

    if (updateError) {
      return { success: false, error: updateError.message }
    }

    return { success: true, data: updatedGoal }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

async function calculateGoalCurrentValue(
  supabase: any,
  businessId: string,
  goalType: GoalType,
  periodStart: string,
  periodEnd: string
): Promise<number> {
  switch (goalType) {
    case 'services_completed': {
      const { count } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', businessId)
        .eq('status', 'COMPLETED')
        .gte('start_time', periodStart)
        .lte('start_time', periodEnd)

      return count || 0
    }

    case 'revenue': {
      const { data } = await supabase
        .from('appointments')
        .select('total_price_cents')
        .eq('business_id', businessId)
        .eq('status', 'COMPLETED')
        .eq('payment_status', 'PAID')
        .gte('start_time', periodStart)
        .lte('start_time', periodEnd)

      const totalRevenue = (data || []).reduce(
        (sum: number, apt: any) => sum + (apt.total_price_cents || 0),
        0
      )
      return Math.round(totalRevenue / 100)
    }

    case 'new_clients': {
      const { count } = await supabase
        .from('appointments')
        .select('users_profile_id', { count: 'exact', head: true })
        .eq('business_id', businessId)
        .gte('created_at', periodStart)
        .lte('created_at', periodEnd)

      return count || 0
    }

    case 'hours_worked': {
      const { data } = await supabase
        .from('appointments')
        .select('start_time, end_time')
        .eq('business_id', businessId)
        .eq('status', 'COMPLETED')
        .gte('start_time', periodStart)
        .lte('start_time', periodEnd)

      const totalMinutes = (data || []).reduce((sum: number, apt: any) => {
        const start = new Date(apt.start_time)
        const end = new Date(apt.end_time)
        return sum + (end.getTime() - start.getTime()) / 60000
      }, 0)

      return Math.round(totalMinutes / 60)
    }

    default:
      return 0
  }
}

async function calculateContributions(
  supabase: any,
  businessId: string,
  goalType: GoalType,
  periodStart: string,
  periodEnd: string
): Promise<SpecialistContribution[]> {
  const { data: specialists } = await supabase
    .from('specialists')
    .select('id, first_name, last_name, profile_picture_url, specialty')
    .eq('business_id', businessId)
    .eq('is_active', true)

  if (!specialists || specialists.length === 0) {
    return []
  }

  const contributions: SpecialistContribution[] = []
  let totalValue = 0

  for (const specialist of specialists) {
    let contributionValue = 0
    let servicesCount = 0
    const topServices: Array<{ name: string; count: number; revenue_cents: number }> = []

    switch (goalType) {
      case 'services_completed': {
        const { data: appointments } = await supabase
          .from('appointments')
          .select(`
            id,
            appointment_services(
              service:services(name)
            )
          `)
          .eq('business_id', businessId)
          .eq('specialist_id', specialist.id)
          .eq('status', 'COMPLETED')
          .gte('start_time', periodStart)
          .lte('start_time', periodEnd)

        contributionValue = appointments?.length || 0
        servicesCount = contributionValue

        const serviceCountMap = new Map<string, number>()
        appointments?.forEach((apt: any) => {
          apt.appointment_services?.forEach((as: any) => {
            const serviceName = as.service?.name || 'Servicio'
            serviceCountMap.set(serviceName, (serviceCountMap.get(serviceName) || 0) + 1)
          })
        })

        Array.from(serviceCountMap.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .forEach(([name, count]) => {
            topServices.push({ name, count, revenue_cents: 0 })
          })
        break
      }

      case 'revenue': {
        const { data: appointments } = await supabase
          .from('appointments')
          .select(`
            total_price_cents,
            appointment_services(
              price_at_booking_cents,
              service:services(name)
            )
          `)
          .eq('business_id', businessId)
          .eq('specialist_id', specialist.id)
          .eq('status', 'COMPLETED')
          .eq('payment_status', 'PAID')
          .gte('start_time', periodStart)
          .lte('start_time', periodEnd)

        const totalRevenue = (appointments || []).reduce(
          (sum: number, apt: any) => sum + (apt.total_price_cents || 0),
          0
        )
        contributionValue = Math.round(totalRevenue / 100)
        servicesCount = appointments?.length || 0

        const serviceRevenueMap = new Map<string, { count: number; revenue: number }>()
        appointments?.forEach((apt: any) => {
          apt.appointment_services?.forEach((as: any) => {
            const serviceName = as.service?.name || 'Servicio'
            const existing = serviceRevenueMap.get(serviceName) || { count: 0, revenue: 0 }
            serviceRevenueMap.set(serviceName, {
              count: existing.count + 1,
              revenue: existing.revenue + (as.price_at_booking_cents || 0),
            })
          })
        })

        Array.from(serviceRevenueMap.entries())
          .sort((a, b) => b[1].revenue - a[1].revenue)
          .slice(0, 3)
          .forEach(([name, data]) => {
            topServices.push({ name, count: data.count, revenue_cents: data.revenue })
          })
        break
      }

      case 'hours_worked': {
        const { data: appointments } = await supabase
          .from('appointments')
          .select('start_time, end_time')
          .eq('business_id', businessId)
          .eq('specialist_id', specialist.id)
          .eq('status', 'COMPLETED')
          .gte('start_time', periodStart)
          .lte('start_time', periodEnd)

        const totalMinutes = (appointments || []).reduce((sum: number, apt: any) => {
          const start = new Date(apt.start_time)
          const end = new Date(apt.end_time)
          return sum + (end.getTime() - start.getTime()) / 60000
        }, 0)

        contributionValue = Math.round(totalMinutes / 60)
        servicesCount = appointments?.length || 0
        break
      }

      case 'new_clients': {
        const { count } = await supabase
          .from('appointments')
          .select('users_profile_id', { count: 'exact', head: true })
          .eq('business_id', businessId)
          .eq('specialist_id', specialist.id)
          .gte('created_at', periodStart)
          .lte('created_at', periodEnd)

        contributionValue = count || 0
        servicesCount = contributionValue
        break
      }
    }

    totalValue += contributionValue

    contributions.push({
      specialist_id: specialist.id,
      specialist_name: `${specialist.first_name} ${specialist.last_name || ''}`.trim(),
      profile_picture_url: specialist.profile_picture_url,
      specialty: specialist.specialty,
      contribution_value: contributionValue,
      contribution_percentage: 0,
      services_count: servicesCount,
      top_services: topServices,
    })
  }

  contributions.forEach((c) => {
    c.contribution_percentage = totalValue > 0
      ? Math.round((c.contribution_value / totalValue) * 100)
      : 0
  })

  contributions.sort((a, b) => b.contribution_value - a.contribution_value)

  return contributions
}
