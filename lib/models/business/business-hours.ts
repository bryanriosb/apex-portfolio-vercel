import type { DayOfWeek } from '@/lib/types/enums'

export interface BusinessHours {
  id: string
  business_id: string
  day: DayOfWeek
  shift_number: number
  open_time: string | null
  close_time: string | null
  is_closed: boolean
  created_at: string
  updated_at: string
}

export interface BusinessHoursInsert {
  business_id: string
  day: DayOfWeek
  shift_number?: number
  open_time?: string | null
  close_time?: string | null
  is_closed?: boolean
}

export interface BusinessHoursUpdate {
  open_time?: string | null
  close_time?: string | null
  is_closed?: boolean
  shift_number?: number
}

export interface BusinessSpecialHours {
  id: string
  business_id: string
  special_date: string
  reason: string | null
  shift_number: number
  open_time: string | null
  close_time: string | null
  is_closed: boolean
  created_at: string
  updated_at: string
}

export interface BusinessSpecialHoursInsert {
  business_id: string
  special_date: string
  reason?: string | null
  shift_number?: number
  open_time?: string | null
  close_time?: string | null
  is_closed?: boolean
}

export interface BusinessSpecialHoursUpdate {
  special_date?: string
  reason?: string | null
  shift_number?: number
  open_time?: string | null
  close_time?: string | null
  is_closed?: boolean
}
