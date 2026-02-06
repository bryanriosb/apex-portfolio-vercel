'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import {
  PlusCircle,
  Mail,
  Shield,
  CheckCircle,
  Clock,
  Play,
  Activity,
  Target,
  Zap,
  RefreshCw,
} from 'lucide-react'
import { AlertCircle, AlertTriangle } from 'lucide-react'
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
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/utils/currency'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { createClient } from '@supabase/supabase-js'
import type { EmailReputationProfile } from '@/lib/models/collection/email-reputation'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

interface DashboardStats {
  total_executions: number
  pending_executions: number
  processing_executions: number
  completed_executions: number
  failed_executions: number
  total_emails_sent: number
  total_emails_delivered: number
  total_emails_opened: number
  total_emails_bounced: number
  total_emails_failed: number
  avg_open_rate: number
  avg_bounce_rate: number
  avg_delivery_rate: number
  last_execution_date: string | null
  today_emails_sent: number
  today_emails_delivered: number
}

interface ActiveExecution {
  id: string
  name: string
  status: string
  created_at: string
  started_at: string | null
  total_clients: number
  emails_sent: number
  emails_delivered: number
  emails_opened: number
  progress_percent: number
  strategy_type: string
  clientStats?: {
    total: number
    pending: number
    sent: number
    delivered: number
    opened: number
    bounced: number
    failed: number
  }
}

