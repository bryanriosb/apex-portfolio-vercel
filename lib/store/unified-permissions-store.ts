import { create } from 'zustand'
import type { FeatureMetadata } from '@/lib/models/plan/plan'

export interface PlanLimits {
  max_appointments_per_month: number | null
  max_products: number | null
  max_services: number | null
  max_customers: number | null
  max_storage_mb: number | null
  max_businesses: number
  max_users_per_business: number
  max_specialists_per_business: number
}

export interface CurrentUsage {
  appointments_per_month: number
  products: number
  services: number
  customers: number
  specialists: number
  users: number
  businesses: number
}

export interface UnifiedPermissionsState {
  // Business & Plan Info
  businessAccountId: string | null
  planId: string | null
  planCode: string | null
  
  // Module Access
  moduleAccess: Record<string, boolean>
  
  // Feature Permissions (por módulo)
  featurePermissions: Record<string, Record<string, boolean>>
  
  // Feature Metadata (por módulo)
  featureMetadata: Record<string, Record<string, FeatureMetadata>>
  
  // Plan Limits
  planLimits: PlanLimits | null
  
  // Current Usage Counts
  currentUsage: CurrentUsage | null
  
  // Loading State
  isLoading: boolean
  
  // Actions
  loadPermissions: (businessAccountId: string) => Promise<void>
  clearPermissions: () => void
  
  // Helper methods
  hasModuleAccess: (moduleCode: string) => boolean
  hasFeaturePermission: (moduleCode: string, featureKey: string) => boolean
  getFeatureMetadata: (moduleCode: string, featureKey: string) => FeatureMetadata | null
  getLimitInfo: (limitType: keyof PlanLimits) => {
    limit: number | null
    current: number
    remaining: number | null
    isAtLimit: boolean
    percentageUsed: number | null
  }
}

export const useUnifiedPermissionsStore = create<UnifiedPermissionsState>((set, get) => ({
  // Initial state
  businessAccountId: null,
  planId: null,
  planCode: null,
  moduleAccess: {},
  featurePermissions: {},
  featureMetadata: {},
  planLimits: null,
  currentUsage: null,
  isLoading: false,

  // Actions
  loadPermissions: async (businessAccountId: string) => {
    // Importar dinámicamente para evitar circular dependency
    const { getUnifiedPermissionsAction } = await import('@/lib/actions/permissions')
    
    set({ isLoading: true })
    
    try {
      const data = await getUnifiedPermissionsAction(businessAccountId)
      
      set({
        businessAccountId,
        planId: data.planId,
        planCode: data.planCode,
        moduleAccess: data.moduleAccess,
        featurePermissions: data.featurePermissions,
        featureMetadata: data.featureMetadata,
        planLimits: data.planLimits,
        currentUsage: data.currentUsage,
        isLoading: false,
      })
    } catch (error) {
      console.error('Error loading unified permissions:', error)
      set({ isLoading: false })
      throw error
    }
  },

  clearPermissions: () => {
    set({
      businessAccountId: null,
      planId: null,
      planCode: null,
      moduleAccess: {},
      featurePermissions: {},
      featureMetadata: {},
      planLimits: null,
      currentUsage: null,
      isLoading: false,
    })
  },

  // Helper methods
  hasModuleAccess: (moduleCode: string) => {
    const state = get()
    return state.moduleAccess[moduleCode] === true
  },

  hasFeaturePermission: (moduleCode: string, featureKey: string) => {
    const state = get()
    return state.featurePermissions[moduleCode]?.[featureKey] === true
  },

  getFeatureMetadata: (moduleCode: string, featureKey: string) => {
    const state = get()
    return state.featureMetadata[moduleCode]?.[featureKey] || null
  },

  getLimitInfo: (limitType: keyof PlanLimits) => {
    const state = get()
    const limit = state.planLimits?.[limitType] || null
    
    // Mapeo correcto entre limitType y CurrentUsage
    const usageMapping: Record<keyof PlanLimits, keyof CurrentUsage> = {
      max_appointments_per_month: 'appointments_per_month',
      max_products: 'products',
      max_services: 'services',
      max_customers: 'customers',
      max_storage_mb: 'appointments_per_month', // TODO: Add storage to CurrentUsage
      max_businesses: 'businesses',
      max_users_per_business: 'users',
      max_specialists_per_business: 'specialists',
    }
    
    const current = state.currentUsage?.[usageMapping[limitType]] || 0
    
    let remaining: number | null = null
    let isAtLimit = false
    let percentageUsed: number | null = null
    
    if (limit !== null && typeof limit === 'number') {
      remaining = Math.max(0, limit - current)
      isAtLimit = current >= limit
      percentageUsed = limit > 0 ? (current / limit) * 100 : null
    }
    
    return {
      limit,
      current,
      remaining,
      isAtLimit,
      percentageUsed,
    }
  },
}))