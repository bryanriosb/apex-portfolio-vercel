'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { KPICard, KPIGrid } from './KPICard'
import { RevenueChart } from './charts/RevenueChart'
import { PieChart } from './charts/PieChart'
import { ExportButton } from './ExportButton'
import ReportsService from '@/lib/services/reports/reports-service'
import { formatCurrency } from '@/lib/utils/currency'
import {
  exportRevenueReportAction,
  type ExportFormat,
} from '@/lib/actions/report-export'
import type { RevenueData, RevenueTrendItem } from '@/lib/actions/reports'
import { DollarSign, TrendingUp, CreditCard, Percent } from 'lucide-react'
import { FeatureGate } from '../plan/FeatureGate'

interface RevenueReportProps {
  businessId: string
  startDate: Date
  endDate: Date
}

export function RevenueReport({
  businessId,
  startDate,
  endDate,
}: RevenueReportProps) {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<RevenueData | null>(null)
  const [trend, setTrend] = useState<RevenueTrendItem[]>([])
  const [byService, setByService] = useState<{ name: string; value: number }[]>(
    []
  )
  const [bySpecialist, setBySpecialist] = useState<
    { name: string; value: number }[]
  >([])

  const service = useMemo(() => new ReportsService(), [])

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const range = { startDate, endDate }
        const [statsData, trendData, serviceData, specialistData] =
          await Promise.all([
            service.getRevenueStats(businessId, range),
            service.getRevenueTrend(businessId, range),
            service.getRevenueByService(businessId, range),
            service.getRevenueBySpecialist(businessId, range),
          ])
        setStats(statsData)
        setTrend(trendData)
        setByService(serviceData)
        setBySpecialist(specialistData)
      } catch (error) {
        console.error('Error fetching revenue data:', error)
      } finally {
        setLoading(false)
      }
    }

    if (businessId) {
      fetchData()
    }
  }, [businessId, startDate, endDate, service])

  const completionRate = stats
    ? stats.total_appointments > 0
      ? (
          (stats.completed_appointments / stats.total_appointments) *
          100
        ).toFixed(1)
      : '0'
    : '0'

  const handleExport = useCallback(
    async (format: ExportFormat) => {
      return exportRevenueReportAction(
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
          title="Ingresos Totales"
          value={formatCurrency(
            stats?.total_revenue ? stats.total_revenue / 100 : 0
          )}
          subtitle="En el período seleccionado"
          icon={DollarSign}
          loading={loading}
        />
        <KPICard
          title="Ticket Promedio"
          value={formatCurrency(
            stats?.average_ticket ? stats.average_ticket / 100 : 0
          )}
          subtitle="Por cita completada"
          icon={TrendingUp}
          loading={loading}
        />
        <KPICard
          title="Citas Completadas"
          value={stats?.completed_appointments || 0}
          subtitle={`de ${stats?.total_appointments || 0} totales`}
          icon={CreditCard}
          loading={loading}
        />
        <KPICard
          title="Tasa de Completación"
          value={`${completionRate}%`}
          subtitle="Citas completadas vs totales"
          icon={Percent}
          loading={loading}
        />
      </KPIGrid>

      <FeatureGate
        module="reports"
        feature="view_charts"
        mode="overlay"
        fallback={
          <div className="p-4 border border-dashed rounded-lg text-center text-sm text-muted-foreground">
            Tendencia de ingresos no disponible actualiza tu plan
          </div>
        }
      >
        <RevenueChart data={trend} loading={loading} />
      </FeatureGate>

      <div className="grid gap-6 md:grid-cols-2">
        <FeatureGate
          module="reports"
          feature="view_charts"
          mode="overlay"
          fallback={
            <div className="p-4 border border-dashed rounded-lg text-center text-sm text-muted-foreground">
              Ingreso por servicio no disponible actualiza tu plan
            </div>
          }
        >
          <PieChart
            data={byService}
            loading={loading}
            title="Ingresos por Servicio"
          />
        </FeatureGate>

        <FeatureGate
          module="reports"
          feature="view_charts"
          mode="overlay"
          fallback={
            <div className="p-4 border border-dashed rounded-lg text-center text-sm text-muted-foreground">
              Ingreso por especialista no disponible actualiza tu plan
            </div>
          }
        >
          <PieChart
            data={bySpecialist}
            loading={loading}
            title="Ingresos por Especialista"
          />
        </FeatureGate>
      </div>
    </div>
  )
}
