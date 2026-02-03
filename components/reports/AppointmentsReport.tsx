'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { KPICard, KPIGrid } from './KPICard'
import {
  HourlyDistributionChart,
  DailyDistributionChart,
} from './charts/DistributionChart'
import { ExportButton } from './ExportButton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import ReportsService from '@/lib/services/reports/reports-service'
import {
  exportAppointmentsReportAction,
  type ExportFormat,
} from '@/lib/actions/report-export'
import type {
  RevenueData,
  HourlyDistribution,
  DailyDistribution,
} from '@/lib/actions/reports'
import { Calendar, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { FeatureGate } from '../plan/FeatureGate'

interface AppointmentsReportProps {
  businessId: string
  startDate: Date
  endDate: Date
}

export function AppointmentsReport({
  businessId,
  startDate,
  endDate,
}: AppointmentsReportProps) {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<RevenueData | null>(null)
  const [hourly, setHourly] = useState<HourlyDistribution[]>([])
  const [daily, setDaily] = useState<DailyDistribution[]>([])

  const service = useMemo(() => new ReportsService(), [])

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const range = { startDate, endDate }
        const [statsData, hourlyData, dailyData] = await Promise.all([
          service.getRevenueStats(businessId, range),
          service.getHourlyDistribution(businessId, range),
          service.getDailyDistribution(businessId, range),
        ])
        setStats(statsData)
        setHourly(hourlyData)
        setDaily(dailyData)
      } catch (error) {
        console.error('Error fetching appointments data:', error)
      } finally {
        setLoading(false)
      }
    }

    if (businessId) {
      fetchData()
    }
  }, [businessId, startDate, endDate, service])

  const completedRate = stats?.total_appointments
    ? (stats.completed_appointments / stats.total_appointments) * 100
    : 0
  const cancelledRate = stats?.total_appointments
    ? (stats.cancelled_appointments / stats.total_appointments) * 100
    : 0
  const noShowRate = stats?.total_appointments
    ? (stats.no_show_appointments / stats.total_appointments) * 100
    : 0

  const handleExport = useCallback(
    async (format: ExportFormat) => {
      return exportAppointmentsReportAction(
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
          title="Total de Citas"
          value={stats?.total_appointments || 0}
          subtitle="En el período seleccionado"
          icon={Calendar}
          loading={loading}
        />
        <KPICard
          title="Completadas"
          value={stats?.completed_appointments || 0}
          subtitle={`${completedRate.toFixed(1)}% del total`}
          icon={CheckCircle}
          loading={loading}
        />
        <KPICard
          title="Canceladas"
          value={stats?.cancelled_appointments || 0}
          subtitle={`${cancelledRate.toFixed(1)}% del total`}
          icon={XCircle}
          loading={loading}
        />
        <KPICard
          title="No Presentadas"
          value={stats?.no_show_appointments || 0}
          subtitle={`${noShowRate.toFixed(1)}% del total`}
          icon={AlertCircle}
          loading={loading}
        />
      </KPIGrid>

      <FeatureGate
        module="reports"
        feature="view_charts"
        mode="overlay"
        fallback={
          <div className="p-4 border border-dashed rounded-lg text-center text-sm text-muted-foreground">
            Estado de citas no disponible actualiza tu plan
          </div>
        }
      >
        <Card className="border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Estado de Citas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Completadas</span>
                <span className="font-medium">{completedRate.toFixed(1)}%</span>
              </div>
              <Progress value={completedRate} className="h-2 bg-gray-100" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Canceladas</span>
                <span className="font-medium">{cancelledRate.toFixed(1)}%</span>
              </div>
              <Progress
                value={cancelledRate}
                className="h-2 bg-gray-100 [&>div]:bg-orange-500"
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">No Presentadas</span>
                <span className="font-medium">{noShowRate.toFixed(1)}%</span>
              </div>
              <Progress
                value={noShowRate}
                className="h-2 bg-gray-100 [&>div]:bg-red-500"
              />
            </div>
          </CardContent>
        </Card>
      </FeatureGate>

      <div className="grid gap-6 md:grid-cols-2">
        <FeatureGate
          module="reports"
          feature="view_charts"
          mode="overlay"
          fallback={
            <div className="p-4 border border-dashed rounded-lg text-center text-sm text-muted-foreground">
              Gráfico de distribución de horarios no disponible actualiza tu
              plan
            </div>
          }
        >
          <HourlyDistributionChart data={hourly} loading={loading} />
        </FeatureGate>

        <FeatureGate
          module="reports"
          feature="view_charts"
          mode="overlay"
          fallback={
            <div className="p-4 border border-dashed rounded-lg text-center text-sm text-muted-foreground">
              Gráfico de distribución de díario no disponible actualiza tu plan
            </div>
          }
        >
          <DailyDistributionChart data={daily} loading={loading} />
        </FeatureGate>
      </div>
    </div>
  )
}
