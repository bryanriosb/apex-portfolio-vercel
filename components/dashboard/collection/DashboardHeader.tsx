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
                    <Badge variant="outline" className="text-xs animate-pulse">
                        <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                        Realtime
                    </Badge>
                )}
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onManualRefresh}
                    disabled={statsLoading}
                >
                    <RefreshCw
                        className={`h-4 w-4 mr-2 ${statsLoading ? 'animate-spin' : ''}`}
                    />
                    Actualizar
                </Button>
            </div>
        </div>
    )
}
