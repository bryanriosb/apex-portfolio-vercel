'use client'

import { Lock, Crown, ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import Link from 'next/link'

export interface UpgradePromptProps {
  title?: string
  description?: string
  moduleName?: string
  featureName?: string
  variant?: 'full' | 'compact' | 'inline' | 'banner'
  showUpgradeButton?: boolean
  upgradeUrl?: string
  className?: string
}

export function UpgradePrompt({
  title,
  description,
  moduleName,
  featureName,
  variant = 'full',
  showUpgradeButton = true,
  upgradeUrl = '/admin/plans',
  className = '',
}: UpgradePromptProps) {
  const displayTitle =
    title ||
    (moduleName
      ? `Acceso a ${moduleName} no disponible`
      : featureName
        ? `${featureName} no disponible`
        : 'Función no disponible')

  const displayDescription =
    description ||
    (moduleName
      ? `Tu plan actual no incluye acceso al módulo de ${moduleName}. Actualiza tu plan para desbloquear esta funcionalidad.`
      : featureName
        ? `Tu plan actual no incluye ${featureName}. Actualiza tu plan para acceder a esta característica.`
        : 'Esta función no está disponible en tu plan actual. Actualiza para desbloquear más funcionalidades.')

  if (variant === 'banner') {
    return (
      <div
        className={`flex items-center justify-between bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg px-4 py-3 ${className}`}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 rounded-full">
            <Crown className="h-4 w-4 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-amber-800">{displayTitle}</p>
            <p className="text-xs text-amber-600">{displayDescription}</p>
          </div>
        </div>
        {showUpgradeButton && (
          <Button asChild size="sm" variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-100">
            <Link href={upgradeUrl}>
              Mejorar Plan
              <ArrowRight className="ml-2 h-3 w-3" />
            </Link>
          </Button>
        )}
      </div>
    )
  }

  if (variant === 'inline') {
    return (
      <div className={`flex items-center gap-2 text-muted-foreground ${className}`}>
        <Lock className="h-4 w-4" />
        <span className="text-sm">{displayTitle}</span>
        {showUpgradeButton && (
          <Button asChild variant="link" size="sm" className="h-auto p-0 text-primary">
            <Link href={upgradeUrl}>Mejorar Plan</Link>
          </Button>
        )}
      </div>
    )
  }

  if (variant === 'compact') {
    return (
      <Card className={`border-dashed ${className}`}>
        <CardContent className="flex items-center gap-4 py-6">
          <div className="p-3 bg-muted rounded-full">
            <Lock className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <h4 className="font-medium">{displayTitle}</h4>
            <p className="text-sm text-muted-foreground">{displayDescription}</p>
          </div>
          {showUpgradeButton && (
            <Button asChild variant="outline">
              <Link href={upgradeUrl}>
                Mejorar Plan
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  // variant === 'full'
  return (
    <div className={`flex items-center justify-center min-h-[400px] ${className}`}>
      <Card className="max-w-md w-full text-center border-dashed">
        <CardHeader>
          <div className="mx-auto mb-4 p-4 bg-gradient-to-br from-amber-100 to-orange-100 rounded-full">
            <Lock className="h-8 w-8 text-amber-600" />
          </div>
          <CardTitle className="text-xl">{displayTitle}</CardTitle>
          <CardDescription className="text-base">{displayDescription}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <span>Desbloquea más funcionalidades con un plan superior</span>
          </div>
          {showUpgradeButton && (
            <Button asChild className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600">
              <Link href={upgradeUrl}>
                <Crown className="mr-2 h-4 w-4" />
                Ver Planes Disponibles
              </Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export interface LimitReachedPromptProps {
  resourceName: string
  currentCount: number
  limit: number
  variant?: 'full' | 'compact' | 'inline' | 'banner'
  showUpgradeButton?: boolean
  upgradeUrl?: string
  className?: string
}

export function LimitReachedPrompt({
  resourceName,
  currentCount,
  limit,
  variant = 'banner',
  showUpgradeButton = true,
  upgradeUrl = '/admin/plans',
  className = '',
}: LimitReachedPromptProps) {
  const title = `Límite de ${resourceName} alcanzado`
  const description = `Has alcanzado el límite de ${limit} ${resourceName} en tu plan actual (${currentCount}/${limit}). Actualiza tu plan para agregar más.`

  return (
    <UpgradePrompt
      title={title}
      description={description}
      variant={variant}
      showUpgradeButton={showUpgradeButton}
      upgradeUrl={upgradeUrl}
      className={className}
    />
  )
}
