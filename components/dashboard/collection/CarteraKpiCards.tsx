'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Wallet,
  HandCoins,
  MessagesSquare,
  Bot,
  UserCheck,
  Timer,
} from 'lucide-react'
import {
  AnimatedNumber,
  AnimatedPercentage,
} from '@/components/ui/animated-number'
import { formatCurrency } from '@/lib/utils/currency'
import type {
  GeneralKpis,
  AgingKpis,
} from '@/lib/actions/collection/metrics'

interface CarteraKpiCardsProps {
  generalKpis: GeneralKpis | null
  agingKpis: AgingKpis | null
  loading: boolean
}

const formatResponseTime = (ms: number) => {
  if (ms <= 0) return '—'
  if (ms < 1000) return `${Math.round(ms)} ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`
  return `${(ms / 60_000).toFixed(1)} min`
}

export const CarteraKpiCards: React.FC<CarteraKpiCardsProps> = ({
  generalKpis,
  agingKpis,
  loading,
}) => {
  const promiseCoverage =
    agingKpis && agingKpis.total_outstanding > 0
      ? (agingKpis.total_with_promise / agingKpis.total_outstanding) * 100
      : 0

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="rounded-none border">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Cartera Vencida
          </CardTitle>
          <Wallet className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-8 w-32" />
          ) : (
            <>
              <div className="text-2xl font-bold text-primary">
                {formatCurrency(agingKpis?.total_outstanding || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Facturas pendientes con mora
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-none border">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Con Promesa de Pago
          </CardTitle>
          <HandCoins className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-8 w-32" />
          ) : (
            <>
              <div className="text-2xl font-bold">
                {formatCurrency(agingKpis?.total_with_promise || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                <AnimatedPercentage value={promiseCoverage} /> de la cartera
                vencida
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-none border">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Interacciones Gestionadas
          </CardTitle>
          <MessagesSquare className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <>
              <div className="text-2xl font-bold">
                <AnimatedNumber value={generalKpis?.total_interactions || 0} />
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Timer className="h-3 w-3" />
                Respuesta promedio:{' '}
                {formatResponseTime(generalKpis?.avg_response_time_ms || 0)}
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-none border">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Resolución Automática
          </CardTitle>
          <Bot className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <>
              <div className="text-2xl font-bold text-primary">
                <AnimatedPercentage
                  value={(generalKpis?.auto_resolution_rate || 0) * 100}
                />
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <UserCheck className="h-3 w-3" />
                Intervención humana:{' '}
                {((generalKpis?.hitl_rate || 0) * 100).toFixed(1)}%
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
