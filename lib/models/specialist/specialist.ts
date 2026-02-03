import type { DayOfWeek } from '@/lib/types/enums'

export interface Specialist {
  id: string
  business_id: string | null
  user_profile_id: string | null
  first_name: string
  last_name: string | null
  email: string | null
  username: string | null
  phone?: string | null
  specialty: string | null
  profile_picture_url: string | null
  bio: string | null
  is_featured: boolean
  avg_rating: number
  review_count: number
  trending_score: number
  created_at: string
  updated_at: string
}

export function getSpecialistFullName(specialist: Specialist): string {
  return `${specialist.first_name} ${specialist.last_name || ''}`.trim()
}

export interface SpecialistInsert {
  business_id?: string | null
  user_profile_id?: string | null
  first_name: string
  last_name?: string | null
  email?: string | null
  username?: string | null
  phone?: string | null
  specialty?: string | null
  profile_picture_url?: string | null
  bio?: string | null
  is_featured?: boolean
}

export interface SpecialistUpdate {
  business_id?: string | null
  user_profile_id?: string | null
  first_name?: string
  last_name?: string | null
  email?: string | null
  username?: string | null
  phone?: string | null
  specialty?: string | null
  profile_picture_url?: string | null
  bio?: string | null
  is_featured?: boolean
  avg_rating?: number
  review_count?: number
  trending_score?: number
}

export interface SpecialistAvailability {
  id: string
  specialist_id: string
  day_of_week: DayOfWeek
  start_time: string
  end_time: string
  is_available: boolean
}

export interface SpecialistTimeOff {
  id: string
  specialist_id: string
  start_time: string
  end_time: string
  reason: string | null
}

export type SpecialistWithAvailability = Specialist & {
  availability?: SpecialistAvailability[]
  time_off?: SpecialistTimeOff[]
}
