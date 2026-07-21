import type { UserRole } from '@/const/roles'

/**
 * Usuario de la aplicación respaldado por Supabase Auth (`auth.users`).
 * Los datos de negocio (rol, cuenta, sucursales) viven en `user_metadata`
 * y se espejan en `app_metadata`.
 */
export interface AccountUserBusiness {
  id: string
  name: string
  business_account_id: string
  timezone?: string | null
}

export interface AccountUser {
  id: string
  email: string
  name: string | null
  phone: string | null
  role: UserRole
  business_account_id: string | null
  business_account_name: string | null
  business_id: string | null
  /** Sucursales a las que tiene acceso (snapshot en metadata) */
  businesses: AccountUserBusiness[]
  /** true = acceso a todas las sucursales de la cuenta */
  all_businesses: boolean
  email_confirmed_at: string | null
  last_sign_in_at: string | null
  created_at: string
  updated_at: string | null
}

/**
 * `business_id: null` + `all_businesses: true` = acceso a todas las
 * sucursales de la cuenta. Con `all_businesses: false`, `business_id`
 * es la única sucursal permitida.
 */
export interface AccountUserInsert {
  name: string
  email: string
  password: string
  role: UserRole
  business_account_id: string
  business_id: string | null
  all_businesses: boolean
}

export interface AccountUserUpdate {
  name?: string
  password?: string
  role?: UserRole
  business_id?: string | null
  all_businesses?: boolean
}

export interface AccountUserListResponse {
  data: AccountUser[]
  total: number
  total_pages: number
}
