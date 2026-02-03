'use client'

import { ReactNode } from 'react'
import { useModuleAccess, type ModuleCode } from '@/hooks/use-plan-access'
import { useCanCreate, type LimitType } from '@/hooks/use-plan-limits'
import { UpgradePrompt, LimitReachedPrompt } from './UpgradePrompt'
import { Skeleton } from '@/components/ui/skeleton'

export interface PageGateProps {
  moduleCode: ModuleCode
  children: ReactNode
  moduleName?: string
  requireWrite?: boolean
}

/**
 * Componente para proteger páginas completas basado en acceso al módulo
 * Muestra un UpgradePrompt a pantalla completa si no hay acceso
 */
export function PageGate({
  moduleCode,
  children,
  moduleName,
  requireWrite = false,
}: PageGateProps) {
  const access = useModuleAccess(moduleCode)

  if (access.isLoading) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  const hasRequiredAccess = access.hasAccess && (!requireWrite || access.canWrite)

  if (!hasRequiredAccess) {
    const displayModuleName = moduleName || getModuleDisplayName(moduleCode)
    return (
      <div className="flex-1 p-6">
        <UpgradePrompt moduleName={displayModuleName} variant="full" />
      </div>
    )
  }

  return <>{children}</>
}

export interface CreateButtonGateProps {
  resourceType: 'product' | 'service' | 'customer' | 'specialist' | 'business' | 'appointment'
  children: ReactNode
  fallback?: ReactNode
  showLimitBanner?: boolean
}

/**
 * Componente para proteger botones de crear basado en límites del plan
 * Oculta o deshabilita el botón si se alcanzó el límite
 */
export function CreateButtonGate({
  resourceType,
  children,
  fallback,
  showLimitBanner = false,
}: CreateButtonGateProps) {
  const { canCreate, limitInfo } = useCanCreate(resourceType)

  if (limitInfo.isLoading) {
    return <Skeleton className="h-10 w-32" />
  }

  if (!canCreate) {
    if (fallback) {
      return <>{fallback}</>
    }

    if (showLimitBanner && limitInfo.limit !== null) {
      return (
        <LimitReachedPrompt
          resourceName={getResourceDisplayName(resourceType)}
          currentCount={limitInfo.current}
          limit={limitInfo.limit}
          variant="inline"
        />
      )
    }

    return null
  }

  return <>{children}</>
}

export interface WritePermissionGateProps {
  moduleCode: ModuleCode
  children: ReactNode
  fallback?: ReactNode
}

/**
 * Componente para proteger acciones de escritura
 * Oculta el contenido si el usuario solo tiene permiso de lectura
 */
export function WritePermissionGate({
  moduleCode,
  children,
  fallback,
}: WritePermissionGateProps) {
  const access = useModuleAccess(moduleCode)

  if (access.isLoading) {
    return <Skeleton className="h-10 w-32" />
  }

  if (!access.canWrite) {
    return fallback ? <>{fallback}</> : null
  }

  return <>{children}</>
}

export interface DeletePermissionGateProps {
  moduleCode: ModuleCode
  children: ReactNode
  fallback?: ReactNode
}

/**
 * Componente para proteger acciones de eliminación
 */
export function DeletePermissionGate({
  moduleCode,
  children,
  fallback,
}: DeletePermissionGateProps) {
  const access = useModuleAccess(moduleCode)

  if (access.isLoading) {
    return <Skeleton className="h-10 w-24" />
  }

  if (!access.canDelete) {
    return fallback ? <>{fallback}</> : null
  }

  return <>{children}</>
}

// Helpers
function getModuleDisplayName(moduleCode: ModuleCode): string {
  const names: Record<ModuleCode, string> = {
    dashboard: 'Tablero',
    appointments: 'Citas',
    services: 'Servicios',
    products: 'Productos',
    inventory: 'Inventario',
    specialists: 'Especialistas',
    customers: 'Clientes',
    medical_records: 'Historias Clínicas',
    commissions: 'Comisiones',
    reports: 'Reportes',
    invoices: 'Facturas',
    ai_assistant: 'Asistente IA',
    whatsapp: 'WhatsApp',
    settings: 'Configuración',
  }
  return names[moduleCode] || moduleCode
}

function getResourceDisplayName(resourceType: string): string {
  const names: Record<string, string> = {
    product: 'productos',
    service: 'servicios',
    customer: 'clientes',
    specialist: 'especialistas',
    business: 'sucursales',
    appointment: 'citas',
  }
  return names[resourceType] || resourceType
}
