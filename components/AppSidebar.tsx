'use client'

import { useMemo } from 'react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar'
import SidebarCustomFooter from './SidebarCustomFooter'
import {
  SIDE_APP_MENU_ITEMS,
  SIDE_SYSTEM_MENU_ITEMS,
} from '@/const/sidebar-menu'
import { useCurrentUser } from '@/hooks/use-current-user'
import { USER_ROLES } from '@/const/roles'
import { NavMain } from './NavMain'
import { BusinessSwitcher } from './BusinessSwitcher'
import { SubscriptionOnlyMenu } from './SubscriptionOnlyMenu'
import { SelectSeparator } from './ui/select'

interface AppSidebarProps {
  accessibleModules: string[]
}

export function AppSidebar({ accessibleModules }: AppSidebarProps) {
  const { role } = useCurrentUser()
  const { state } = useSidebar()
  const isCollapsed = state === 'collapsed'

  // COMPANY_ADMIN siempre tiene acceso completo (superuser)
  const isCompanyAdmin = role === USER_ROLES.COMPANY_ADMIN

  // Determinar si mostrar solo menú de suscripción basado en módulos accesibles del servidor
  // Si no hay módulos de aplicación accesibles (excepto para COMPANY_ADMIN), mostrar solo suscripción
  const hasAppModules = accessibleModules.some((module) =>
    [
      'dashboard',
      'customers',
      'reports',
      'invoices',
      'ai_assistant',
      'whatsapp',
    ].includes(module)
  )

  const shouldShowSubscriptionOnly = !isCompanyAdmin && !hasAppModules

  // Crear set de módulos accesibles para búsqueda rápida
  const accessibleModulesSet = useMemo(
    () => new Set(accessibleModules),
    [accessibleModules]
  )

  // Filtrar items del menú por rol y módulos accesibles
  const filteredAppItems = useMemo(() => {
    return SIDE_APP_MENU_ITEMS.filter((item) => {
      // Verificar rol
      if (!role || !item.allowedRoles.includes(role)) {
        return false
      }

      // Si skipPlanCheck, siempre mostrar
      if (item.skipPlanCheck) {
        return true
      }

      // Si no tiene moduleCode, mostrar
      if (!item.moduleCode) {
        return true
      }

      // Verificar si el módulo es accesible
      return accessibleModulesSet.has(item.moduleCode)
    })
  }, [role, accessibleModulesSet])

  const filteredSystemItems = useMemo(() => {
    return SIDE_SYSTEM_MENU_ITEMS.filter((item) => {
      // Verificar rol
      if (!role || !item.allowedRoles.includes(role)) {
        return false
      }

      // Si skipPlanCheck, siempre mostrar
      if (item.skipPlanCheck) {
        return true
      }

      // Si no tiene moduleCode, mostrar
      if (!item.moduleCode) {
        return true
      }

      // Verificar si el módulo es accesible
      return accessibleModulesSet.has(item.moduleCode)
    })
  }, [role, accessibleModulesSet])

  // Filtrar sub-items también
  const finalAppItems = useMemo(() => {
    return filteredAppItems.map((item) => {
      if (!item.items) return item

      const filteredSubItems = item.items.filter((subItem) => {
        // Verificar rol en sub-item
        if (
          subItem.allowedRoles &&
          (!role || !subItem.allowedRoles.includes(role))
        ) {
          return false
        }

        // Verificar módulo en sub-item
        if (subItem.moduleCode) {
          return accessibleModulesSet.has(subItem.moduleCode)
        }

        return true
      })

      return { ...item, items: filteredSubItems }
    })
  }, [filteredAppItems, role, accessibleModulesSet])

  const finalSystemItems = useMemo(() => {
    return filteredSystemItems.map((item) => {
      if (!item.items) return item

      const filteredSubItems = item.items.filter((subItem) => {
        // Verificar rol en sub-item
        if (
          subItem.allowedRoles &&
          (!role || !subItem.allowedRoles.includes(role))
        ) {
          return false
        }

        // Verificar módulo en sub-item
        if (subItem.moduleCode) {
          return accessibleModulesSet.has(subItem.moduleCode)
        }

        return true
      })

      return { ...item, items: filteredSubItems }
    })
  }, [filteredSystemItems, role, accessibleModulesSet])

  // Determinar contenido del sidebar basado en módulos accesibles del servidor
  const sidebarContent = shouldShowSubscriptionOnly ? (
    <SubscriptionOnlyMenu />
  ) : (
    <>
      {finalAppItems.length > 0 && (
        <NavMain items={finalAppItems} label="Aplicación" userRole={role} />
      )}
      <SelectSeparator />
      {finalSystemItems.length > 0 && (
        <NavMain items={finalSystemItems} label="Sistema" userRole={role} />
      )}
    </>
  )

  return (
    <Sidebar collapsible="icon" className="z-50">
      <SidebarHeader>
        <div className="border-b w-full mb-2 overflow-hidden">
          <div className="relative mx-auto mb-4 flex items-center justify-center transition-all duration-300 ease-in-out">
            {/* <Image
              className={`transition-all duration-300 ease-in-out dark:brightness-0 dark:invert ${
                isCollapsed
                  ? 'scale-100 opacity-100 absolute'
                  : 'scale-100 opacity-100'
              }`}
              alt="logo"
              src="/beluvio-small.svg"
              width={28}
              height={28}
              style={{
                position: isCollapsed ? 'relative' : 'absolute',
                transform: isCollapsed ? 'scale(1)' : 'scale(0)',
                opacity: isCollapsed ? 1 : 0,
              }}
            /> 

            <Image
              className={`transition-all duration-300 ease-in-out dark:brightness-0 dark:invert ${
                isCollapsed ? 'absolute' : 'relative'
              }`}
              alt="logo"
              src="/beluvio.svg"
              width={120}
              height={20}
              style={{
                position: isCollapsed ? 'absolute' : 'relative',
                transform: isCollapsed ? 'scale(0)' : 'scale(1)',
                opacity: isCollapsed ? 0 : 1,
              }}
            />
            */}
            <div
              className={`font-bold text-3xl transition-all duration-300 ease-in-out dark:brightness-0 dark:invert ${
                isCollapsed
                  ? 'scale-100 opacity-100 absolute'
                  : 'scale-100 opacity-100'
              }`}
              style={{
                position: isCollapsed ? 'relative' : 'absolute',
                transform: isCollapsed ? 'scale(1)' : 'scale(0)',
                opacity: isCollapsed ? 1 : 0,
              }}
            >
              P
            </div>
            <div
              className={`font-bold text-3xl transition-all duration-300 ease-in-out dark:brightness-0 dark:invert ${
                isCollapsed ? 'absolute' : 'relative'
              }`}
              style={{
                position: isCollapsed ? 'absolute' : 'relative',
                transform: isCollapsed ? 'scale(0)' : 'scale(1)',
                opacity: isCollapsed ? 0 : 1,
              }}
            >
              P-APEX
            </div>
          </div>
        </div>

        <BusinessSwitcher />
      </SidebarHeader>
      <SidebarContent className="overflow-x-hidden">
        {sidebarContent}
      </SidebarContent>
      <SidebarFooter>
        <SidebarCustomFooter />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
