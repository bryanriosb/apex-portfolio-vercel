'use client'

import { ReactNode } from 'react'
import { useFeaturePermission, useFeatureMetadata } from '@/hooks/use-feature-permission'
import type {
  FeaturePermission,
  ModuleCode,
} from '@/lib/models/plan/feature-permissions'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'
import { Skeleton } from '@/components/ui/skeleton'
import { Lock, Sparkles } from 'lucide-react'
import Link from 'next/link'

interface FeatureGateProps {
  module: ModuleCode
  feature: FeaturePermission
  children: ReactNode
  fallback?: ReactNode
  mode?: 'hide' | 'disable' | 'overlay' | 'compact'
  showUpgradeMessage?: boolean
  loadingComponent?: ReactNode
  showLoading?: boolean
}

export function FeatureGate({
  module,
  feature,
  children,
  fallback,
  mode = 'hide',
  showUpgradeMessage = true,
  loadingComponent,
  showLoading = true,
}: FeatureGateProps) {
  const { hasPermission, isLoading } = useFeaturePermission(module, feature)
  const { metadata, isLoading: isMetadataLoading } = useFeatureMetadata(module, feature)

  if (isLoading || (isMetadataLoading && (mode === 'compact' || mode === 'overlay'))) {
    if (!showLoading) return null
    return loadingComponent ? <>{loadingComponent}</> : <DefaultLoadingComponent />
  }

  if (hasPermission) {
    return <>{children}</>
  }

  if (fallback) {
    return <>{fallback}</>
  }

  if (mode === 'hide') {
    return null
  }

  if (mode === 'disable') {
    return (
      <div className="relative opacity-60 pointer-events-none">{children}</div>
    )
  }

  if (mode === 'compact') {
    const featureName = metadata?.name || 'Esta función'
    const featureDescription = metadata?.description
    const requiredPlans =
      metadata?.requiredPlan?.join(', ') || 'profesional o empresarial'

    return (
      <HoverCard>
        <HoverCardTrigger asChild>
          <div className="relative inline-block opacity-50 cursor-not-allowed pointer-events-auto">
            <div className="pointer-events-none">{children}</div>
            <div className="absolute -top-1 -right-0 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-muted border border-border shadow-sm">
              <Lock className="h-3 w-3 text-muted-foreground" />
            </div>
          </div>
        </HoverCardTrigger>
        <HoverCardContent className="w-72" side="top">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-primary" />
              <h4 className="text-sm font-semibold">Función no disponible</h4>
            </div>
            {featureDescription ? (
              <>
                <p className="text-sm text-muted-foreground">
                  {featureDescription}
                </p>
                <p className="text-xs text-muted-foreground">
                  Planes requeridos:{' '}
                  <span className="font-medium text-foreground">
                    {requiredPlans}
                  </span>
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                {featureName} solo está disponible en los planes:{' '}
                <span className="font-medium text-foreground">
                  {requiredPlans}
                </span>
              </p>
            )}
            <Button asChild size="sm" className="w-full">
              <Link href="/admin/suscription">
                <Sparkles className="mr-2 h-4 w-4" />
                Actualizar Plan
              </Link>
            </Button>
          </div>
        </HoverCardContent>
      </HoverCard>
    )
  }

  if (mode === 'overlay') {
    const featureName = metadata?.name || 'Esta función'
    const featureDescription = metadata?.description
    const requiredPlans =
      metadata?.requiredPlan?.join(', ') || 'profesional o empresarial'

    return (
      <div className="relative min-h-[120px]">
        <div className="opacity-40 pointer-events-none blur-sm">{children}</div>
        <div className="absolute inset-0 flex items-center justify-center bg-background/95 backdrop-blur-sm p-4">
          {showUpgradeMessage && (
            <div className="w-full max-w-sm space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Lock className="h-4 w-4 text-primary" />
                <span>Función no disponible</span>
              </div>
              {featureDescription ? (
                <>
                  <p className="text-xs text-muted-foreground">
                    {featureDescription}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Planes requeridos:{' '}
                    <span className="font-medium text-foreground">
                      {requiredPlans}
                    </span>
                  </p>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {featureName} solo está disponible en los planes:{' '}
                  <span className="font-medium text-foreground">
                    {requiredPlans}
                  </span>
                </p>
              )}
              <Button asChild size="sm" className="w-full">
                <Link href="/admin/suscription">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Actualizar Plan
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return null
}

function DefaultLoadingComponent() {
  return (
    <div className="flex items-center justify-center p-4 min-h-[120px]">
      <Skeleton className="h-16 w-full max-w-md" />
    </div>
  )
}

interface FeatureLockedMessageProps {
  module: ModuleCode
  feature: FeaturePermission
  title?: string
  description?: string
}

export function FeatureLockedMessage({
  module,
  feature,
  title,
  description,
}: FeatureLockedMessageProps) {
  const { metadata } = useFeatureMetadata(module, feature)
  const featureName = metadata?.name || 'Esta función'
  const featureDescription = metadata?.description || description
  const requiredPlans =
    metadata?.requiredPlan?.join(', ') || 'profesional o empresarial'

  return (
    <Alert className="border-primary">
      <Lock className="h-4 w-4" />
      <AlertTitle>{title || `${featureName} no disponible`}</AlertTitle>
      <AlertDescription className="mt-2 space-y-3">
        {featureDescription && <p>{featureDescription}</p>}
        <p>
          Esta función solo está disponible en los planes:{' '}
          <strong>{requiredPlans}</strong>
        </p>
        <Button asChild size="sm">
          <Link href="/admin/settings/billing">
            <Sparkles className="mr-2 h-4 w-4" />
            Actualizar Plan
          </Link>
        </Button>
      </AlertDescription>
    </Alert>
  )
}

interface ConditionalFeatureProps {
  module: ModuleCode
  feature: FeaturePermission
  children: ReactNode
  loader?: ReactNode
}

export function ConditionalFeature({
  module,
  feature,
  children,
  loader,
}: ConditionalFeatureProps) {
  const { hasPermission, isLoading } = useFeaturePermission(module, feature)

  if (isLoading) {
    return loader ? <>{loader}</> : null
  }

  if (!hasPermission) {
    return null
  }

  return <>{children}</>
}
