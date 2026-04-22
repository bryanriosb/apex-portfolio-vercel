'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Percent,
  Calendar,
  Banknote,
} from 'lucide-react'
import {
  AnimatedNumber,
  AnimatedPercentage,
} from '@/components/ui/animated-number'
import { RecaudoDashboardStats } from '@/lib/actions/bank-transactions/transaction'

interface RecaudoStatsCardsProps {
  stats: RecaudoDashboardStats | null
  loading: boolean
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export const RecaudoStatsCards: React.FC<RecaudoStatsCardsProps> = ({
  stats,
  loading,
}) => {
  return (
    <div className="space-y-6">
      {/* Main Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-none border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Recaudado (Mes)
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <>
                <div className="text-2xl font-bold text-primary">
                  {formatCurrency(stats?.total_recaudo_mes || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Transacciones del mes actual
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-none border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recaudo Hoy</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {formatCurrency(stats?.today_recaudo || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  <AnimatedNumber value={stats?.today_count || 0} />{' '}
                  transacciones
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-none border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Sin Identificar
            </CardTitle>
            <AlertTriangle
              className={`h-4 w-4 ${(stats?.unidentified_count || 0) > 0 ? 'text-amber-500' : 'text-muted-foreground'}`}
            />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div
                  className={`text-2xl font-bold ${(stats?.unidentified_count || 0) > 0 ? 'text-amber-600' : 'text-primary'}`}
                >
                  <AnimatedNumber value={stats?.unidentified_count || 0} />
                </div>
                <p className="text-xs text-muted-foreground">
                  {(stats?.unidentified_count || 0) > 0
                    ? 'Pendientes de asociar'
                    : 'Todo al día'}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-none border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Tasa Identificación
            </CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div
                  className={`text-2xl font-bold ${
                    (stats?.identification_rate || 0) >= 90
                      ? 'text-primary-600'
                      : (stats?.identification_rate || 0) >= 70
                        ? 'text-yellow-600'
                        : 'text-muted-foreground'
                  }`}
                >
                  <AnimatedPercentage value={stats?.identification_rate || 0} />
                </div>
                <p className="text-xs text-muted-foreground">
                  Transacciones asociadas
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Status Breakdown */}
      {stats?.by_status && Object.keys(stats.by_status).length > 0 && (
        <Card className="rounded-none border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Banknote className="h-4 w-4" />
              Desglose por Estado
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex gap-2">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-6 w-24" />
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {Object.entries(stats.by_status).map(([status, data]) => (
                  <Badge key={status} variant="outline" className="text-xs">
                    {status}: {formatCurrency(data.amount)} ({data.count})
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
