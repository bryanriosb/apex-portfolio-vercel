'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, Clock, X } from 'lucide-react'
import { useTrialContext } from './TrialProviderClient'
import { useTrialCheck } from '@/hooks/use-trial-check'
import { cn } from '@/lib/utils'

interface TrialBannerProps {
  className?: string
}

export function TrialBanner({ className }: TrialBannerProps) {
  // Try to use server-loaded data first, fallback to client-side validation
  const serverData = useTrialContext()
  const { isOnTrial, daysRemaining, wasJustExpired, newPlanCode, resetExpiredFlag } = useTrialCheck()
  const [showExpiredNotice, setShowExpiredNotice] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  // Use server data if available, prioritize it over client data
  // If we have initial data from server, use it regardless of loading state
  const actualIsOnTrial = serverData ? serverData.isOnTrial : isOnTrial
  const actualDaysRemaining = serverData ? serverData.daysRemaining : daysRemaining

  useEffect(() => {
    if (wasJustExpired) {
      setShowExpiredNotice(true)
    }
  }, [wasJustExpired])

  const handleDismissExpired = () => {
    setShowExpiredNotice(false)
    resetExpiredFlag()
  }

  if (showExpiredNotice) {
    return (
      <div className={cn(
        'bg-destructive/10 border-destructive/20 border px-4 py-3 flex items-center justify-between',
        className
      )}>
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <div>
            <p className="text-sm font-medium text-destructive">
              Tu período de prueba ha finalizado
            </p>
            <p className="text-xs text-muted-foreground">
              Has sido cambiado al plan {newPlanCode === 'free' ? 'Gratuito' : newPlanCode}.
              Actualiza tu plan para acceder a todas las funcionalidades.
            </p>
          </div>
        </div>
        <button
          onClick={handleDismissExpired}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    )
  }

  if (!actualIsOnTrial || dismissed) {
    return null
  }

  const isUrgent = actualDaysRemaining !== null && actualDaysRemaining <= 3

  return (
    <div className={cn(
      'px-4 py-2 flex items-center justify-between',
      isUrgent ? 'bg-amber-500/10 border-amber-500/20 border' : 'bg-primary/5 border-primary/10 border',
      className
    )}>
      <div className="flex items-center gap-3">
        <Clock className={cn('h-4 w-4', isUrgent ? 'text-amber-500' : 'text-primary')} />
        <p className="text-sm">
          <span className="font-medium">Período de prueba:</span>{' '}
          {actualDaysRemaining !== null ? (
            actualDaysRemaining === 0 ? (
              <span className="text-amber-500 font-medium">Expira hoy</span>
            ) : actualDaysRemaining === 1 ? (
              <span className={isUrgent ? 'text-amber-500' : ''}>1 día restante</span>
            ) : (
              <span className={isUrgent ? 'text-amber-500' : ''}>{actualDaysRemaining} días restantes</span>
            )
          ) : (
            'Activo'
          )}
        </p>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="text-muted-foreground hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
