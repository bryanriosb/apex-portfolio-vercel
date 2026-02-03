'use client'

import { DateRange } from 'react-day-picker'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ReportDateFilter,
  type DatePreset,
} from '@/components/reports/ReportDateFilter'
import { CompanyRevenueReport } from './CompanyRevenueReport'
import { CompanyBusinessesReport } from './CompanyBusinessesReport'
import { CompanyServicesReport } from './CompanyServicesReport'
import { DollarSign, Building2, Scissors, TrendingUp } from 'lucide-react'

interface CompanyReportsViewProps {
  dateRange: DateRange | undefined
  onDateRangeChange: (range: DateRange | undefined) => void
  activePreset: DatePreset
  onPresetChange: (preset: DatePreset) => void
  dateRangeProps: {
    startDate: Date
    endDate: Date
  }
}

export function CompanyReportsView({
  dateRange,
  onDateRangeChange,
  activePreset,
  onPresetChange,
  dateRangeProps
}: CompanyReportsViewProps) {
  return (
    <div className="flex flex-col gap-6 w-full overflow-auto">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Reportes Ejecutivos
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Análisis consolidado de toda la plataforma
          </p>
        </div>
        <ReportDateFilter
          dateRange={dateRange}
          onDateRangeChange={onDateRangeChange}
          activePreset={activePreset}
          onPresetChange={onPresetChange}
        />
      </div>

      <Tabs defaultValue="revenue" className="space-y-6">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="revenue" className="gap-1.5">
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">Ingresos</span>
          </TabsTrigger>
          <TabsTrigger value="businesses" className="gap-1.5">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Negocios</span>
          </TabsTrigger>
          <TabsTrigger value="services" className="gap-1.5">
            <Scissors className="h-4 w-4" />
            <span className="hidden sm:inline">Servicios</span>
          </TabsTrigger>
          <TabsTrigger value="growth" className="gap-1.5">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Crecimiento</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="revenue">
          <CompanyRevenueReport
            startDate={dateRangeProps.startDate}
            endDate={dateRangeProps.endDate}
          />
        </TabsContent>

        <TabsContent value="businesses">
          <CompanyBusinessesReport
            startDate={dateRangeProps.startDate}
            endDate={dateRangeProps.endDate}
          />
        </TabsContent>

        <TabsContent value="services">
          <CompanyServicesReport
            startDate={dateRangeProps.startDate}
            endDate={dateRangeProps.endDate}
          />
        </TabsContent>

        <TabsContent value="growth">
          <CompanyGrowthReport />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function CompanyGrowthReport() {
  return (
    <div className="text-center py-12 text-muted-foreground">
      <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
      <p>Análisis de tendencias de crecimiento próximamente</p>
    </div>
  )
}
