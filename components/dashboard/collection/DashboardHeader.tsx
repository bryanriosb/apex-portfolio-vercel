'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RefreshCw } from 'lucide-react'

interface DashboardHeaderProps {
  today: string
  isPolling: boolean
  statsLoading: boolean
  onManualRefresh: () => void
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  today,
  isPolling,
  statsLoading,
  onManualRefresh,
}) => {
  return (
    <div className="shrink-0 flex items-center justify-between">
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">
          Tablero - Cobros
        </h1>
        <p className="text-sm text-muted-foreground capitalize">{today}</p>
      </div>
      <div className="flex items-center gap-2">
        {isPolling && (
          <div className="flex items-center gap-2 text-xs">
            <div className="relative flex items-center">
              <div className="h-2 w-2 rounded-full bg-primary" />
              <div className="absolute !h-2.5 !w-2.5 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary animate-ping" />
            </div>
            Actualizaciones en Tiempo Real
          </div>
        )}
      </div>
    </div>
  )
}
