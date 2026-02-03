import type { UserRole } from '@/const/roles'

export type UserGender = 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY'

export interface UsersProfile {
  id: string
  user_id: string
  role: UserRole
  profile_picture_url: string | null
  date_of_birth: string | null
  gender: UserGender | null
  language_preference: string
  country: string | null
  state: string | null
  city: string | null
  identification_type: string | null
  identification_number: string | null
  prefers_newsletter_email: boolean
  prefers_promo_push: boolean
  prefers_promo_sms: boolean
  prefers_account_updates_email: boolean
  fcm_token: string | null
  created_at: string
}

export class UsersProfile implements UsersProfile {
  id: string
  user_id: string
  role: UserRole
  profile_picture_url: string | null
  date_of_birth: string | null
  gender: UserGender | null
  language_preference: string
  country: string | null
  state: string | null
  city: string | null
  identification_type: string | null
  identification_number: string | null
  prefers_newsletter_email: boolean
  prefers_promo_push: boolean
  prefers_promo_sms: boolean
  prefers_account_updates_email: boolean
  fcm_token: string | null
  created_at: string

  constructor(data: UsersProfile) {
    this.id = data.id
    this.user_id = data.user_id
    this.role = data.role
    this.profile_picture_url = data.profile_picture_url
    this.date_of_birth = data.date_of_birth
    this.gender = data.gender
    this.language_preference = data.language_preference
    this.country = data.country
    this.state = data.state
    this.city = data.city
    this.identification_type = data.identification_type
    this.identification_number = data.identification_number
    this.prefers_newsletter_email = data.prefers_newsletter_email
    this.prefers_promo_push = data.prefers_promo_push
    this.prefers_promo_sms = data.prefers_promo_sms
    this.prefers_account_updates_email = data.prefers_account_updates_email
    this.fcm_token = data.fcm_token
    this.created_at = data.created_at
  }

  get age(): number | null {
    if (!this.date_of_birth) return null
    const today = new Date()
    const birth = new Date(this.date_of_birth)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age
  }

  get fullLocation(): string | null {
    const parts = [this.city, this.state, this.country].filter(Boolean)
    return parts.length > 0 ? parts.join(', ') : null
  }

  acceptsEmailMarketing(): boolean {
    return this.prefers_newsletter_email
  }

  acceptsPushNotifications(): boolean {
    return this.prefers_promo_push && !!this.fcm_token
  }
}

export interface UsersProfileInsert {
  user_id: string
  role?: UserRole
  profile_picture_url?: string | null
  date_of_birth?: string | null
  gender?: UserGender | null
  language_preference?: string
  country?: string | null
  state?: string | null
  city?: string | null
  identification_type?: string | null
  identification_number?: string | null
  prefers_newsletter_email?: boolean
  prefers_promo_push?: boolean
  prefers_promo_sms?: boolean
  prefers_account_updates_email?: boolean
  fcm_token?: string | null
}

export interface UsersProfileUpdate {
  profile_picture_url?: string | null
  date_of_birth?: string | null
  gender?: UserGender | null
  language_preference?: string
  country?: string | null
  state?: string | null
  city?: string | null
  identification_type?: string | null
  identification_number?: string | null
  prefers_newsletter_email?: boolean
  prefers_promo_push?: boolean
  prefers_promo_sms?: boolean
  prefers_account_updates_email?: boolean
  fcm_token?: string | null
}

export interface UsersProfileWithAuth extends UsersProfile {
  auth_user?: {
    email: string
    phone: string | null
    user_metadata?: {
      name?: string
      first_name?: string
      last_name?: string
    }
  }
}
