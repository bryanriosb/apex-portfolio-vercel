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

import { DashboardHeader } from '@/components/dashboard/collection/DashboardHeader'
import { StatsCards } from '@/components/dashboard/collection/StatsCards'
import { ActiveExecutions } from '@/components/dashboard/collection/ActiveExecutions'
import { RecentExecutions } from '@/components/dashboard/collection/RecentExecutions'
import { ReputationOverview } from '@/components/dashboard/collection/ReputationOverview'
import {
  DashboardStats,
  ActiveExecution,
} from '@/lib/models/collection/dashboard'
import { EmailReputationProfile } from '@/lib/models/collection/email-reputation'

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

  // Loading states
  const [statsLoading, setStatsLoading] = useState(true)
  const [recentLoading, setRecentLoading] = useState(true)
  const [reputationLoading, setReputationLoading] = useState(true)
  const [isPolling, setIsPolling] = useState(false)

  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null)
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

  useEffect(() => {
    if (!activeBusiness?.id) return

    loadData()

    setRecentLoading(true)
    getRecentExecutionsAction(activeBusiness.id, 5)
      .then(setRecentExecutions)
      .finally(() => setRecentLoading(false))

    setReputationLoading(true)
    getReputationSummaryAction(activeBusiness.id)
      .then(setReputationProfiles)
      .finally(() => setReputationLoading(false))
  }, [activeBusiness?.id, loadData])

  // Polling logic for progress
  const startPolling = useCallback(() => {
    if (pollingTimerRef.current) return
    setIsPolling(true)
    pollingTimerRef.current = setInterval(async () => {
      if (!activeBusiness?.id) return
      const activeData = await getActiveExecutionsAction(activeBusiness.id)
      setActiveExecutions(activeData)
      for (const exec of activeData) {
        const clientStats = await getExecutionClientsAction(exec.id)
        setActiveExecutionClientStats(exec.id, clientStats)
      }
    }, 5000)
  }, [activeBusiness?.id])

  const stopPolling = useCallback(() => {
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current)
      pollingTimerRef.current = null
      setIsPolling(false)
    }
  }, [])

  useEffect(() => {
    if (activeExecutions.length > 0) {
      startPolling()
    } else {
      stopPolling()
    }
    return () => stopPolling()
  }, [activeExecutions.length, startPolling, stopPolling])

  useEffect(() => {
    activeExecutionsRef.current = activeExecutions
  }, [activeExecutions])

  // Realtime
  useEffect(() => {
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
    loadData()
    if (activeBusiness?.id) {
      getRecentExecutionsAction(activeBusiness.id, 5).then(setRecentExecutions)
      getReputationSummaryAction(activeBusiness.id).then(setReputationProfiles)
    }
    toast.success('Tablero actualizado')
  }

  if (!activeBusiness) {
    return (
      <div className="flex flex-col gap-6 w-full overflow-auto">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Tablero
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Selecciona una sucursal para ver el tablero
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6 w-full h-full min-h-[calc(100vh-120px)]">
      <DashboardHeader
        today={today}
        isPolling={isPolling}
        statsLoading={statsLoading}
        onManualRefresh={manualRefresh}
      />

      <ActiveExecutions
        executions={activeExecutions}
        getStatusColor={getStatusColor}
      />

      <StatsCards
        stats={stats}
        statsLoading={statsLoading}
        reputationLoading={reputationLoading}
        reputationCount={reputationProfiles.length}
        warmedCount={reputationProfiles.filter((p) => p.is_warmed_up).length}
        formatDate={formatDate}
      />

      {/* Grid de 2 columnas para Ejecuciones y Reputación */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <RecentExecutions
          executions={recentExecutions}
          loading={recentLoading}
          formatDate={formatDate}
          getStatusColor={getStatusColor}
        />

        <ReputationOverview
          profiles={reputationProfiles}
          loading={reputationLoading}
        />
      </div>
    </div>
  )
}
