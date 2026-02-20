'use client'

import { useState, useEffect, useCallback } from 'react'
import { useActiveBusinessStore } from '@/lib/store/active-business-store'
import { useCurrentUser } from '@/hooks/use-current-user'
import { USER_ROLES } from '@/const/roles'
import {
  checkPlanModuleAccessAction,
  checkPlanFeatureAction,
} from '@/lib/actions/plan'

export type ModuleCode =
  | 'dashboard'
  | 'appointments'
  | 'services'
  | 'products'
  | 'inventory'
  | 'specialists'
  | 'customers'
  | 'medical_records'
  | 'commissions'
  | 'reports'
  | 'invoices'
  | 'ai_assistant'
  | 'whatsapp'
  | 'settings'

export type FeatureCode =
  | 'has_custom_branding'
  | 'has_priority_support'
  | 'has_api_access'

export interface ModuleAccessResult {
  hasAccess: boolean
  canRead: boolean
  canWrite: boolean
  canDelete: boolean
  isLoading: boolean
}

export interface PlanAccessState {
  moduleAccess: Record<string, ModuleAccessResult>
  featureAccess: Record<string, boolean>
  isLoading: boolean
  businessAccountId: string | null
}

const defaultModuleAccess: ModuleAccessResult = {
  hasAccess: false,
  canRead: false,
  canWrite: false,
  canDelete: false,
  isLoading: true,
}

const fullAccess: ModuleAccessResult = {
  hasAccess: true,
  canRead: true,
  canWrite: true,
  canDelete: true,
  isLoading: false,
}

/**
 * Hook para verificar acceso a un módulo específico
 * COMPANY_ADMIN tiene acceso completo sin verificación de plan
 */
export function useModuleAccess(moduleCode: ModuleCode): ModuleAccessResult {
  const { activeBusiness } = useActiveBusinessStore()
  const { role } = useCurrentUser()
  const [access, setAccess] = useState<ModuleAccessResult>(defaultModuleAccess)

  // COMPANY_ADMIN tiene acceso completo
  const isCompanyAdmin = role === USER_ROLES.COMPANY_ADMIN

  useEffect(() => {
    // Si es COMPANY_ADMIN, acceso completo inmediato
    if (isCompanyAdmin) {
      setAccess(fullAccess)
      return
    }

    const checkAccess = async () => {
      if (!activeBusiness?.business_account_id) {
        setAccess({ ...defaultModuleAccess, isLoading: false })
        return
      }

      setAccess((prev) => ({ ...prev, isLoading: true }))

      try {
        const result = await checkPlanModuleAccessAction(
          activeBusiness.business_account_id,
          moduleCode
        )

        setAccess({
          hasAccess: result.hasAccess,
          canRead: result.canRead,
          canWrite: result.canWrite,
          canDelete: result.canDelete,
          isLoading: false,
        })
      } catch (error) {
        console.error(`Error checking access for module ${moduleCode}:`, error)
        setAccess({ ...defaultModuleAccess, isLoading: false })
      }
    }

    checkAccess()
  }, [activeBusiness?.business_account_id, moduleCode, isCompanyAdmin])

  // Retornar acceso completo para COMPANY_ADMIN
  if (isCompanyAdmin) {
    return fullAccess
  }

  return access
}

/**
 * Hook para verificar acceso a múltiples módulos a la vez
 * COMPANY_ADMIN tiene acceso completo sin verificación de plan
 */
export function useMultipleModuleAccess(
  moduleCodes: ModuleCode[]
): Record<ModuleCode, ModuleAccessResult> & { isLoading: boolean } {
  const { activeBusiness } = useActiveBusinessStore()
  const { role } = useCurrentUser()
  const [accessMap, setAccessMap] = useState<Record<string, ModuleAccessResult>>({})
  const [isLoading, setIsLoading] = useState(true)

  const isCompanyAdmin = role === USER_ROLES.COMPANY_ADMIN

  useEffect(() => {
    // Si es COMPANY_ADMIN, acceso completo a todos los módulos
    if (isCompanyAdmin) {
      const fullAccessMap = moduleCodes.reduce(
        (acc, code) => ({
          ...acc,
          [code]: fullAccess,
        }),
        {}
      )
      setAccessMap(fullAccessMap)
      setIsLoading(false)
      return
    }

    const checkAllAccess = async () => {
      if (!activeBusiness?.business_account_id) {
        const defaultMap = moduleCodes.reduce(
          (acc, code) => ({
            ...acc,
            [code]: { ...defaultModuleAccess, isLoading: false },
          }),
          {}
        )
        setAccessMap(defaultMap)
        setIsLoading(false)
        return
      }

      setIsLoading(true)

      try {
        const results = await Promise.all(
          moduleCodes.map(async (code) => {
            const result = await checkPlanModuleAccessAction(
              activeBusiness.business_account_id,
              code
            )
            return { code, result }
          })
        )

        const newAccessMap = results.reduce(
          (acc, { code, result }) => ({
            ...acc,
            [code]: {
              hasAccess: result.hasAccess,
              canRead: result.canRead,
              canWrite: result.canWrite,
              canDelete: result.canDelete,
              isLoading: false,
            },
          }),
          {}
        )

        setAccessMap(newAccessMap)
      } catch (error) {
        console.error('Error checking multiple module access:', error)
      } finally {
        setIsLoading(false)
      }
    }

    checkAllAccess()
  }, [activeBusiness?.business_account_id, moduleCodes.join(','), isCompanyAdmin])

  return {
    ...accessMap,
    isLoading,
  } as Record<ModuleCode, ModuleAccessResult> & { isLoading: boolean }
}

/**
 * Hook para verificar acceso a una feature específica
 * COMPANY_ADMIN tiene acceso completo sin verificación de plan
 */
