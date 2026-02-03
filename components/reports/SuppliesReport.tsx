'use client'

import { useEffect, useState, useMemo } from 'react'
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
import {
  fetchSupplyConsumptionStatsAction,
  fetchSupplyConsumptionTrendAction,
  type SupplyConsumptionSummary,
  type SupplyConsumptionTrendItem,
} from '@/lib/actions/reports'
import { formatCurrency } from '@/lib/utils/currency'
import { PieChart } from './charts/PieChart'
import { RevenueChart } from './charts/RevenueChart'

interface SuppliesReportProps {
  businessId: string
  startDate: Date
  endDate: Date
}

export function SuppliesReport({
  businessId,
  startDate,
  endDate,
}: SuppliesReportProps) {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<SupplyConsumptionSummary | null>(null)
  const [trend, setTrend] = useState<SupplyConsumptionTrendItem[]>([])

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const params = {
          business_id: businessId,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
        }
        const [statsData, trendData] = await Promise.all([
          fetchSupplyConsumptionStatsAction(params),
          fetchSupplyConsumptionTrendAction(params),
        ])
        setStats(statsData)
        setTrend(trendData)
      } catch (error) {
        console.error('Error fetching supplies data:', error)
      } finally {
        setLoading(false)
      }
    }

    if (businessId) {
      fetchData()
    }
  }, [businessId, startDate, endDate])

  const chartDataByCost = useMemo(() => {
    if (!stats) return []
    return stats.top_consumed.slice(0, 5).map((s) => ({
      name: s.product_name,
      value: s.total_cost_cents,
    }))
  }, [stats])

  const chartDataByQuantity = useMemo(() => {
    if (!stats) return []
    return stats.top_consumed.slice(0, 5).map((s) => ({
      name: s.product_name,
      value: s.total_consumed,
    }))
  }, [stats])

  const trendChartData = useMemo(() => {
    return trend.map((item) => ({
      date: item.date,
      revenue: item.total_cost_cents,
      appointments: item.consumption_count,
    }))
  }, [trend])

  return (
    <div className="space-y-6">
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
        <Card className="border">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">
              Costo Total Consumos
            </div>
            <div className="text-2xl font-bold mt-1">
              {loading ? (
                <Skeleton className="h-8 w-28" />
              ) : (
                formatCurrency((stats?.total_consumption_cost || 0) / 100)
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="border">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">
              Total Movimientos
            </div>
            <div className="text-2xl font-bold mt-1">
              {loading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                stats?.total_movements || 0
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="border">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Insumos Únicos</div>
            <div className="text-2xl font-bold mt-1">
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                stats?.unique_products_consumed || 0
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {trendChartData.length > 0 && (
        <RevenueChart
          data={trendChartData}
          loading={loading}
          title="Tendencia de Consumo"
        />
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <PieChart
          data={chartDataByCost}
          loading={loading}
          title="Top 5 por Costo"
          formatAsCurrency={true}
        />
        <PieChart
          data={chartDataByQuantity}
          loading={loading}
          title="Top 5 por Cantidad"
          formatAsCurrency={false}
        />
      </div>

      <Card className="border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Detalle de Consumos</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : stats && stats.top_consumed.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[35%]">Insumo</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead className="text-right">Usos</TableHead>
                  <TableHead className="text-right">Costo Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.top_consumed.map((s, index) => (
                  <TableRow key={s.product_id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-xs font-mono">
                          #{index + 1}
                        </span>
                        <span className="font-medium">{s.product_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {s.category_name ? (
                        <Badge variant="secondary" className="font-normal">
                          {s.category_name}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {s.total_consumed.toFixed(2)} {s.unit_abbreviation}
                    </TableCell>
                    <TableCell className="text-right">
                      {s.appointment_count}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(s.total_cost_cents / 100)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              Sin datos de consumo para el período seleccionado
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
