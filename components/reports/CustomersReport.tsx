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
import { KPICard, KPIGrid } from './KPICard'
import { PieChart } from './charts/PieChart'
import { ExportButton } from './ExportButton'
import ReportsService from '@/lib/services/reports/reports-service'
import { formatCurrency } from '@/lib/utils/currency'
import {
  exportCustomersReportAction,
  type ExportFormat,
} from '@/lib/actions/report-export'
import type { CustomerStats } from '@/lib/actions/reports'
import { Users, UserPlus, UserCheck, Crown } from 'lucide-react'
import { FeatureGate } from '../plan/FeatureGate'

interface CustomersReportProps {
  businessId: string
  startDate: Date
  endDate: Date
}

export function CustomersReport({
  businessId,
  startDate,
  endDate,
}: CustomersReportProps) {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<CustomerStats | null>(null)

  const service = useMemo(() => new ReportsService(), [])

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const range = { startDate, endDate }
        const data = await service.getCustomerStats(businessId, range)
        setStats(data)
      } catch (error) {
        console.error('Error fetching customers data:', error)
      } finally {
        setLoading(false)
      }
    }

    if (businessId) {
      fetchData()
    }
  }, [businessId, startDate, endDate, service])

  const retentionRate = stats?.total_customers
    ? ((stats.returning_customers / stats.total_customers) * 100).toFixed(1)
    : '0'

  const chartData = stats
    ? [
        { name: 'Nuevos', value: stats.new_customers },
        { name: 'Recurrentes', value: stats.returning_customers },
      ]
    : []

  const handleExport = useCallback(
    async (format: ExportFormat) => {
      return exportCustomersReportAction(
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
      <KPIGrid>
        <KPICard
          title="Total Clientes"
          value={stats?.total_customers || 0}
          subtitle="Clientes registrados"
          icon={Users}
          loading={loading}
        />
        <KPICard
          title="Nuevos Clientes"
          value={stats?.new_customers || 0}
          subtitle="En el período seleccionado"
          icon={UserPlus}
          loading={loading}
        />
        <KPICard
          title="Clientes Recurrentes"
          value={stats?.returning_customers || 0}
          subtitle="Más de 1 visita"
          icon={UserCheck}
          loading={loading}
        />
        <KPICard
          title="Tasa de Retención"
          value={`${retentionRate}%`}
          subtitle="Clientes que regresan"
          icon={Crown}
          loading={loading}
        />
      </KPIGrid>

      <div className="grid gap-6 md:grid-cols-2">
        <FeatureGate
          module="reports"
          feature="view_charts"
          mode="overlay"
          fallback={
            <div className="p-4 border border-dashed rounded-lg text-center text-sm text-muted-foreground">
              Distribución de Clientes no disponible actualiza tu plan
            </div>
          }
        >
          <PieChart
            data={chartData}
            loading={loading}
            title="Distribución de Clientes"
            formatAsCurrency={false}
          />
        </FeatureGate>

        <FeatureGate
          module="reports"
          feature="view_charts"
          mode="overlay"
          fallback={
            <div className="p-4 border border-dashed rounded-lg text-center text-sm text-muted-foreground">
              Top 10 Clientes no disponible actualiza tu plan
            </div>
          }
        >
          <Card className="border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Crown className="h-4 w-4 text-amber-500" />
                Top 10 Clientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : stats?.top_customers && stats.top_customers.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead className="text-right">Visitas</TableHead>
                      <TableHead className="text-right">
                        Total Gastado
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.top_customers.map((customer, index) => (
                      <TableRow key={customer.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground text-xs font-mono">
                              #{index + 1}
                            </span>
                            <span className="font-medium">
                              {customer.first_name} {customer.last_name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {customer.total_visits}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(customer.total_spent_cents / 100)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  Sin datos disponibles
                </div>
              )}
            </CardContent>
          </Card>
        </FeatureGate>
      </div>
    </div>
  )
}
