'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { fetchCompanyOperationalMetricsAction, type CompanyOperationalMetrics } from '@/lib/actions/company-reports'
import { BarChart3, XCircle, Clock, UserCircle } from 'lucide-react'

interface CompanyOperationalMetricsProps {
  dateRange: {
    startDate: Date
    endDate: Date
  }
}

function MetricRow({
  label,
  value,
  highlight
}: {
  label: string
  value: string | number
  highlight?: 'success' | 'warning' | 'error'
}) {
  const highlightClasses = {
    success: 'text-green-600',
    warning: 'text-yellow-600',
    error: 'text-red-600'
  }

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`font-semibold ${highlight ? highlightClasses[highlight] : ''}`}>
        {value}
      </span>
    </div>
  )
}

export function CompanyOperationalMetrics({ dateRange }: CompanyOperationalMetricsProps) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<CompanyOperationalMetrics | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const result = await fetchCompanyOperationalMetricsAction(
          dateRange.startDate.toISOString(),
          dateRange.endDate.toISOString()
        )
        setData(result)
      } catch (error) {
        console.error('Error fetching operational metrics:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [dateRange.startDate, dateRange.endDate])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4" />
            Métricas Operativas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4" />
            Métricas Operativas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Sin datos disponibles</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-4 w-4" />
          Métricas Operativas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <MetricRow
          label="Tasa de Ocupación"
          value={`${data.avg_occupancy_rate.toFixed(0)}%`}
          highlight={data.avg_occupancy_rate >= 70 ? 'success' : 'warning'}
        />
        <MetricRow
          label="Cancelaciones"
          value={`${data.cancellation_rate.toFixed(1)}%`}
          highlight={data.cancellation_rate <= 5 ? 'success' : data.cancellation_rate <= 10 ? 'warning' : 'error'}
        />
        <MetricRow
          label="Especialistas Activos"
          value={`${data.active_specialists_today}/${data.total_specialists}`}
          highlight={data.active_specialists_today > 0 ? 'success' : 'warning'}
        />
      </CardContent>
    </Card>
  )
}
