'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/utils/currency'
import {
  fetchCompanyServiceAnalyticsAction,
  type CompanyServiceAnalytics,
} from '@/lib/actions/company-reports'
import { Scissors, DollarSign, Calendar, TrendingUp } from 'lucide-react'

interface CompanyServicesReportProps {
  startDate: Date
  endDate: Date
  businessId?: string
}

function ServiceRowSkeleton() {
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded" />
        <div>
          <Skeleton className="h-4 w-32 mb-2" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <Skeleton className="h-6 w-20" />
    </div>
  )
}

export function CompanyServicesReport({
  startDate,
  endDate,
  businessId,
}: CompanyServicesReportProps) {
  const [services, setServices] = useState<CompanyServiceAnalytics[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        // For company reports, show global analytics unless specific businessId is provided
        const data = await fetchCompanyServiceAnalyticsAction(
          startDate.toISOString(),
          endDate.toISOString(),
          businessId, // Pass businessId if provided, otherwise show global data
          15
        )
        setServices(data)
      } catch (error) {
        console.error('Error fetching services report:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [startDate, endDate, businessId])

  const totalRevenue = services.reduce((sum, s) => sum + s.total_revenue, 0)
  const totalAppointments = services.reduce(
    (sum, s) => sum + s.total_appointments,
    0
  )

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Servicios Activos
            </CardTitle>
            <Scissors className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{services.length}</div>
                <p className="text-xs text-muted-foreground">
                  servicios con actividad
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Ingresos por Servicios
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {formatCurrency(totalRevenue / 100)}
                </div>
                <p className="text-xs text-muted-foreground">
                  facturado en servicios
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Servicios Realizados
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{totalAppointments}</div>
                <p className="text-xs text-muted-foreground">
                  servicios completados
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Servicios Más Populares
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <ServiceRowSkeleton key={i} />
              ))}
            </div>
          ) : services.length > 0 ? (
            <div className="space-y-4">
              {services.map((service, index) => (
                <div
                  key={service.service_name}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded bg-primary/10 text-primary font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <h4 className="font-medium">{service.service_name}</h4>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{service.total_appointments} realizados</span>
                        <span>
                          Precio prom: {formatCurrency(service.avg_price / 100)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-lg font-semibold">
                      {formatCurrency(service.total_revenue / 100)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {service.popularity_percentage.toFixed(1)}% popularidad
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No hay datos de servicios disponibles
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
