'use client'

import { useEffect, useCallback } from 'react'
import { ChevronsUpDown, Store, Check, RefreshCw, Loader2, MapPinHouse, Building2, Building } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useCurrentUser } from '@/hooks/use-current-user'
import {
  useActiveBusinessStore,
  Business,
} from '@/lib/store/active-business-store'
import { USER_ROLES } from '@/const/roles'
import Loading from './ui/loading'

export function BusinessSwitcher() {
  const { isMobile, state } = useSidebar()
  const isCollapsed = state === 'collapsed'
  const { businessAccountId, role, isLoading: isUserLoading } = useCurrentUser()
  const {
    activeBusiness,
    businesses,
    isLoading,
    setActiveBusiness,
    loadBusinesses,
  } = useActiveBusinessStore()

  const handleRefreshBusinesses = useCallback(async () => {
    if (!businessAccountId) return
    try {
      // Force reload by clearing cache first
      await loadBusinesses(businessAccountId)
    } catch (error) {
      console.error('Error refreshing businesses:', error)
    }
  }, [businessAccountId, loadBusinesses])

  useEffect(() => {
    if (role === USER_ROLES.BUSINESS_ADMIN && businessAccountId) {
      // Resetear el estado actual antes de cargar nuevos negocios
      // Esto evita que se muestren datos de una cuenta anterior
      const currentState = useActiveBusinessStore.getState()
      const needsReset =
        currentState.businesses.length > 0 &&
        currentState.businesses[0]?.business_account_id !== businessAccountId

      if (needsReset) {
        useActiveBusinessStore.getState().reset()
      }

      loadBusinesses(businessAccountId)
    }
  }, [role, businessAccountId, loadBusinesses])

  if (isUserLoading) {
    return null
  }

  if (role !== USER_ROLES.BUSINESS_ADMIN) {
    return null
  }

  if (isLoading) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <div
            className={`flex items-center justify-center p-2 ${isCollapsed ? 'size-8' : 'w-full gap-2'
              }`}
          >
            <div className="bg-muted flex aspect-square size-8 items-center justify-center">
              <Loading />
            </div>
            {!isCollapsed && (
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium text-muted-foreground">
                  <Loading />
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  Sucursales
                </span>
              </div>
            )}
          </div>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  if (!isLoading && businesses.length === 0) {
    return null
  }

  const triggerButton = (
    <button
      className={`flex items-center text-left text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground ${isCollapsed ? 'size-8 justify-center p-0' : 'w-full gap-2 p-2'
        }`}
    >
      <div className="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center shrink-0">
        <Building2 className="size-4" />
      </div>
      {!isCollapsed && (
        <>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-medium">
              {activeBusiness?.name || 'Seleccionar'}
            </span>
            <span className="truncate text-xs text-muted-foreground">
              Sucursal activa
            </span>
          </div>
          <ChevronsUpDown className="ml-auto size-4 shrink-0" />
        </>
      )}
    </button>
  )

  const dropdownContent = (
    <DropdownMenuContent
      className="min-w-56 z-50"
      align="start"
      side={isMobile ? 'bottom' : 'right'}
      sideOffset={4}
    >
      <DropdownMenuLabel className="text-muted-foreground text-xs">
        Sucursales
      </DropdownMenuLabel>
      {businesses.map((business) => (
        <DropdownMenuItem
          key={business.id}
          onClick={() => setActiveBusiness(business as Business)}
          className="gap-2 p-2"
        >
          <div className="flex size-6 items-center justify-center rounded-sm border">
            <Building className="size-3.5 shrink-0" />
          </div>
          <span className="flex-1 truncate">{business.name}</span>
          {activeBusiness?.id === business.id && (
            <Check className="size-4 text-primary" />
          )}
        </DropdownMenuItem>
      ))}
      <DropdownMenuSeparator />
      <DropdownMenuItem
        onClick={(e) => {
          e.preventDefault()
          handleRefreshBusinesses()
        }}
        className="gap-2 p-2"
        disabled={isLoading}
      >
        <RefreshCw className={`size-4 ${isLoading ? 'animate-spin' : ''}`} />
        <span className="text-muted-foreground">Actualizar lista</span>
      </DropdownMenuItem>
    </DropdownMenuContent>
  )

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu modal={false}>
          {isCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  {triggerButton}
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="right" align="center">
                {activeBusiness?.name || 'Sucursales'}
              </TooltipContent>
            </Tooltip>
          ) : (
            <DropdownMenuTrigger asChild>{triggerButton}</DropdownMenuTrigger>
          )}
          {dropdownContent}
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
