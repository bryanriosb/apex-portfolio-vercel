'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

import { RealtimeDashboardService } from '@/lib/services/collection/realtime-dashboard-service'
import { useActiveBusinessStore } from '@/lib/store/active-business-store'
import {
  getDashboardStatsAction,
  getActiveExecutionsAction,
  getRecentExecutionsAction,
} from '@/lib/actions/collection/execution'
import {
  getExecutionClientsAction,
  getReputationSummaryAction,
} from '@/lib/actions/collection/email-strategies'
import {
  getRecaudoDashboardStatsAction,
  getRecaudoByBankAction,
  RecaudoDashboardStats,
  RecaudoByBank,
} from '@/lib/actions/bank-transactions/transaction'
import {
  getCarteraDashboardAction,
  GeneralKpis,
  EffectivenessKpis,
  AgingKpis,
  CashForecastItem,
  ExpectedForecastItem,
} from '@/lib/actions/collection/metrics'

import { DashboardHeader } from '@/components/dashboard/collection/DashboardHeader'
import { StatsCards } from '@/components/dashboard/collection/StatsCards'
import { ActiveExecutions } from '@/components/dashboard/collection/ActiveExecutions'
import { RecentExecutions } from '@/components/dashboard/collection/RecentExecutions'
import { ReputationOverview } from '@/components/dashboard/collection/ReputationOverview'
import { BlacklistMonitor } from '@/components/dashboard/collection/BlacklistMonitor'
import { RecaudoStatsCards } from '@/components/dashboard/collection/RecaudoStatsCards'
import { RecaudoByBank as RecaudoByBankComponent } from '@/components/dashboard/collection/RecaudoByBank'
import { RecaudoAlerts } from '@/components/dashboard/collection/RecaudoAlerts'
import { CarteraKpiCards } from '@/components/dashboard/collection/CarteraKpiCards'
import { AgingBucketsChart } from '@/components/dashboard/collection/AgingBucketsChart'
import { CashForecastChart } from '@/components/dashboard/collection/CashForecastChart'
import { IntentsDistributionChart } from '@/components/dashboard/collection/IntentsDistributionChart'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DashboardStats,
  ActiveExecution,
} from '@/lib/models/collection/dashboard'
import { EmailReputationProfile } from '@/lib/models/collection/email-reputation'

/**
 * El tab de Campaña queda oculto temporalmente (no eliminado): volver a
 * `true` para restaurarlo junto con sus cargas de datos y realtime.
 */
const SHOW_CAMPAIGN_TAB = false

