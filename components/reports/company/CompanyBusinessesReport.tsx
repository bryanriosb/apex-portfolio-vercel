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
  Building2,
  TrendingUp,
  TrendingDown,
  Calendar,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface CompanyBusinessesReportProps {
  startDate: Date
  endDate: Date
}

function BusinessRowSkeleton() {
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div>
          <Skeleton className="h-4 w-40 mb-2" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <Skeleton className="h-6 w-24" />
    </div>
  )
}

export function CompanyBusinessesReport({
  startDate,
  endDate,
}: CompanyBusinessesReportProps) {
  const [loading, setLoading] = useState(true)
  const [businesses, setBusinesses] = useState<CompanyBusinessPerformance[]>([])

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const data = await fetchCompanyBusinessPerformanceAction(
          startDate.toISOString(),
          endDate.toISOString(),
          20
        )
        setBusinesses(data)
      } catch (error) {
        console.error('Error fetching businesses report:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [startDate, endDate])

  const totalRevenue = businesses.reduce((sum, b) => sum + b.revenue, 0)
  const totalAppointments = businesses.reduce(
    (sum, b) => sum + b.appointments,
    0
  )

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Negocios
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{businesses.length}</div>
                <p className="text-xs text-muted-foreground">
                  negocios activos
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Ingresos Consolidados
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {formatCurrency(totalRevenue / 100)}
                </div>
                <p className="text-xs text-muted-foreground">en el período</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Citas</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{totalAppointments}</div>
                <p className="text-xs text-muted-foreground">
                  citas completadas
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Rendimiento por Negocio
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <BusinessRowSkeleton key={i} />
              ))}
            </div>
          ) : businesses.length > 0 ? (
            <div className="space-y-4">
              {businesses.map((business, index) => {
                const percentage =
                  totalRevenue > 0 ? (business.revenue / totalRevenue) * 100 : 0
                return (
                  <div
                    key={business.business_id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <h4 className="font-medium">
                          {business.business_name}
                        </h4>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
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
                          <span className="text-xs">
                            ({percentage.toFixed(1)}% del total)
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-lg font-semibold">
                        {formatCurrency(business.revenue / 100)}
                      </div>
                      {business.growth_percentage !== undefined &&
                        business.growth_percentage !== 0 && (
                          <Badge
                            variant="secondary"
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
                )
              })}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No hay datos de negocios disponibles
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
