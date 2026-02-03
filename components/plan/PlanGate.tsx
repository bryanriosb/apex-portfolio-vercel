'use client'

import { ReactNode } from 'react'
import { useModuleAccess, type ModuleCode } from '@/hooks/use-plan-access'
import { useLimitCheck, type LimitType } from '@/hooks/use-plan-limits'
import { UpgradePrompt, LimitReachedPrompt } from './UpgradePrompt'
import { Skeleton } from '@/components/ui/skeleton'

export interface ModuleGateProps {
  moduleCode: ModuleCode
  children: ReactNode
  fallback?: ReactNode
  loadingFallback?: ReactNode
  requireWrite?: boolean
  requireDelete?: boolean
  showUpgradePrompt?: boolean
  upgradePromptVariant?: 'full' | 'compact' | 'inline' | 'banner'
  moduleName?: string
}

/**
 * Componente para proteger contenido basado en acceso al módulo
 */
export function ModuleGate({
  moduleCode,
  children,
  fallback,
  loadingFallback,
  requireWrite = false,
  requireDelete = false,
  showUpgradePrompt = true,
  upgradePromptVariant = 'full',
  moduleName,
}: ModuleGateProps) {
  const access = useModuleAccess(moduleCode)

  if (access.isLoading) {
    return (
      loadingFallback || (
        <div className="flex items-center justify-center min-h-[200px]">
          <Skeleton className="h-32 w-full max-w-md" />
        </div>
      )
    )
  }

  const hasRequiredAccess =
    access.hasAccess &&
    (!requireWrite || access.canWrite) &&
    (!requireDelete || access.canDelete)

  if (!hasRequiredAccess) {
    if (fallback) {
      return <>{fallback}</>
    }

    if (showUpgradePrompt) {
      const displayModuleName = moduleName || getModuleDisplayName(moduleCode)
      return (
        <UpgradePrompt
          moduleName={displayModuleName}
          variant={upgradePromptVariant}
        />
      )
    }

    return null
  }

  return <>{children}</>
}

export interface LimitGateProps {
  limitType: LimitType
  children: ReactNode
  fallback?: ReactNode
  loadingFallback?: ReactNode
  showLimitPrompt?: boolean
  limitPromptVariant?: 'full' | 'compact' | 'inline' | 'banner'
  resourceName?: string
}

/**
 * Componente para proteger contenido basado en límites del plan
 */
export function LimitGate({
  limitType,
  children,
  fallback,
  loadingFallback,
  showLimitPrompt = true,
  limitPromptVariant = 'banner',
  resourceName,
}: LimitGateProps) {
  const limitInfo = useLimitCheck(limitType)

  if (limitInfo.isLoading) {
    return (
      loadingFallback || (
        <div className="flex items-center justify-center p-4">
          <Skeleton className="h-16 w-full max-w-md" />
        </div>
      )
    )
  }

  if (limitInfo.isAtLimit) {
    if (fallback) {
      return <>{fallback}</>
    }

    if (showLimitPrompt && limitInfo.limit !== null) {
      const displayResourceName = resourceName || getLimitDisplayName(limitType)
      return (
        <LimitReachedPrompt
          resourceName={displayResourceName}
          currentCount={limitInfo.current}
          limit={limitInfo.limit}
          variant={limitPromptVariant}
        />
      )
    }

    return null
  }

  return <>{children}</>
}

export interface FeatureGateProps {
  featureCode: string
  children: ReactNode
  fallback?: ReactNode
  loadingFallback?: ReactNode
  showUpgradePrompt?: boolean
  upgradePromptVariant?: 'full' | 'compact' | 'inline' | 'banner'
  featureName?: string
}

/**
 * Componente para proteger contenido basado en features del plan
 */
export function FeatureGate({
  featureCode,
  children,
  fallback,
  loadingFallback,
  showUpgradePrompt = true,
  upgradePromptVariant = 'compact',
  featureName,
}: FeatureGateProps) {
  // Usar el mismo hook pero para features
  const { useFeatureAccess } = require('@/hooks/use-plan-access')
  const { hasAccess, isLoading } = useFeatureAccess(featureCode)

  if (isLoading) {
    return (
      loadingFallback || (
        <div className="flex items-center justify-center p-4">
          <Skeleton className="h-16 w-full max-w-md" />
        </div>
      )
    )
  }

  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>
    }

    if (showUpgradePrompt) {
      const displayFeatureName = featureName || getFeatureDisplayName(featureCode)
      return (
        <UpgradePrompt
          featureName={displayFeatureName}
          variant={upgradePromptVariant}
        />
      )
    }

    return null
  }

  return <>{children}</>
}

// Helpers para nombres de display
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

function getLimitDisplayName(limitType: LimitType): string {
  const names: Record<LimitType, string> = {
    max_appointments_per_month: 'citas por mes',
    max_products: 'productos',
    max_services: 'servicios',
    max_customers: 'clientes',
    max_storage_mb: 'almacenamiento',
    max_businesses: 'sucursales',
    max_users_per_business: 'usuarios',
    max_specialists_per_business: 'especialistas',
  }
  return names[limitType] || limitType
}

function getFeatureDisplayName(featureCode: string): string {
  const names: Record<string, string> = {
    has_custom_branding: 'Personalización de marca',
    has_priority_support: 'Soporte prioritario',
    has_api_access: 'Acceso a API',
  }
  return names[featureCode] || featureCode
}

export { getModuleDisplayName, getLimitDisplayName, getFeatureDisplayName }
