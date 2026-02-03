'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { PieChart } from './charts/PieChart'
import { ExportButton } from './ExportButton'
import ReportsService from '@/lib/services/reports/reports-service'
import { formatCurrency } from '@/lib/utils/currency'
import {
  exportServicesReportAction,
  type ExportFormat,
} from '@/lib/actions/report-export'
import type { ServiceStats } from '@/lib/actions/reports'
import { FeatureGate } from '../plan/FeatureGate'

interface ServicesReportProps {
  businessId: string
  startDate: Date
  endDate: Date
}

export function ServicesReport({
  businessId,
  startDate,
  endDate,
}: ServicesReportProps) {
  const [loading, setLoading] = useState(true)
  const [services, setServices] = useState<ServiceStats[]>([])

  const service = useMemo(() => new ReportsService(), [])

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const range = { startDate, endDate }
        const data = await service.getTopServices(businessId, range, 20)
        setServices(data)
      } catch (error) {
        console.error('Error fetching services data:', error)
      } finally {
        setLoading(false)
      }
    }

    if (businessId) {
      fetchData()
    }
  }, [businessId, startDate, endDate, service])

  const totalBookings = services.reduce((sum, s) => sum + s.total_bookings, 0)
  const totalRevenue = services.reduce((sum, s) => sum + s.total_revenue, 0)

  const chartDataByBookings = services.slice(0, 5).map((s) => ({
    name: s.service_name,
    value: s.total_bookings,
  }))

  const chartDataByRevenue = services.slice(0, 5).map((s) => ({
    name: s.service_name,
    value: s.total_revenue,
  }))

  const handleExport = useCallback(
    async (format: ExportFormat) => {
      return exportServicesReportAction(
        {
          business_id: businessId,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
        },
        format
      )
    },
    [businessId, startDate, endDate]
  )

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <ExportButton onExport={handleExport} disabled={loading} />
      </div>
      <div className="grid gap-4 grid-cols-2">
        <Card className="border">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">
              Servicios Realizados
            </div>
            <div className="text-2xl font-bold mt-1">
              {loading ? <Skeleton className="h-8 w-20" /> : totalBookings}
            </div>
          </CardContent>
        </Card>
        <Card className="border">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">
              Ingresos Totales
            </div>
            <div className="text-2xl font-bold mt-1">
              {loading ? (
                <Skeleton className="h-8 w-28" />
              ) : (
                formatCurrency(totalRevenue / 100)
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <FeatureGate
          module="reports"
          feature="view_charts"
          mode="overlay"
          fallback={
            <div className="p-4 border border-dashed rounded-lg text-center text-sm text-muted-foreground">
              Top 5 Más Realizados no disponible actualiza tu plan
            </div>
          }
        >
          <PieChart
            data={chartDataByBookings}
            loading={loading}
            title="Top 5 Más Realizados"
            formatAsCurrency={false}
          />
        </FeatureGate>

        <FeatureGate
          module="reports"
          feature="view_charts"
          mode="overlay"
          fallback={
            <div className="p-4 border border-dashed rounded-lg text-center text-sm text-muted-foreground">
              Top 5 por Ingresos no disponible actualiza tu plan
            </div>
          }
        >
          <PieChart
            data={chartDataByRevenue}
            loading={loading}
            title="Top 5 por Ingresos"
            formatAsCurrency={true}
          />
        </FeatureGate>
      </div>

      <FeatureGate
        module="reports"
        feature="view_charts"
        mode="overlay"
        fallback={
          <div className="p-4 border border-dashed rounded-lg text-center text-sm text-muted-foreground">
            Detalle de Servicios no disponible actualiza tu plan
          </div>
        }
      >
        <Card className="border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Detalle de Servicios</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : services.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40%]">Servicio</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead className="text-right">Realizados</TableHead>
                    <TableHead className="text-right">Ingresos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {services.map((s, index) => (
                    <TableRow key={s.service_id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground text-xs font-mono">
                            #{index + 1}
                          </span>
                          <span className="font-medium">{s.service_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-normal">
                          {s.category_name}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {s.total_bookings}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(s.total_revenue / 100)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                Sin datos para el período seleccionado
              </div>
            )}
          </CardContent>
        </Card>
      </FeatureGate>
    </div>
  )
}
