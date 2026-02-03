'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/utils/currency'
import {
  fetchCompanyRevenueStatsAction,
  type CompanyRevenueStats,
} from '@/lib/actions/company-reports'
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Building2,
  Users,
  Target,
  Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface CompanyRevenueOverviewProps {
  dateRange: {
    startDate: Date
    endDate: Date
  }
}

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  highlight,
  loading,
}: {
  title: string
  value: string
  subtitle: string
  icon: any
  trend?: { value: number; positive: boolean }
  highlight?: boolean
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
    <Card className={cn(highlight && 'border-primary/50 bg-primary/5')}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
          <span>{subtitle}</span>
          {trend && (
            <Badge
              variant={trend.positive ? 'default' : 'secondary'}
              className="text-xs"
            >
              {trend.positive ? (
                <TrendingUp className="h-3 w-3 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1" />
              )}
              {trend.value.toFixed(1)}%
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function CompanyRevenueOverview({
  dateRange,
}: CompanyRevenueOverviewProps) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<CompanyRevenueStats | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const result = await fetchCompanyRevenueStatsAction(
          dateRange.startDate.toISOString(),
          dateRange.endDate.toISOString()
        )
        setData(result)
      } catch (error) {
        console.error('Error fetching company revenue stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [dateRange.startDate, dateRange.endDate])

  const metrics = data
    ? [
        {
          title: 'Ingresos Totales',
          value: formatCurrency(data.total_revenue / 100),
          subtitle: `${data.total_appointments} citas completadas`,
          icon: DollarSign,
          trend:
            data.growth_percentage !== 0
              ? {
                  value: Math.abs(data.growth_percentage),
                  positive: data.growth_percentage > 0,
                }
              : undefined,
        },
        {
          title: 'Negocios Activos',
          value: data.total_businesses.toString(),
          subtitle: `Prom: ${formatCurrency(
            data.avg_revenue_per_business / 100
          )}/negocio`,
          icon: Building2,
        },
        {
          title: 'Negocios en Prueba',
          value: data.trial_businesses.toString(),
          subtitle: 'Cuentas en período de evaluación',
          icon: Clock,
        },
        {
          title: 'Base de Clientes',
          value: data.total_customers.toString(),
          subtitle: 'Clientes únicos totales',
          icon: Users,
        },
        {
          title: 'Mejor Performance',
          value: data.top_performing_business.name || 'Sin datos',
          subtitle: formatCurrency(data.top_performing_business.revenue / 100),
          icon: Target,
          highlight: true,
        },
      ]
    : []

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      {loading ? (
        <>
          <MetricCard title="" value="" subtitle="" icon={DollarSign} loading />
          <MetricCard title="" value="" subtitle="" icon={Building2} loading />
          <MetricCard title="" value="" subtitle="" icon={Users} loading />
          <MetricCard title="" value="" subtitle="" icon={Clock} loading />
          <MetricCard title="" value="" subtitle="" icon={Target} loading />
        </>
      ) : metrics.length > 0 ? (
        metrics.map((metric, index) => (
          <MetricCard
            key={index}
            title={metric.title}
            value={metric.value}
            subtitle={metric.subtitle}
            icon={metric.icon}
            trend={metric.trend}
            highlight={metric.highlight}
          />
        ))
      ) : (
        <Card className="md:col-span-2 lg:col-span-5">
          <CardContent className="flex items-center justify-center h-32">
            <p className="text-muted-foreground">
              No se pudieron cargar los datos
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