export default function DashboardPage() {
  const { data: session } = useSession()
  const { activeBusiness } = useActiveBusinessStore()

  // State
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [activeExecutions, setActiveExecutions] = useState<ActiveExecution[]>(
    []
  )
  const [recentExecutions, setRecentExecutions] = useState<any[]>([])
  const [reputationProfiles, setReputationProfiles] = useState<
    EmailReputationProfile[]
  >([])

  // Recaudo state
  const [recaudoStats, setRecaudoStats] = useState<RecaudoDashboardStats | null>(null)
  const [recaudoByBank, setRecaudoByBank] = useState<RecaudoByBank[]>([])

  // Indicadores de cartera state
  const [generalKpis, setGeneralKpis] = useState<GeneralKpis | null>(null)
  const [effectivenessKpis, setEffectivenessKpis] =
    useState<EffectivenessKpis | null>(null)
  const [agingKpis, setAgingKpis] = useState<AgingKpis | null>(null)
  const [cashForecast, setCashForecast] = useState<CashForecastItem[]>([])
  const [expectedForecast, setExpectedForecast] = useState<
    ExpectedForecastItem[]
  >([])

  // Loading states
  const [statsLoading, setStatsLoading] = useState(SHOW_CAMPAIGN_TAB)
  const [recentLoading, setRecentLoading] = useState(true)
  const [reputationLoading, setReputationLoading] = useState(true)
  const [recaudoLoading, setRecaudoLoading] = useState(true)
  const [kpisLoading, setKpisLoading] = useState(true)

  const activeExecutionsRef = useRef(activeExecutions)
  const realtimeService = useMemo(() => new RealtimeDashboardService(), [])

  const today = format(new Date(), "EEEE, d 'de' MMMM", { locale: es })

  // Helpers
  const formatDate = (date: string | null | undefined) => {
    if (!date) return 'Nunca'
    return format(new Date(date), 'd MMM, HH:mm', { locale: es })
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'processing':
        return 'bg-blue-100 text-blue-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const setActiveExecutionClientStats = (
    executionId: string,
    clientStats: ActiveExecution['clientStats']
  ) => {
    setActiveExecutions((prev) =>
      prev.map((exec) =>
        exec.id === executionId ? { ...exec, clientStats } : exec
      )
    )
  }

  // Data Loading
  const loadData = useCallback(async () => {
    if (!activeBusiness?.id) return

    try {
      setStatsLoading(true)
      const [statsData, activeData] = await Promise.all([
        getDashboardStatsAction(activeBusiness.id),
        getActiveExecutionsAction(activeBusiness.id),
      ])

      if (statsData) setStats(statsData)
      setActiveExecutions(activeData)

      // Cargar stats de clientes para ejecuciones activas
      for (const exec of activeData) {
        getExecutionClientsAction(exec.id).then((clientStats) => {
          setActiveExecutionClientStats(exec.id, clientStats)
        })
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setStatsLoading(false)
    }
  }, [activeBusiness?.id])

  // Recaudo Data Loading
  const loadRecaudoData = useCallback(async () => {
    if (!activeBusiness?.id) return

    try {
      setRecaudoLoading(true)
      const [statsData, byBankData] = await Promise.all([
        getRecaudoDashboardStatsAction(activeBusiness.id),
        getRecaudoByBankAction(activeBusiness.id),
      ])

      setRecaudoStats(statsData)
      setRecaudoByBank(byBankData)
    } catch (error) {
      console.error('Error loading recaudo data:', error)
    } finally {
      setRecaudoLoading(false)
    }
  }, [activeBusiness?.id])

  // Indicadores de cartera (KPIs, aging y forecast desde apex-ai).
  // La action combinada nunca rechaza: cada endpoint degrada a null/[].
  const loadCarteraKpis = useCallback(async () => {
    if (!activeBusiness?.id) return

    setKpisLoading(true)
    const { general, effectiveness, aging, forecast, expectedForecast } =
      await getCarteraDashboardAction()

    setGeneralKpis(general)
    setEffectivenessKpis(effectiveness)
    setAgingKpis(aging)
    setCashForecast(forecast)
    setExpectedForecast(expectedForecast)
    setKpisLoading(false)
  }, [activeBusiness?.id])

  useEffect(() => {
    if (!activeBusiness?.id) return

    loadRecaudoData()
    loadCarteraKpis()

    if (!SHOW_CAMPAIGN_TAB) return

    loadData()

    setRecentLoading(true)
    getRecentExecutionsAction(activeBusiness.id, 5)
      .then(setRecentExecutions)
      .finally(() => setRecentLoading(false))

    setReputationLoading(true)
    getReputationSummaryAction(activeBusiness.id)
      .then(setReputationProfiles)
      .finally(() => setReputationLoading(false))
  }, [activeBusiness?.id, loadData, loadRecaudoData, loadCarteraKpis])

  useEffect(() => {
    activeExecutionsRef.current = activeExecutions
  }, [activeExecutions])

  // Realtime updates for dashboard data (alimenta el tab de Campaña)
  useEffect(() => {
    if (!SHOW_CAMPAIGN_TAB) return
    if (!activeBusiness?.id) return

    const setupRealtime = async () => {
      const user = session?.user as any
      if (user?.accessToken) {
        await realtimeService.authenticate(user.accessToken)
      }

      realtimeService.subscribeToBusinessChanges(
        activeBusiness.id,
        () => {
          getDashboardStatsAction(activeBusiness.id).then(setStats)
          getActiveExecutionsAction(activeBusiness.id).then(setActiveExecutions)
          getRecentExecutionsAction(activeBusiness.id, 5).then(
            setRecentExecutions
          )
        },
        async () => {
          getDashboardStatsAction(activeBusiness.id).then(setStats)
          getRecentExecutionsAction(activeBusiness.id, 5).then(
            setRecentExecutions
          )
          for (const exec of activeExecutionsRef.current) {
            getExecutionClientsAction(exec.id).then((stats) =>
              setActiveExecutionClientStats(exec.id, stats)
            )
          }
        },
        () => {
          getReputationSummaryAction(activeBusiness.id).then(
            setReputationProfiles
          )
        }
      )
    }

    setupRealtime()
    return () => {
      realtimeService.unsubscribe()
    }
  }, [activeBusiness?.id, session?.user, realtimeService])

  const manualRefresh = () => {
    loadRecaudoData()
    loadCarteraKpis()
    if (SHOW_CAMPAIGN_TAB) {
      loadData()
      if (activeBusiness?.id) {
        getRecentExecutionsAction(activeBusiness.id, 5).then(
          setRecentExecutions
        )
        getReputationSummaryAction(activeBusiness.id).then(
          setReputationProfiles
        )
      }
    }
    toast.success('Tablero actualizado')
  }

  const hydrated = useActiveBusinessStore((state) => state.hydrated)
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!activeBusiness) {
    return (
      <div className="flex flex-col gap-6 w-full overflow-auto">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Tablero
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            {(!mounted || !hydrated)
              ? 'Cargando datos...'
              : 'Selecciona una sucursal para ver el tablero'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6 w-full min-w-0">
      <DashboardHeader
        today={today}
        statsLoading={statsLoading}
        onManualRefresh={manualRefresh}
      />

      <Tabs
        defaultValue={SHOW_CAMPAIGN_TAB ? 'campana' : 'indicadores'}
        className="w-full"
      >
        <TabsList
          className={`grid w-full max-w-md ${SHOW_CAMPAIGN_TAB ? 'grid-cols-3' : 'grid-cols-2'}`}
        >
          {SHOW_CAMPAIGN_TAB && (
            <TabsTrigger value="campana">Campaña</TabsTrigger>
          )}
          <TabsTrigger value="indicadores">Indicadores</TabsTrigger>
          <TabsTrigger value="recaudo">Recaudo</TabsTrigger>
        </TabsList>

        {SHOW_CAMPAIGN_TAB && (
          <TabsContent
            value="campana"
            className="space-y-4 sm:space-y-6 mt-4 sm:mt-6"
          >
            <StatsCards
              stats={stats}
              statsLoading={statsLoading}
              reputationLoading={reputationLoading}
              reputationCount={reputationProfiles.length}
              warmedCount={
                reputationProfiles.filter((p) => p.is_warmed_up).length
              }
              formatDate={formatDate}
            />

            <ActiveExecutions
              executions={activeExecutions}
              getStatusColor={getStatusColor}
            />

            <RecentExecutions
              executions={recentExecutions}
              loading={recentLoading}
              formatDate={formatDate}
              getStatusColor={getStatusColor}
            />

            <BlacklistMonitor />
          </TabsContent>
        )}

        <TabsContent
          value="indicadores"
          className="space-y-4 sm:space-y-6 mt-4 sm:mt-6"
        >
          <CarteraKpiCards
            generalKpis={generalKpis}
            agingKpis={agingKpis}
            loading={kpisLoading}
          />

          <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
            <AgingBucketsChart data={agingKpis} loading={kpisLoading} />
            <IntentsDistributionChart
              data={effectivenessKpis}
              loading={kpisLoading}
            />
          </div>

          <CashForecastChart
            data={cashForecast}
            expectedData={expectedForecast}
            loading={kpisLoading}
          />
        </TabsContent>

        <TabsContent value="recaudo" className="space-y-4 sm:space-y-6 mt-4 sm:mt-6">
          <RecaudoAlerts
            unidentifiedCount={recaudoStats?.unidentified_count || 0}
            loading={recaudoLoading}
          />

          <RecaudoStatsCards
            stats={recaudoStats}
            loading={recaudoLoading}
          />

          <RecaudoByBankComponent
            data={recaudoByBank}
            loading={recaudoLoading}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
