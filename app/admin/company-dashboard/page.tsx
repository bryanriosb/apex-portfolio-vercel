'use client'

import { useState, useMemo } from 'react'
import { useCurrentUser } from '@/hooks/use-current-user'
import { CompanyRevenueOverview } from '@/components/dashboard/company/CompanyRevenueOverview'
import { CompanyBusinessPerformance } from '@/components/dashboard/company/CompanyBusinessPerformance'
import { CompanyOperationalMetrics } from '@/components/dashboard/company/CompanyOperationalMetrics'
import { CompanyGrowthIndicators } from '@/components/dashboard/company/CompanyGrowthIndicators'
import { CompanyServiceAnalytics } from '@/components/dashboard/company/CompanyServiceAnalytics'
import { CompanyDashboardSkeleton } from '@/components/dashboard/company/CompanyDashboardSkeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getDateRangeFromPreset, type DatePreset } from '@/components/reports/ReportDateFilter'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { DateRange } from 'react-day-picker'

export default function CompanyDashboardPage() {
  const { isLoading, role } = useCurrentUser()
  const [activePreset, setActivePreset] = useState<DatePreset>('month')
  const [dateRange, setDateRange] = useState<DateRange | undefined>(
    getDateRangeFromPreset('month')
  )

  const dateRangeProps = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) {
      const defaultRange = getDateRangeFromPreset('month')
      return {
        startDate: defaultRange.from!,
        endDate: defaultRange.to!,
      }
    }
    return {
      startDate: dateRange.from,
      endDate: dateRange.to,
    }
  }, [dateRange])

  const today = format(new Date(), "EEEE, d 'de' MMMM", { locale: es })

  if (isLoading) {
    return <CompanyDashboardSkeleton />
  }

  if (role !== 'company_admin') {
    return (
      <div className="flex flex-col gap-6 w-full overflow-auto">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Dashboard Ejecutivo
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            No tienes permisos para acceder a esta sección
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6 w-full h-full min-h-[calc(100vh-120px)]">
      <div className="shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">
              Dashboard Ejecutivo
            </h1>
            <p className="text-sm text-muted-foreground capitalize">{today}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Vista consolidada de toda tu plataforma SaaS
            </p>
          </div>

          <div className="shrink-0">
            <select
              value={activePreset}
              onChange={(e) => {
                const preset = e.target.value as DatePreset
                setActivePreset(preset)
                setDateRange(getDateRangeFromPreset(preset))
              }}
              className="px-3 py-2 border border-input rounded-md text-sm bg-background"
            >
              <option value="today">Hoy</option>
              <option value="week">Esta semana</option>
              <option value="month">Este mes</option>
              <option value="last_month">Mes pasado</option>
            </select>
          </div>
        </div>
      </div>

      <div className="shrink-0">
        <CompanyRevenueOverview dateRange={dateRangeProps} />
      </div>

      <div className="flex-1 grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-3 auto-rows-min">
        <div className="lg:col-span-2">
          <CompanyBusinessPerformance dateRange={dateRangeProps} limit={8} />
        </div>

        <div className="space-y-4 sm:space-y-6">
          <CompanyOperationalMetrics dateRange={dateRangeProps} />
          <CompanyGrowthIndicators dateRange={dateRangeProps} />
        </div>
      </div>

      <div className="shrink-0">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">Vista General</TabsTrigger>
            <TabsTrigger value="services">Servicios</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Análisis Ejecutivo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Fortalezas</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Crecimiento consistente</li>
                      <li>• Alta tasa de ocupación</li>
                      <li>• Base de clientes en expansión</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Oportunidades</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Reducir tasa de cancelaciones</li>
                      <li>• Expandir a más ciudades</li>
                      <li>• Optimizar servicios populares</li>
                    </ul>
                  </div>
                   <div className="space-y-2">
                     <h4 className="font-semibold text-sm">Acciones Prioritarias</h4>
                     <ul className="text-sm text-muted-foreground space-y-1">
                       <li>• Monitorear cuentas con bajo rendimiento</li>
                       <li>• Implementar programa de retención</li>
                     </ul>
                   </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>



           <TabsContent value="services" className="mt-6">
             <CompanyServiceAnalytics dateRange={dateRangeProps} />
           </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
