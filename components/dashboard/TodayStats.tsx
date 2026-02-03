'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { formatCurrency } from '@/lib/utils/currency'
import {
  fetchTodayStatsAction,
  fetchComparisonStatsAction,
  type TodayStats as TodayStatsType,
  type ComparisonStats,
} from '@/lib/actions/dashboard'
import { fetchPendingBalanceStatsAction } from '@/lib/actions/appointment-payment'
import {
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  AlertCircle,
  Wallet,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface TodayStatsProps {
  businessId: string
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  loading,
  highlight,
}: {
  title: string
  value: string | number
  subtitle?: string
  icon: any
  trend?: { value: number; label: string }
  loading?: boolean
  highlight?: 'success' | 'warning' | 'default'
}) {
  if (loading) {
    return (
      <Card className="border">
        <CardContent className="p-4">
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-8 w-32 mb-1" />
          <Skeleton className="h-3 w-20" />
        </CardContent>
      </Card>
    )
  }

  const highlightClasses = {
    success:
      'border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20',
    warning:
      'border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20',
    default: 'border',
  }

  return (
    <Card className={cn(highlightClasses[highlight || 'default'])}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{title}</span>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="mt-2">
          <span className="text-2xl font-bold">{value}</span>
        </div>
        <div className="flex items-center justify-between mt-1">
          {subtitle && (
            <span className="text-xs text-muted-foreground">{subtitle}</span>
          )}
          {trend && (
            <span
              className={cn(
                'flex items-center text-xs font-medium',
                trend.value >= 0 ? 'text-green-600' : 'text-red-600'
              )}
            >
              {trend.value >= 0 ? (
                <TrendingUp className="h-3 w-3 mr-0.5" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-0.5" />
              )}
              {Math.abs(trend.value).toFixed(0)}% {trend.label}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function TodayStats({ businessId }: TodayStatsProps) {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<TodayStatsType | null>(null)
  const [comparison, setComparison] = useState<ComparisonStats | null>(null)
  const [pendingBalance, setPendingBalance] = useState<{
    total_pending_cents: number
    appointments_with_balance: number
  } | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const [todayData, comparisonData, balanceData] = await Promise.all([
          fetchTodayStatsAction(businessId),
          fetchComparisonStatsAction(businessId),
          fetchPendingBalanceStatsAction(businessId),
        ])
        setStats(todayData)
        setComparison(comparisonData)
        setPendingBalance(balanceData)
      } catch (error) {
        console.error('Error fetching today stats:', error)
      } finally {
        setLoading(false)
      }
    }

    if (businessId) {
      fetchData()
    }
  }, [businessId])

  const pendingCount = stats?.pending_appointments || 0
  const hasUnconfirmed = pendingCount > 0
  const hasPendingBalance = (pendingBalance?.total_pending_cents || 0) > 0

  return (
    <div className="space-y-4">
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="Citas de hoy confirmadas"
          value={stats?.total_appointments || 0}
          subtitle={`${stats?.completed_appointments || 0} completadas`}
          icon={Calendar}
          trend={
            comparison
              ? { value: comparison.appointments_change, label: 'vs ayer' }
              : undefined
          }
          loading={loading}
        />
        <StatCard
          title="Ingresos Esperados"
          value={formatCurrency((stats?.expected_revenue || 0) / 100)}
          subtitle={`${formatCurrency(
            (stats?.realized_revenue || 0) / 100
          )} realizados`}
          icon={DollarSign}
          trend={
            comparison
              ? { value: comparison.revenue_change, label: 'vs ayer' }
              : undefined
          }
          loading={loading}
        />
        <StatCard
          title="Por Confirmar"
          value={stats?.pending_appointments || 0}
          subtitle="Requieren atención"
          icon={Clock}
          loading={loading}
          highlight={hasUnconfirmed ? 'warning' : 'default'}
        />
        <StatCard
          title="Confirmadas"
          value={stats?.confirmed_appointments || 0}
          subtitle="Listas para atender"
          icon={CheckCircle2}
          loading={loading}
          highlight={
            (stats?.confirmed_appointments || 0) > 0 ? 'success' : 'default'
          }
        />
        <StatCard
          title="Cartera Pendiente"
          value={formatCurrency(
            (pendingBalance?.total_pending_cents || 0) / 100
          )}
          subtitle={`${
            pendingBalance?.appointments_with_balance || 0
          } citas con saldo`}
          icon={Wallet}
          loading={loading}
          highlight={hasPendingBalance ? 'warning' : 'default'}
        />
      </div>

      {/* Progress de ocupación */}
      <Card className="border">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Estado del Día</span>
            </div>
            {loading ? (
              <Skeleton className="h-4 w-20" />
            ) : (
              <span className="text-sm text-muted-foreground">
                {stats?.completed_appointments || 0} de{' '}
                {stats?.total_appointments || 0} completadas
              </span>
            )}
          </div>
          {loading ? (
            <Skeleton className="h-2 w-full" />
          ) : (
            <Progress
              value={
                stats?.total_appointments
                  ? (stats.completed_appointments / stats.total_appointments) *
                    100
                  : 0
              }
              className="h-2"
            />
          )}
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>{stats?.cancelled_appointments || 0} canceladas/no-show</span>
            <span>
              Semana:{' '}
              {formatCurrency((comparison?.this_week_revenue || 0) / 100)}
              {comparison && comparison.week_revenue_change !== 0 && (
                <span
                  className={cn(
                    'ml-1',
                    comparison.week_revenue_change >= 0
                      ? 'text-green-600'
                      : 'text-red-600'
                  )}
                >
                  ({comparison.week_revenue_change >= 0 ? '+' : ''}
                  {comparison.week_revenue_change.toFixed(0)}%)
                </span>
              )}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
