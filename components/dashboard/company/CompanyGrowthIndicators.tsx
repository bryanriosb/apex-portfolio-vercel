'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { fetchCompanyRevenueStatsAction, type CompanyRevenueStats } from '@/lib/actions/company-reports'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface CompanyGrowthIndicatorsProps {
  dateRange: {
    startDate: Date
    endDate: Date
  }
}

function GrowthRow({
  label,
  value,
  isPositive
}: {
  label: string
  value: string
  isPositive: boolean
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`font-semibold flex items-center gap-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {value}
      </span>
    </div>
  )
}

export function CompanyGrowthIndicators({ dateRange }: CompanyGrowthIndicatorsProps) {
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
        console.error('Error fetching growth indicators:', error)
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
            <TrendingUp className="h-4 w-4" />
            Indicadores de Crecimiento
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
            <TrendingUp className="h-4 w-4" />
            Indicadores de Crecimiento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Sin datos disponibles</p>
        </CardContent>
      </Card>
    )
  }

  const revenueGrowth = data.growth_percentage
  const avgPerBusiness = data.avg_revenue_per_business
  const topBusinessRevenue = data.top_performing_business.revenue

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="h-4 w-4" />
          Indicadores de Crecimiento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <GrowthRow
          label="Crecimiento de Ingresos"
          value={`${revenueGrowth >= 0 ? '+' : ''}${revenueGrowth.toFixed(1)}%`}
          isPositive={revenueGrowth >= 0}
        />
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Negocios Activos</span>
          <span className="font-semibold text-blue-600">{data.total_businesses}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Base de Clientes</span>
          <span className="font-semibold">{data.total_customers}</span>
        </div>
      </CardContent>
    </Card>
  )
}
