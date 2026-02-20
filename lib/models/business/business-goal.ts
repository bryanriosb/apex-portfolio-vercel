export type GoalType = 'services_completed' | 'revenue' | 'new_clients' | 'hours_worked'
export type GoalPeriod = 'daily' | 'weekly' | 'monthly'

export interface BusinessGoal {
  id: string
  business_id: string
  goal_type: GoalType
  target_value: number
  current_value: number
  period_type: GoalPeriod
  period_start: string
  period_end: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface BusinessGoalInsert {
  business_id: string
  goal_type: GoalType
  target_value: number
  current_value?: number
  period_type: GoalPeriod
  period_start: string
  period_end: string
  is_active?: boolean
}

export interface BusinessGoalUpdate {
  goal_type?: GoalType
  target_value?: number
  current_value?: number
  period_type?: GoalPeriod
  period_start?: string
  period_end?: string
  is_active?: boolean
}

export interface SpecialistContribution {
  specialist_id: string
  specialist_name: string
  profile_picture_url: string | null
  specialty: string | null
  contribution_value: number
  contribution_percentage: number
  services_count?: number
  top_services?: Array<{ name: string; count: number; revenue_cents: number }>
}

export interface BusinessGoalWithContributions extends BusinessGoal {
  contributions: SpecialistContribution[]
  total_specialists: number
}

export const GOAL_TYPE_LABELS: Record<GoalType, string> = {
  services_completed: 'Servicios completados',
  revenue: 'Ingresos',
  new_clients: 'Nuevos clientes',
  hours_worked: 'Horas trabajadas',
}

export const GOAL_TYPE_UNITS: Record<GoalType, string> = {
  services_completed: 'servicios',
  revenue: 'COP',
  new_clients: 'clientes',
  hours_worked: 'horas',
}

export const GOAL_PERIOD_LABELS: Record<GoalPeriod, string> = {
  daily: 'Diario',
  weekly: 'Semanal',
  monthly: 'Mensual',
}

export function calculateGoalProgress(goal: BusinessGoal): number {
  if (goal.target_value === 0) return 0
  return Math.min(100, Math.round((goal.current_value / goal.target_value) * 100))
}

export function getGoalPeriodDates(period: GoalPeriod): { start: Date; end: Date } {
  const now = new Date()
  const start = new Date(now)
  const end = new Date(now)

  switch (period) {
    case 'daily':
      start.setHours(0, 0, 0, 0)
      end.setHours(23, 59, 59, 999)
      break
    case 'weekly':
      const dayOfWeek = now.getDay()
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
      start.setDate(now.getDate() + mondayOffset)
      start.setHours(0, 0, 0, 0)
      end.setDate(start.getDate() + 6)
      end.setHours(23, 59, 59, 999)
      break
    case 'monthly':
      start.setDate(1)
      start.setHours(0, 0, 0, 0)
      end.setMonth(end.getMonth() + 1, 0)
      end.setHours(23, 59, 59, 999)
      break
  }

  return { start, end }
}

export function formatGoalValue(value: number, goalType: GoalType): string {
  if (goalType === 'revenue') {
    return `$${value.toLocaleString('es-CO')}`
  }
  return value.toLocaleString('es-CO')
}
