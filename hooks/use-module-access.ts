'use client'

import { useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useModuleAccessStore } from '@/lib/store/module-access-store'
import { type ModuleName } from '@/lib/config/module-access'

interface ModuleAccessResult {
  hasAccess: boolean
  reason: string | null
}

/**
 * Hook para verificar el acceso a módulos basado en el tipo de negocio y plan de suscripción
 *
 * @example
 * ```tsx
 * const { checkModuleAccess, availableModules } = useModuleAccess()
 * const medicalRecordsAccess = checkModuleAccess('medical_records')
 *
 * if (!medicalRecordsAccess.hasAccess) {
 *   return <Alert>{medicalRecordsAccess.reason}</Alert>
 * }
 * ```
 */
export function useModuleAccess() {
  const { data: session } = useSession()
  const { moduleAccess, isLoaded } = useModuleAccessStore()

  /**
    * Verifica si el usuario tiene acceso a un módulo específico
    */
  const checkModuleAccess = useMemo(() => {
    return (module: ModuleName): ModuleAccessResult => {
      // Si no hay sesión, denegar acceso
      if (!session) {
        return {
          hasAccess: false,
          reason: 'Usuario no autenticado',
        }
      }

      // COMPANY_ADMIN tiene acceso completo
      if (session.user?.role === 'company_admin') {
        return { hasAccess: true, reason: null }
      }

      // Si el store no está cargado, denegar acceso temporalmente
      if (!isLoaded) {
        return {
          hasAccess: false,
          reason: 'Verificando permisos...',
        }
      }

      // Verificar acceso en el store (100% dependiente de BD)
      const hasAccess = moduleAccess[module] === true

      return {
        hasAccess,
        reason: hasAccess ? null : 'No tienes acceso a este módulo',
      }
    }
  }, [session, moduleAccess, isLoaded])

  /**
    * Lista de todos los módulos disponibles para el usuario actual
    */
  const availableModules = useMemo(() => {
    if (!isLoaded) return []

    return Object.keys(moduleAccess).filter(module => moduleAccess[module] === true) as ModuleName[]
  }, [moduleAccess, isLoaded])

  /**
    * Verifica si un módulo específico está disponible (versión simple que retorna boolean)
    */
  const isModuleAvailable = useMemo(() => {
    return (module: ModuleName): boolean => {
      return checkModuleAccess(module).hasAccess
    }
  }, [checkModuleAccess])

  return {
    checkModuleAccess,
    availableModules,
    isModuleAvailable,
  }
}
