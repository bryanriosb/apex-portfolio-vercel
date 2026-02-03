'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { ExportButton } from './ExportButton'
import ReportsService from '@/lib/services/reports/reports-service'
import { formatCurrency } from '@/lib/utils/currency'
import {
  exportSpecialistsReportAction,
  type ExportFormat,
} from '@/lib/actions/report-export'
import type { SpecialistStats } from '@/lib/actions/reports'
import { FeatureGate } from '../plan/FeatureGate'

interface SpecialistsReportProps {
  businessId: string
  startDate: Date
  endDate: Date
}

function SpecialistCard({
  specialist,
  maxRevenue,
}: {
  specialist: SpecialistStats
  maxRevenue: number
}) {
  const initials = `${specialist.first_name[0]}${
    specialist.last_name?.[0] || ''
  }`.toUpperCase()
  const revenuePercent =
    maxRevenue > 0 ? (specialist.total_revenue / maxRevenue) * 100 : 0

  return (
    <Card className="border">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={specialist.profile_picture_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">
              {specialist.first_name} {specialist.last_name}
            </div>
            <div className="text-sm text-muted-foreground">
              {specialist.total_appointments} citas ·{' '}
              {specialist.completed_appointments} completadas
            </div>
          </div>
          <div className="text-right">
            <div className="font-bold text-primary">
              {formatCurrency(specialist.total_revenue / 100)}
            </div>
            <div className="text-xs text-muted-foreground">ingresos</div>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">
                Participación en ingresos
              </span>
              <span>{revenuePercent.toFixed(1)}%</span>
            </div>
            <Progress value={revenuePercent} className="h-1.5" />
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-muted/50 rounded-md p-2">
              <div className="text-lg font-semibold">
                {specialist.total_appointments}
              </div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
            <div className="bg-green-50 dark:bg-green-950/30 rounded-md p-2">
              <div className="text-lg font-semibold text-green-600">
                {specialist.completed_appointments}
              </div>
              <div className="text-xs text-muted-foreground">Completadas</div>
            </div>
            <div className="bg-red-50 dark:bg-red-950/30 rounded-md p-2">
              <div className="text-lg font-semibold text-red-600">
                {specialist.cancellation_rate.toFixed(1)}%
              </div>
              <div className="text-xs text-muted-foreground">Cancelación</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function SpecialistCardSkeleton() {
  return (
    <Card className="border">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-5 w-32 mb-1" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-6 w-24" />
        </div>
        <div className="mt-4 space-y-3">
          <Skeleton className="h-4 w-full" />
          <div className="grid grid-cols-3 gap-2">
            <Skeleton className="h-16 rounded-md" />
            <Skeleton className="h-16 rounded-md" />
            <Skeleton className="h-16 rounded-md" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function SpecialistsReport({
  businessId,
  startDate,
  endDate,
}: SpecialistsReportProps) {
  const [loading, setLoading] = useState(true)
  const [specialists, setSpecialists] = useState<SpecialistStats[]>([])

  const service = useMemo(() => new ReportsService(), [])

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const range = { startDate, endDate }
        const data = await service.getSpecialistStats(businessId, range)
        setSpecialists(data)
      } catch (error) {
        console.error('Error fetching specialists data:', error)
      } finally {
        setLoading(false)
      }
    }

    if (businessId) {
      fetchData()
    }
  }, [businessId, startDate, endDate, service])

  const maxRevenue = Math.max(...specialists.map((s) => s.total_revenue), 1)
  const totalRevenue = specialists.reduce((sum, s) => sum + s.total_revenue, 0)
  const totalAppointments = specialists.reduce(
    (sum, s) => sum + s.total_appointments,
    0
  )

  const handleExport = useCallback(
    async (format: ExportFormat) => {
      return exportSpecialistsReportAction(
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
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
        <Card className="border">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">
              Total Especialistas
            </div>
            <div className="text-2xl font-bold mt-1">
              {loading ? <Skeleton className="h-8 w-12" /> : specialists.length}
            </div>
          </CardContent>
        </Card>
        <Card className="border">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Total Citas</div>
            <div className="text-2xl font-bold mt-1">
              {loading ? <Skeleton className="h-8 w-16" /> : totalAppointments}
            </div>
          </CardContent>
        </Card>
        <Card className="border col-span-2 lg:col-span-1">
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

      <FeatureGate
        module="reports"
        feature="view_charts"
        mode="overlay"
        fallback={
          <div className="p-4 border border-dashed rounded-lg text-center text-sm text-muted-foreground">
            Rendimiento por Especialista no disponible actualiza tu plan
          </div>
        }
      >
        <Card className="border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              Rendimiento por Especialista
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="grid gap-4 md:grid-cols-2">
                {[...Array(4)].map((_, i) => (
                  <SpecialistCardSkeleton key={i} />
                ))}
              </div>
            ) : specialists.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {specialists.map((specialist) => (
                  <SpecialistCard
                    key={specialist.specialist_id}
                    specialist={specialist}
                    maxRevenue={maxRevenue}
                  />
                ))}
              </div>
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
