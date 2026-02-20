'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useActiveBusinessStore } from '@/lib/store/active-business-store'
import { useUnifiedPermissionsStore } from '@/lib/store/unified-permissions-store'
import { useCurrentUser } from '@/hooks/use-current-user'
import { USER_ROLES } from '@/const/roles'

export type LimitType =
  | 'max_appointments_per_month'
  | 'max_products'
  | 'max_services'
  | 'max_customers'
  | 'max_storage_mb'
  | 'max_businesses'
  | 'max_users_per_business'
  | 'max_specialists_per_business'

export interface LimitInfo {
  limit: number | null // null = sin límite
  current: number
  remaining: number | null // null = sin límite
  isAtLimit: boolean
  percentageUsed: number | null // null = sin límite
  isLoading: boolean
}

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

const DEFAULT_LIMIT_INFO: LimitInfo = {
  limit: null,
  current: 0,
  remaining: null,
  isAtLimit: false,
  percentageUsed: null,
  isLoading: true,
}



/**
 * Hook para obtener los límites del plan actual usando el store unificado
 */
export function usePlanLimits(): {
  limits: PlanLimits | null
  isLoading: boolean
  error: string | null
  refetch: () => void
} {
  const { planLimits, isLoading } = useUnifiedPermissionsStore()
  const { role } = useCurrentUser()
  const { activeBusiness } = useActiveBusinessStore()

  const isCompanyAdmin = role === USER_ROLES.COMPANY_ADMIN

  // COMPANY_ADMIN tiene acceso completo sin límites
  if (isCompanyAdmin) {
    return {
      limits: {
        max_appointments_per_month: null,
        max_products: null,
        max_services: null,
        max_customers: null,
        max_storage_mb: null,
        max_businesses: 999999,
        max_users_per_business: 999999,
        max_specialists_per_business: 999999,
      },
      isLoading: false,
      error: null,
      refetch: () => {},
    }
  }

  // Si no hay business activo, no hay límites
  if (!activeBusiness?.business_account_id) {
    return {
      limits: null,
      isLoading: false,
      error: 'No hay negocio activo',
      refetch: () => {},
    }
  }

  return {
    limits: planLimits,
    isLoading: isLoading,
    error: null,
    refetch: () => {},
  }
}

// Límites "sin límite" para COMPANY_ADMIN
const UNLIMITED_LIMIT_INFO: LimitInfo = {
  limit: null,
  current: 0,
  remaining: null,
  isAtLimit: false,
  percentageUsed: null,
  isLoading: false,
}

/**
 * Hook para verificar un límite específico usando el store unificado
 * COMPANY_ADMIN no tiene límites
 */
export function useLimitCheck(limitType: LimitType): LimitInfo {
  const { getLimitInfo, isLoading } = useUnifiedPermissionsStore()
  const { role, businessAccountId: userBusinessAccountId } = useCurrentUser()
  const { activeBusiness } = useActiveBusinessStore()

  const isCompanyAdmin = role === USER_ROLES.COMPANY_ADMIN
  const isBusinessAdmin = role === USER_ROLES.BUSINESS_ADMIN

  // COMPANY_ADMIN no tiene límites
  if (isCompanyAdmin) {
    return UNLIMITED_LIMIT_INFO
  }

  // Para business_admin, usar el businessAccountId del usuario directamente
  // Para otros roles, usar el activeBusiness
  const effectiveBusinessAccountId = isBusinessAdmin 
    ? userBusinessAccountId 
    : activeBusiness?.business_account_id

  // Si no hay business account ID efectivo, no hay información de límites
  if (!effectiveBusinessAccountId) {
    return { ...DEFAULT_LIMIT_INFO, isLoading: false }
  }

  const limitInfo = getLimitInfo(limitType)
  
  return {
    ...limitInfo,
    isLoading: isLoading,
  }
}

/**
 * Hook para verificar si se puede crear un nuevo recurso
 */
export function useCanCreate(resourceType: 'product' | 'service' | 'customer' | 'specialist' | 'business' | 'appointment'): {
  canCreate: boolean
  limitInfo: LimitInfo
} {
  const limitTypeMap: Record<string, LimitType> = {
    product: 'max_products',
    service: 'max_services',
    customer: 'max_customers',
    specialist: 'max_specialists_per_business',
    business: 'max_businesses',
    appointment: 'max_appointments_per_month',
  }

  const limitInfo = useLimitCheck(limitTypeMap[resourceType])

  return {
    canCreate: !limitInfo.isAtLimit,
    limitInfo,
  }
}

/**
 * Componente helper para mostrar información de uso de límite
 */
export function formatLimitUsage(limitInfo: LimitInfo): string {
  if (limitInfo.limit === null) {
    return `${limitInfo.current} (sin límite)`
  }
  return `${limitInfo.current} / ${limitInfo.limit}`
}

export function getLimitStatusColor(limitInfo: LimitInfo): 'default' | 'warning' | 'error' {
  if (limitInfo.percentageUsed === null) return 'default'
  if (limitInfo.percentageUsed >= 100) return 'error'
  if (limitInfo.percentageUsed >= 80) return 'warning'
  return 'default'
}
