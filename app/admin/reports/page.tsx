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
import { RevenueReport } from '@/components/reports/RevenueReport'
import { AppointmentsReport } from '@/components/reports/AppointmentsReport'
import { ServicesReport } from '@/components/reports/ServicesReport'
import { SpecialistsReport } from '@/components/reports/SpecialistsReport'
import { CustomersReport } from '@/components/reports/CustomersReport'
import { SuppliesReport } from '@/components/reports/SuppliesReport'
import { AccountsReceivableReport } from '@/components/reports/AccountsReceivableReport'
import { CompanyReportsView } from '@/components/reports/company/CompanyReportsView'
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

  if (isCompanyAdmin) {
    return (
      <CompanyReportsView
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        activePreset={activePreset}
        onPresetChange={setActivePreset}
        dateRangeProps={dateRangeProps}
      />
    )
  }

  if (!activeBusinessId) {
    return (
      <div className="flex flex-col gap-6 w-full overflow-auto">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Reportes
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Selecciona una sucursal para ver los reportes
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
          <TabsTrigger value="appointments" className="gap-1.5">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Citas</span>
          </TabsTrigger>
          <TabsTrigger value="services" className="gap-1.5">
            <Scissors className="h-4 w-4" />
            <span className="hidden sm:inline">Servicios</span>
          </TabsTrigger>
          <TabsTrigger value="specialists" className="gap-1.5">
            <UserCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Especialistas</span>
          </TabsTrigger>
          <TabsTrigger value="customers" className="gap-1.5">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Clientes</span>
          </TabsTrigger>
          <FeatureGate module="reports" feature="view_supplies" mode="compact">
            <TabsTrigger value="supplies" className="gap-1.5">
              <Syringe className="h-4 w-4" />
              <span className="hidden sm:inline">Insumos</span>
            </TabsTrigger>
          </FeatureGate>
          <FeatureGate module="reports" feature="view_portfolio" mode="compact">
            <TabsTrigger value="receivables" className="gap-1.5">
              <Wallet className="h-4 w-4" />
              <span className="hidden sm:inline">Cartera</span>
            </TabsTrigger>
          </FeatureGate>
        </TabsList>

        <TabsContent value="revenue">
          <RevenueReport
            businessId={activeBusinessId}
            startDate={dateRangeProps.startDate}
            endDate={dateRangeProps.endDate}
          />
        </TabsContent>

        <TabsContent value="appointments">
          <AppointmentsReport
            businessId={activeBusinessId}
            startDate={dateRangeProps.startDate}
            endDate={dateRangeProps.endDate}
          />
        </TabsContent>

        <TabsContent value="services">
          <ServicesReport
            businessId={activeBusinessId}
            startDate={dateRangeProps.startDate}
            endDate={dateRangeProps.endDate}
          />
        </TabsContent>

        <TabsContent value="specialists">
          <SpecialistsReport
            businessId={activeBusinessId}
            startDate={dateRangeProps.startDate}
            endDate={dateRangeProps.endDate}
          />
        </TabsContent>

        <TabsContent value="customers">
          <CustomersReport
            businessId={activeBusinessId}
            startDate={dateRangeProps.startDate}
            endDate={dateRangeProps.endDate}
          />
        </TabsContent>

        <TabsContent value="supplies">
          <SuppliesReport
            businessId={activeBusinessId}
            startDate={dateRangeProps.startDate}
            endDate={dateRangeProps.endDate}
          />
        </TabsContent>

        <TabsContent value="receivables">
          <AccountsReceivableReport
            businessId={activeBusinessId}
            startDate={dateRangeProps.startDate}
            endDate={dateRangeProps.endDate}
            businessData={
              activeBusiness
                ? {
                    name: activeBusiness.name,
                    business_account_id: activeBusiness.business_account_id,
                  }
                : undefined
            }
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
