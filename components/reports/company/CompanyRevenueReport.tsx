'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/utils/currency'
import {
  fetchCompanyRevenueStatsAction,
  fetchCompanyGrowthTrendsAction,
  type CompanyRevenueStats,
  type CompanyGrowthTrend,
} from '@/lib/actions/company-reports'
import { DollarSign, TrendingUp, Building2, Target } from 'lucide-react'

interface CompanyRevenueReportProps {
  startDate: Date
  endDate: Date
}

function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  loading,
}: {
  title: string
  value: string
  subtitle: string
  icon: any
  loading?: boolean
}) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-3 w-20" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  )
}

export function CompanyRevenueReport({
  startDate,
  endDate,
}: CompanyRevenueReportProps) {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<CompanyRevenueStats | null>(null)
  const [trends, setTrends] = useState<CompanyGrowthTrend[]>([])

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const [statsData, trendsData] = await Promise.all([
          fetchCompanyRevenueStatsAction(
            startDate.toISOString(),
            endDate.toISOString()
          ),
          fetchCompanyGrowthTrendsAction(30),
        ])
        setStats(statsData)
        setTrends(trendsData)
      } catch (error) {
        console.error('Error fetching company revenue:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [startDate, endDate])

  const kpis = stats
    ? [
        {
          title: 'Ingresos Totales',
          value: formatCurrency(stats.total_revenue / 100),
          subtitle: `${stats.total_appointments} citas completadas`,
          icon: DollarSign,
        },
        {
          title: 'Crecimiento',
          value: `${
            stats.growth_percentage >= 0 ? '+' : ''
          }${stats.growth_percentage.toFixed(1)}%`,
          subtitle: 'vs período anterior',
          icon: TrendingUp,
        },
        {
          title: 'Negocios Activos',
          value: stats.total_businesses.toString(),
          subtitle: `Prom: ${formatCurrency(
            stats.avg_revenue_per_business / 100
          )}/negocio`,
          icon: Building2,
        },
        {
          title: 'Mejor Negocio',
          value: stats.top_performing_business.name || 'Sin datos',
          subtitle: formatCurrency(stats.top_performing_business.revenue / 100),
          icon: Target,
        },
      ]
    : []

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <KPICard
                key={i}
                title=""
                value=""
                subtitle=""
                icon={DollarSign}
                loading
              />
            ))
          : kpis.map((kpi, i) => (
              <KPICard
                key={i}
                title={kpi.title}
                value={kpi.value}
                subtitle={kpi.subtitle}
                icon={kpi.icon}
              />
            ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tendencia de Ingresos (30 días)</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : trends.length > 0 ? (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground mb-4">
                <span>Últimos 30 días</span>
                <span>
                  Total:{' '}
                  {formatCurrency(
                    trends.reduce((sum, t) => sum + t.revenue, 0) / 100
                  )}
                </span>
              </div>
              <div className="h-48 flex items-end gap-1">
                {trends.map((trend, i) => {
                  const maxRevenue = Math.max(...trends.map((t) => t.revenue))
                  const height =
                    maxRevenue > 0 ? (trend.revenue / maxRevenue) * 100 : 0
                  return (
                    <div
                      key={i}
                      className="flex-1 bg-primary/20 hover:bg-primary/40 transition-colors rounded-t"
                      style={{ height: `${Math.max(height, 2)}%` }}
                      title={`${trend.date}: ${formatCurrency(
                        trend.revenue / 100
                      )}`}
                    />
                  )
                })}
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{trends[0]?.date}</span>
                <span>{trends[trends.length - 1]?.date}</span>
              </div>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No hay datos de tendencias disponibles
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