export default function DashboardPage() {
  const { activeBusiness } = useActiveBusinessStore()
  const [reputationProfiles, setReputationProfiles] = useState<
    EmailReputationProfile[]
  >([])
  const [recentExecutions, setRecentExecutions] = useState<any[]>([])
  const [reputationLoading, setReputationLoading] = useState(true)
  const [recentLoading, setRecentLoading] = useState(true)

  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [activeExecutions, setActiveExecutions] = useState<ActiveExecution[]>(
    []
  )
  const [statsLoading, setStatsLoading] = useState(true)
  const [isPolling, setIsPolling] = useState(false)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const supabase = useMemo(() => createClient(supabaseUrl, supabaseAnonKey), [])

  const today = format(new Date(), "EEEE, d 'de' MMMM", { locale: es })

  // Smart polling - faster when active executions exist
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
    }

    const interval = activeExecutions.length > 0 ? 2000 : 10000 // 2s when active, 10s otherwise
    setIsPolling(activeExecutions.length > 0)

    pollingIntervalRef.current = setInterval(async () => {
      if (activeBusiness?.id) {
        try {
          const [newStats, newActiveExecs] = await Promise.all([
            getDashboardStatsAction(activeBusiness.id),
            getActiveExecutionsAction(activeBusiness.id),
          ])
          setStats(newStats)
          setActiveExecutions(newActiveExecs)
          setIsPolling(newActiveExecs.length > 0)
        } catch (error) {
          console.error('Polling error:', error)
        }
      }
    }, interval)
  }, [activeBusiness?.id, activeExecutions.length])

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }
    setIsPolling(false)
  }, [])

  // Initial data load
  useEffect(() => {
    async function loadData() {
      if (!activeBusiness?.id) {
        setStatsLoading(false)
        setReputationLoading(false)
        setRecentLoading(false)
        return
      }

      setStatsLoading(true)
      setReputationLoading(true)
      setRecentLoading(true)

      try {
        const [statsData, activeExecs, reputationData, recentData] =
          await Promise.all([
            getDashboardStatsAction(activeBusiness.id),
            getActiveExecutionsAction(activeBusiness.id),
            getReputationSummaryAction(activeBusiness.id),
            getRecentExecutionsAction(activeBusiness.id, 5),
          ])

        setStats(statsData)
        setActiveExecutions(activeExecs)
        setReputationProfiles(reputationData)
        setRecentExecutions(recentData)
      } catch (error) {
        console.error('Error loading dashboard data:', error)
      } finally {
        setStatsLoading(false)
        setReputationLoading(false)
        setRecentLoading(false)
      }
    }

    loadData()
  }, [activeBusiness?.id])

  // Start/stop polling based on active executions
  useEffect(() => {
    if (statsLoading) return
    if (activeExecutions.length > 0) {
      startPolling()
    } else {
      stopPolling()
    }
    return () => stopPolling()
  }, [activeExecutions.length, statsLoading, startPolling, stopPolling])

  // Realtime subscriptions
  useEffect(() => {
    if (!activeBusiness?.id) return

    const channel = supabase
      .channel('dashboard-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'collection_executions',
          // Removed filter to rely on RLS and avoid type casting issues
        },
        () => {
          console.log('Dashboard: Execution change detected')
          toast.info('Actualizando tablero...')
          getDashboardStatsAction(activeBusiness.id)
            .then(setStats)
            .catch(console.error)
          getActiveExecutionsAction(activeBusiness.id)
            .then(setActiveExecutions)
            .catch(console.error)
          getRecentExecutionsAction(activeBusiness.id, 5)
            .then(setRecentExecutions)
            .catch(console.error)
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'collection_clients' },
        async (payload) => {
          console.log('Dashboard: Client change detected', payload)
          toast.info('Nueva actividad detectada')

          // Refresh global stats (Totals, Rates)
          getDashboardStatsAction(activeBusiness.id)
            .then(setStats)
            .catch(console.error)

          // Refresh recent executions list
          getRecentExecutionsAction(activeBusiness.id, 5)
            .then(setRecentExecutions)
            .catch(console.error)

          // Refresh client stats for active executions
          for (const exec of activeExecutions) {
            const clientStats = await getExecutionClientsAction(exec.id)
            setActiveExecutionClientStats(exec.id, clientStats)
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Realtime connected')
        }
        if (status === 'CHANNEL_ERROR') {
          console.error('Realtime connection error')
          toast.error('Error de conexión con el servidor de actualizaciones')
        }
        if (status === 'TIMED_OUT') {
          console.error('Realtime connection timeout')
          toast.warning('La conexión en tiempo real está tardando...')
        }
      })

    return () => {
      supabase.removeChannel(channel)
      stopPolling()
    }
  }, [activeBusiness?.id, supabase, activeExecutions, stopPolling])

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

  const manualRefresh = useCallback(async () => {
    if (!activeBusiness?.id) return
    setStatsLoading(true)
    try {
      const [statsData, activeExecs, reputationData, recentData] =
        await Promise.all([
          getDashboardStatsAction(activeBusiness.id),
          getActiveExecutionsAction(activeBusiness.id),
          getReputationSummaryAction(activeBusiness.id),
          getRecentExecutionsAction(activeBusiness.id, 5),
        ])
      setStats(statsData)
      setActiveExecutions(activeExecs)
      setReputationProfiles(reputationData)
      setRecentExecutions(recentData)
    } catch (error) {
      console.error('Refresh error:', error)
    } finally {
      setStatsLoading(false)
    }
  }, [activeBusiness?.id])

  const formatDate = (date: string | null | undefined) => {
    if (!date) return '-'
    const d = new Date(date)
    return d.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
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
      <div className="shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">
            Tablero - Cobros
          </h1>
          <p className="text-sm text-muted-foreground capitalize">{today}</p>
        </div>
        <div className="flex items-center gap-2">
          {isPolling && (
            <Badge variant="outline" className="text-xs animate-pulse">
              <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
              Realtime
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={manualRefresh}
            disabled={statsLoading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${statsLoading ? 'animate-spin' : ''}`}
            />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Active Executions */}
      {activeExecutions.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
            <Play className="h-5 w-5 text-green-600 animate-pulse" />
            Ejecuciones en Progreso ({activeExecutions.length})
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {activeExecutions.map((exec) => (
              <Card key={exec.id} className="rounded-none border border-l-4 border-l-blue-500">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{exec.name}</CardTitle>
                      <CardDescription>
                        {exec.strategy_type === 'immediate'
                          ? 'Inmediata'
                          : 'Programada'}
                      </CardDescription>
                    </div>
                    <Badge className={getStatusColor(exec.status)}>
                      {exec.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Progreso</span>
                      <span className="font-medium">
                        {exec.progress_percent}%
                      </span>
                    </div>
                    <Progress value={exec.progress_percent} className="h-2" />
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <div className="bg-muted rounded p-1">
                      <span className="text-muted-foreground block">Total</span>
                      <p className="font-semibold">
                        {exec.clientStats?.total || exec.total_clients}
                      </p>
                    </div>
                    <div className="bg-muted rounded p-1">
                      <span className="text-muted-foreground block">
                        Enviados
                      </span>
                      <p className="font-semibold">
                        {exec.clientStats?.sent || exec.emails_sent}
                      </p>
                    </div>
                    <div className="bg-muted rounded p-1">
                      <span className="text-muted-foreground block">
                        Entregados
                      </span>
                      <p className="font-semibold">
                        {exec.clientStats?.delivered || exec.emails_delivered}
                      </p>
                    </div>
                    <div className="bg-muted rounded p-1">
                      <span className="text-muted-foreground block">
                        Abiertos
                      </span>
                      <p className="font-semibold">
                        {exec.clientStats?.opened || exec.emails_opened}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Main Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-none border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Enviados
            </CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {(stats?.total_emails_sent || 0).toLocaleString()}
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-muted-foreground">
                    Hoy: {(stats?.today_emails_sent || 0).toLocaleString()}
                  </p>
                  {stats && stats.today_emails_sent > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {(
                        (stats.today_emails_sent /
                          Math.max(stats.total_emails_sent, 1)) *
                        100
                      ).toFixed(0)}
                      %
                    </Badge>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-none border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Tasa de Apertura
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {stats?.avg_open_rate || 0}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {(stats?.total_emails_opened || 0).toLocaleString()} abiertos
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-none border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Tasa de Entrega
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {stats?.avg_delivery_rate || 0}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {(stats?.total_emails_delivered || 0).toLocaleString()} de{' '}
                  {(stats?.total_emails_sent || 0).toLocaleString()}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-none border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Tasa de Rebote
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div
                  className={`text-2xl font-bold ${(stats?.avg_bounce_rate || 0) > 5 ? 'text-red-600' : (stats?.avg_bounce_rate || 0) > 2 ? 'text-yellow-600' : 'text-green-600'}`}
                >
                  {stats?.avg_bounce_rate || 0}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {(stats?.total_emails_bounced || 0).toLocaleString()}{' '}
                  rebotados
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-none border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Ejecuciones Totales
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {stats?.total_executions || 0}
                </div>
                <div className="flex gap-2 text-xs mt-1">
                  <Badge variant="outline" className="text-xs">
                    {stats?.completed_executions || 0} completadas
                  </Badge>
                  {stats?.failed_executions ? (
                    <Badge variant="destructive" className="text-xs">
                      {stats.failed_executions} fallidas
                    </Badge>
                  ) : null}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-none border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Progreso</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {stats?.processing_executions || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats?.pending_executions || 0} pendientes
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-none border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Última Ejecución
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-sm font-bold">
                  {formatDate(stats?.last_execution_date)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats?.total_executions
                    ? `${stats.total_executions} ejecuciones`
                    : 'Sin ejecuciones'}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-none border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Dominios Activos
            </CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {reputationLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {reputationProfiles.length}
                </div>
                <p className="text-xs text-muted-foreground">
                  {reputationProfiles.filter((p) => p.is_warmed_up).length}{' '}
                  activos,{' '}
                  {reputationProfiles.filter((p) => !p.is_warmed_up).length} en
                  warm-up
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Executions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">
            Ejecuciones Recientes
          </h2>
          <Link href="/admin/collection/executions">
            <Button variant="outline" size="sm">
              Ver Todas
            </Button>
          </Link>
        </div>

        {recentLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="rounded-none border">
                <CardContent className="pt-4">
                  <Skeleton className="h-16 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : recentExecutions.length === 0 ? (
          <Card className="rounded-none border border-dashed">
            <CardContent className="py-8 text-center">
              <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                Sin ejecuciones aún
              </h3>
              <p className="text-muted-foreground mb-4">
                Crea tu primera campaña de cobro
              </p>
              <Link href="/admin/collection/campaing">
                <Button>Crear Campaña</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {recentExecutions.map((exec) => (
              <Card key={exec.id} className="rounded-none border">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold truncate">
                          {exec.name}
                        </h3>
                        <Badge
                          className={`text-xs ${getStatusColor(exec.status)}`}
                        >
                          {exec.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {exec.total_clients} clientes • {exec.emails_sent}{' '}
                        enviados • {exec.emails_opened || 0} abiertos
                      </p>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <p>{formatDate(exec.created_at)}</p>
                      <p className="text-green-600">
                        {exec.avg_open_rate?.toFixed(1) || 0}% opens
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Reputation Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-tight flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Reputación de Dominios
          </h2>
          <Link href="/admin/settings/email-delivery">
            <Button variant="outline" size="sm">
              Gestionar
            </Button>
          </Link>
        </div>

        {reputationLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="rounded-none border">
                <CardHeader className="pb-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <Skeleton className="h-4 w-full" />
                  <div className="grid grid-cols-3 gap-2">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : reputationProfiles.length === 0 ? (
          <Card className="rounded-none border border-dashed">
            <CardContent className="py-8 text-center">
              <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                No hay dominios configurados
              </h3>
              <p className="text-muted-foreground mb-4">
                Los dominios se crean automáticamente cuando envías tu primera
                campaña
              </p>
              <Link href="/admin/settings/email-delivery">
                <Button variant="outline">Configurar Dominios</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {reputationProfiles.map((profile) => (
              <Card
                key={profile.id}
                className={
                  profile.has_reputation_issues ? 'rounded-none border border-red-300' : 'rounded-none border'
                }
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg font-semibold">
                        {profile.domain}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {profile.is_warmed_up ? (
                          <span className="text-green-600 flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" /> Warm-up
                            completado
                          </span>
                        ) : (
                          <span className="text-yellow-600 flex items-center gap-1">
                            <Clock className="h-3 w-3" /> Día{' '}
                            {profile.current_warmup_day} de warm-up
                          </span>
                        )}
                      </CardDescription>
                    </div>
                    <Badge
                      variant={profile.is_warmed_up ? 'default' : 'secondary'}
                      className={
                        profile.is_warmed_up
                          ? 'bg-green-100 text-green-800'
                          : ''
                      }
                    >
                      {profile.is_warmed_up ? 'Activo' : 'Warm-up'}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {!profile.is_warmed_up && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Progreso</span>
                        <span className="font-medium">
                          {Math.min(
                            (profile.current_warmup_day / 6) * 100,
                            100
                          ).toFixed(0)}
                          %
                        </span>
                      </div>
                      <Progress
                        value={Math.min(
                          (profile.current_warmup_day / 6) * 100,
                          100
                        )}
                        className="h-2"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-muted rounded p-2">
                      <p className="text-xs text-muted-foreground">Delivery</p>
                      <p
                        className={`font-semibold text-sm ${profile.delivery_rate >= 95 ? 'text-green-600' : profile.delivery_rate >= 90 ? 'text-yellow-600' : 'text-red-600'}`}
                      >
                        {profile.delivery_rate.toFixed(1)}%
                      </p>
                    </div>
                    <div className="bg-muted rounded p-2">
                      <p className="text-xs text-muted-foreground">Opens</p>
                      <p
                        className={`font-semibold text-sm ${profile.open_rate >= 20 ? 'text-green-600' : profile.open_rate >= 10 ? 'text-yellow-600' : 'text-red-600'}`}
                      >
                        {profile.open_rate.toFixed(1)}%
                      </p>
                    </div>
                    <div className="bg-muted rounded p-2">
                      <p className="text-xs text-muted-foreground">Bounce</p>
                      <p
                        className={`font-semibold text-sm ${profile.bounce_rate <= 2 ? 'text-green-600' : profile.bounce_rate <= 5 ? 'text-yellow-600' : 'text-red-600'}`}
                      >
                        {profile.bounce_rate.toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  {profile.has_reputation_issues && (
                    <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                      <AlertTriangle className="h-4 w-4" />
                      <span>Problemas detectados</span>
                    </div>
                  )}
                  {profile.is_under_review && (
                    <div className="flex items-center gap-2 text-sm text-yellow-600 bg-yellow-50 p-2 rounded">
                      <AlertCircle className="h-4 w-4" />
                      <span>Bajo revisión</span>
                    </div>
                  )}
                </CardContent>

                <CardFooter className="border-t bg-muted/50 px-6 py-3">
                  <div className="flex items-center justify-between w-full text-xs text-muted-foreground">
                    <span>
                      {profile.total_emails_sent.toLocaleString()} enviados
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {profile.current_strategy === 'ramp_up' && 'Ramp-Up'}
                      {profile.current_strategy === 'batch' && 'Batch'}
                      {profile.current_strategy === 'conservative' &&
                        'Conservadora'}
                    </Badge>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
