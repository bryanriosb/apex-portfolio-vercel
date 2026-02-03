'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/utils/currency'
import {
  fetchCompanyBusinessPerformanceAction,
  type CompanyBusinessPerformance,
} from '@/lib/actions/company-reports'
import {
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  BarChart3,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface CompanyBusinessPerformanceProps {
  dateRange: {
    startDate: Date
    endDate: Date
  }
  limit?: number
}

function BusinessItemSkeleton() {
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex items-center space-x-4">
        <Skeleton className="h-8 w-8 rounded-full" />
        <div>
          <Skeleton className="h-4 w-32 mb-2" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <div className="text-right">
        <Skeleton className="h-5 w-20 mb-1" />
        <Skeleton className="h-4 w-16" />
      </div>
    </div>
  )
}

export function CompanyBusinessPerformance({
  dateRange,
  limit = 8,
}: CompanyBusinessPerformanceProps) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<CompanyBusinessPerformance[]>([])

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const result = await fetchCompanyBusinessPerformanceAction(
          dateRange.startDate.toISOString(),
          dateRange.endDate.toISOString(),
          limit
        )
        setData(result)
      } catch (error) {
        console.error('Error fetching company business performance:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [dateRange.startDate, dateRange.endDate, limit])

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Top {limit} Negocios por Ingresos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <BusinessItemSkeleton key={i} />
          ))}
        </CardContent>
      </Card>
    )
  }

  if (!data || data.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Rendimiento por Negocio
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <p className="text-muted-foreground">
              No hay datos de rendimiento disponibles
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Top {limit} Negocios por Ingresos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.map((business, index) => (
            <div
              key={business.business_id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center space-x-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                  {index + 1}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{business.business_name}</h4>
                    {business.is_trial && (
                      <Badge
                        variant="outline"
                        className="text-xs bg-blue-50 text-blue-700 border-blue-200"
                      >
                        TRIAL
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {business.appointments} citas
                    </span>
                    {business.customers !== undefined &&
                      business.customers > 0 && (
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {business.customers} clientes
                        </span>
                      )}
                  </div>
                </div>
              </div>

              <div className="text-right space-y-1">
                <div className="text-lg font-semibold">
                  {formatCurrency(business.revenue / 100)}
                </div>
                {business.growth_percentage !== undefined &&
                  business.growth_percentage !== 0 && (
                    <Badge
                      variant={
                        business.growth_percentage >= 0
                          ? 'default'
                          : 'secondary'
                      }
                      className={cn(
                        'text-xs',
                        business.growth_percentage >= 0
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      )}
                    >
                      {business.growth_percentage >= 0 ? (
                        <TrendingUp className="h-3 w-3 mr-1" />
                      ) : (
                        <TrendingDown className="h-3 w-3 mr-1" />
                      )}
                      {Math.abs(business.growth_percentage).toFixed(1)}%
                    </Badge>
                  )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
