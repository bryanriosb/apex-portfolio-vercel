'use client'

import { useEffect } from 'react'
import { useActiveBusinessStore } from '@/lib/store/active-business-store'
import { useUnifiedPermissionsStore } from '@/lib/store/unified-permissions-store'
import { useCurrentUser } from '@/hooks/use-current-user'
import { USER_ROLES } from '@/const/roles'

/**
 * Componente que carga TODOS los permisos y metadata en UNA SOLA llamada
 * Reemplaza a ModuleAccessLoader para optimizar performance
 * Se ejecuta una sola vez cuando el usuario entra al admin
 */
export function PermissionsLoader() {
  const { activeBusiness } = useActiveBusinessStore()
  const { role } = useCurrentUser()
  const { loadPermissions, clearPermissions, businessAccountId } = useUnifiedPermissionsStore()

  useEffect(() => {
    const loadPermissionsData = async () => {
      // COMPANY_ADMIN tiene acceso completo - no necesita cargar permisos
      if (role === USER_ROLES.COMPANY_ADMIN) {
        clearPermissions()
        return
      }

      if (!activeBusiness?.business_account_id) {
        clearPermissions()
        return
      }

      // Solo cargar si cambió el business account o no hay datos cargados
      if (businessAccountId !== activeBusiness.business_account_id) {
        try {
          await loadPermissions(activeBusiness.business_account_id)
        } catch (error) {
          console.error('Error loading permissions:', error)
          // Limpiar cache si hay error
          clearPermissions()
        }
      }
    }

    loadPermissionsData()
  }, [activeBusiness?.business_account_id, businessAccountId, role, loadPermissions, clearPermissions])

  return null // Este componente no renderiza nada
}