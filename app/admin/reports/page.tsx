'use client'

import { useState, useMemo } from 'react'
import { DateRange } from 'react-day-picker'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useActiveBusinessStore } from '@/lib/store/active-business-store'
import { useCurrentUser } from '@/hooks/use-current-user'
import {
  ReportDateFilter,
  getDateRangeFromPreset,
  type DatePreset,
} from '@/components/reports/ReportDateFilter'

import {
  DollarSign,
  Calendar,
  Scissors,
  UserCircle,
  Users,
  Syringe,
  Wallet,
} from 'lucide-react'
import Loading from '@/components/ui/loading'
import { FeatureGate } from '@/components/plan/FeatureGate'

export default function ReportsPage() {
  const { isLoading, role } = useCurrentUser()
  const { activeBusiness } = useActiveBusinessStore()
  const [activePreset, setActivePreset] = useState<DatePreset>('month')
  const [dateRange, setDateRange] = useState<DateRange | undefined>(
    getDateRangeFromPreset('month')
  )

  const activeBusinessId = activeBusiness?.id
  const isCompanyAdmin = role === 'company_admin'

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

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 w-full overflow-auto">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Reportes
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            <Loading />
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 w-full overflow-auto">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Reportes
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Analiza el rendimiento de tu negocio
          </p>
        </div>
        <ReportDateFilter
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          activePreset={activePreset}
          onPresetChange={setActivePreset}
        />
      </div>

      <Tabs defaultValue="revenue" className="space-y-6">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="revenue" className="gap-1.5">
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">Ingresos</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="revenue">Ingresos</TabsContent>
      </Tabs>
    </div>
  )
}
