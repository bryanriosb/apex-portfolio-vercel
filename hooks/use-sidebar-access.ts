'use client'

import { useMemo } from 'react'
import { useCurrentUser } from '@/hooks/use-current-user'
import { useModuleAccessStore } from '@/lib/store/module-access-store'
import { USER_ROLES } from '@/const/roles'
import type { MenuItem, ModuleCode } from '@/const/sidebar-menu'

/**
 * Hook para filtrar items del sidebar basado en acceso del plan
 * Usa el store de Zustand que fue precargado por ModuleAccessLoader
 * COMPANY_ADMIN tiene acceso completo sin verificación de plan
 */
export function useSidebarAccess(items: MenuItem[]): {
  filteredItems: MenuItem[]
  isLoading: boolean
} {
  const { role } = useCurrentUser()
  const { moduleAccess, isLoaded } = useModuleAccessStore()

  const isCompanyAdmin = role === USER_ROLES.COMPANY_ADMIN

  // Filtrar items basado en acceso del plan
  const filteredItems = useMemo(() => {
    // Mientras carga, mostrar solo items sin verificación de plan
    if (!isLoaded) {
      return items.filter((item) => item.skipPlanCheck || !item.moduleCode)
    }

    // COMPANY_ADMIN tiene acceso a todo
    if (isCompanyAdmin) {
      return items
    }

    return items
      .filter((item) => {
        // Si skipPlanCheck, siempre mostrar
        if (item.skipPlanCheck) return true
        // Si no tiene moduleCode, mostrar
        if (!item.moduleCode) return true
        // Verificar acceso al módulo
        return moduleAccess[item.moduleCode] === true
      })
      .map((item) => {
        // Filtrar sub-items también
        if (!item.items) return item

        const filteredSubItems = item.items.filter((subItem) => {
          if (!subItem.moduleCode) return true
          return moduleAccess[subItem.moduleCode] === true
        })

        return { ...item, items: filteredSubItems }
      })
  }, [items, moduleAccess, isLoaded, isCompanyAdmin])

  return { filteredItems, isLoading: !isLoaded }
}

/**
 * Hook simplificado para verificar si un módulo es accesible
 * Usa el store de Zustand precargado
 */
export function useModuleVisible(moduleCode: ModuleCode | undefined): boolean {
  const { role } = useCurrentUser()
  const { moduleAccess, isLoaded } = useModuleAccessStore()

  const isCompanyAdmin = role === USER_ROLES.COMPANY_ADMIN

  if (!moduleCode) return true
  if (isCompanyAdmin) return true
  if (!isLoaded) return true // Mostrar mientras carga para evitar parpadeos

  return moduleAccess[moduleCode] === true
}