export function useFeatureAccess(featureCode: FeatureCode): {
  hasAccess: boolean
  isLoading: boolean
} {
  const { activeBusiness } = useActiveBusinessStore()
  const { role } = useCurrentUser()
  const [hasAccess, setHasAccess] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const isCompanyAdmin = role === USER_ROLES.COMPANY_ADMIN

  useEffect(() => {
    // COMPANY_ADMIN tiene acceso completo
    if (isCompanyAdmin) {
      setHasAccess(true)
      setIsLoading(false)
      return
    }

    const checkAccess = async () => {
      if (!activeBusiness?.business_account_id) {
        setHasAccess(false)
        setIsLoading(false)
        return
      }

      setIsLoading(true)

      try {
        const result = await checkPlanFeatureAction(
          activeBusiness.business_account_id,
          featureCode
        )
        setHasAccess(result)
      } catch (error) {
        console.error(`Error checking feature ${featureCode}:`, error)
        setHasAccess(false)
      } finally {
        setIsLoading(false)
      }
    }

    checkAccess()
  }, [activeBusiness?.business_account_id, featureCode, isCompanyAdmin])

  // Retornar acceso completo para COMPANY_ADMIN
  if (isCompanyAdmin) {
    return { hasAccess: true, isLoading: false }
  }

  return { hasAccess, isLoading }
}

/**
 * Hook completo para gestión de acceso al plan
 * Proporciona funciones para verificar acceso bajo demanda
 * COMPANY_ADMIN tiene acceso completo sin verificación de plan
 */
export function usePlanAccess() {
  const { activeBusiness } = useActiveBusinessStore()
  const { role } = useCurrentUser()
  const [cache, setCache] = useState<{
    modules: Record<string, ModuleAccessResult>
    features: Record<string, boolean>
  }>({
    modules: {},
    features: {},
  })

  const businessAccountId = activeBusiness?.business_account_id || null
  const isCompanyAdmin = role === USER_ROLES.COMPANY_ADMIN

  // Limpiar caché cuando cambia el business account
  useEffect(() => {
    setCache({ modules: {}, features: {} })
  }, [businessAccountId])

  const checkModuleAccess = useCallback(
    async (moduleCode: ModuleCode): Promise<ModuleAccessResult> => {
      // COMPANY_ADMIN tiene acceso completo
      if (isCompanyAdmin) {
        return fullAccess
      }

      if (!businessAccountId) {
        return { ...defaultModuleAccess, isLoading: false }
      }

      // Retornar del caché si existe
      if (cache.modules[moduleCode]) {
        return cache.modules[moduleCode]
      }

      try {
        const result = await checkPlanModuleAccessAction(
          businessAccountId,
          moduleCode
        )

        const accessResult: ModuleAccessResult = {
          hasAccess: result.hasAccess,
          canRead: result.canRead,
          canWrite: result.canWrite,
          canDelete: result.canDelete,
          isLoading: false,
        }

        setCache((prev) => ({
          ...prev,
          modules: { ...prev.modules, [moduleCode]: accessResult },
        }))

        return accessResult
      } catch (error) {
        console.error(`Error checking module access for ${moduleCode}:`, error)
        return { ...defaultModuleAccess, isLoading: false }
      }
    },
    [businessAccountId, cache.modules, isCompanyAdmin]
  )

  const checkFeatureAccess = useCallback(
    async (featureCode: FeatureCode): Promise<boolean> => {
      // COMPANY_ADMIN tiene acceso completo
      if (isCompanyAdmin) {
        return true
      }

      if (!businessAccountId) {
        return false
      }

      // Retornar del caché si existe
      if (featureCode in cache.features) {
        return cache.features[featureCode]
      }

      try {
        const result = await checkPlanFeatureAction(businessAccountId, featureCode)

        setCache((prev) => ({
          ...prev,
          features: { ...prev.features, [featureCode]: result },
        }))

        return result
      } catch (error) {
        console.error(`Error checking feature access for ${featureCode}:`, error)
        return false
      }
    },
    [businessAccountId, cache.features, isCompanyAdmin]
  )

  const invalidateCache = useCallback(() => {
    setCache({ modules: {}, features: {} })
  }, [])

  return {
    businessAccountId,
    checkModuleAccess,
    checkFeatureAccess,
    invalidateCache,
    cachedModules: cache.modules,
    cachedFeatures: cache.features,
  }
}

/**
 * Mapeo de URLs del sidebar a códigos de módulos
 */
export const URL_TO_MODULE_MAP: Record<string, ModuleCode> = {
  '/admin': 'dashboard',
  '/admin/appointments': 'appointments',
  '/admin/services': 'services',
  '/admin/products': 'products',
  '/admin/inventory': 'inventory',
  '/admin/specialists': 'specialists',
  '/admin/specialists/team': 'specialists',
  '/admin/specialists/goals': 'specialists',
  '/admin/customers': 'customers',
  '/admin/medical-records': 'medical_records',
  '/admin/commissions': 'commissions',
  '/admin/reports': 'reports',
  '/admin/invoices': 'invoices',
  '/admin/settings/ai-agent': 'ai_assistant',
  '/admin/settings/whatsapp': 'whatsapp',
  '/admin/settings': 'settings',
}

/**
 * Obtiene el código de módulo para una URL dada
 */
export function getModuleCodeForUrl(url: string): ModuleCode | null {
  // Buscar coincidencia exacta primero
  if (URL_TO_MODULE_MAP[url]) {
    return URL_TO_MODULE_MAP[url]
  }

  // Buscar coincidencia parcial (para rutas anidadas)
  for (const [path, moduleCode] of Object.entries(URL_TO_MODULE_MAP)) {
    if (url.startsWith(path) && path !== '/admin') {
      return moduleCode
    }
  }

  return null
}
