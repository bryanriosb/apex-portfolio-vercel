export type BillingPeriod = 'monthly' | 'yearly' | 'lifetime'
export type PlanStatus = 'active' | 'inactive' | 'deprecated'

export interface Plan {
  id: string
  code: string
  name: string
  description: string | null
  price_cents: number
  billing_period: BillingPeriod
  status: PlanStatus
  max_businesses: number
  max_users_per_business: number
  max_specialists_per_business: number
  features: PlanFeatures
  sort_order: number
  created_at: string
  updated_at: string
  monthly_price_cents: number
  yearly_price_cents: number
  yearly_discount_percent: number
  mp_plan_monthly_id: string | null
  mp_plan_yearly_id: string | null
}

// Features ahora solo contiene límites y configuraciones adicionales
// El acceso a módulos se controla via plan_module_access
export interface PlanFeatures {
  // Límites de uso
  max_appointments_per_month: number | null
  max_products: number | null
  max_services: number | null
  max_customers: number | null
  max_storage_mb: number | null
  // Configuraciones adicionales (no son módulos)
  has_custom_branding: boolean
  has_priority_support: boolean
  has_api_access: boolean
  [key: string]: boolean | number | string | null | undefined
}

export interface PlanModule {
  id: string
  code: string
  name: string
  description: string | null
  icon_key: string | null
  is_active: boolean
  created_at: string
}

export interface FeatureMetadata {
  name: string
  description: string
  requiredPlan: string[]
}

export interface PlanModuleAccess {
  id: string
  plan_id: string
  module_id: string
  can_read: boolean
  can_write: boolean
  can_delete: boolean
  custom_permissions: Record<string, boolean> | null
  features_metadata: Record<string, FeatureMetadata> | null
  created_at: string
}

export interface PlanWithModules extends Plan {
  modules: (PlanModuleAccess & { module: PlanModule })[]
}

export interface PlanInsert {
  code: string
  name: string
  description?: string | null
  price_cents: number
  billing_period: BillingPeriod
  status?: PlanStatus
  max_businesses: number
  max_users_per_business: number
  max_specialists_per_business: number
  features: PlanFeatures
  sort_order?: number
  monthly_price_cents?: number
  yearly_price_cents?: number
  yearly_discount_percent?: number
  mp_plan_monthly_id?: string | null
  mp_plan_yearly_id?: string | null
}

export interface PlanUpdate {
  code?: string
  name?: string
  description?: string | null
  price_cents?: number
  billing_period?: BillingPeriod
  status?: PlanStatus
  max_businesses?: number
  max_users_per_business?: number
  max_specialists_per_business?: number
  features?: PlanFeatures
  sort_order?: number
  monthly_price_cents?: number
  yearly_price_cents?: number
  yearly_discount_percent?: number
  mp_plan_monthly_id?: string | null
  mp_plan_yearly_id?: string | null
}

export interface PlanModuleInsert {
  code: string
  name: string
  description?: string | null
  icon_key?: string | null
  is_active?: boolean
}

export interface PlanModuleAccessInsert {
  plan_id: string
  module_id: string
  can_read?: boolean
  can_write?: boolean
  can_delete?: boolean
  custom_permissions?: Record<string, boolean> | null
  features_metadata?: Record<string, FeatureMetadata> | null
}

export interface PlanModuleAccessUpdate {
  can_read?: boolean
  can_write?: boolean
  can_delete?: boolean
  custom_permissions?: Record<string, boolean> | null
  features_metadata?: Record<string, FeatureMetadata> | null
}

export const DEFAULT_PLAN_FEATURES: PlanFeatures = {
  // Límites de uso (null = sin límite)
  max_appointments_per_month: null,
  max_products: null,
  max_services: null,
  max_customers: null,
  max_storage_mb: null,
  // Configuraciones adicionales
  has_custom_branding: false,
  has_priority_support: false,
  has_api_access: false,
}
