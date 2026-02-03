'use client'

import { useEffect } from 'react'
import { useActiveBusinessStore } from '@/lib/store/active-business-store'
import { useModuleAccessStore } from '@/lib/store/module-access-store'
import { getAllModuleAccessAction } from '@/lib/actions/plan'
import { useCurrentUser } from '@/hooks/use-current-user'
import { USER_ROLES } from '@/const/roles'

/**
 * Componente que precarga el acceso a módulos del plan actual
 * Se ejecuta una sola vez cuando el usuario entra al admin
 */
export function ModuleAccessLoader() {
  const { activeBusiness } = useActiveBusinessStore()
  const { role } = useCurrentUser()
  const { setModuleAccess, clearModuleAccess } = useModuleAccessStore()

  useEffect(() => {
    const loadModuleAccess = async () => {
      // COMPANY_ADMIN tiene acceso completo - marcar como cargado con objeto vacío
      if (role === USER_ROLES.COMPANY_ADMIN) {
        setModuleAccess({})
        return
      }

      if (!activeBusiness?.business_account_id) {
        clearModuleAccess()
        return
      }

      const moduleAccess = await getAllModuleAccessAction(
        activeBusiness.business_account_id
      )
      setModuleAccess(moduleAccess)
    }

    loadModuleAccess()
  }, [activeBusiness?.business_account_id, role, setModuleAccess, clearModuleAccess])

  return null // Este componente no renderiza nada
}
