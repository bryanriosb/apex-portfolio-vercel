'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft,
  Mail,
  Users,
  CheckCircle2,
  Clock,
  Calendar,
  Play,
  Zap,
  FileText,
  Settings,
} from 'lucide-react'
import Link from 'next/link'
import {
  getExecutionByIdAction,
  fetchEventsByExecutionAction,
} from '@/lib/actions/collection'
import type {
  CollectionExecution,
  CollectionEvent,
} from '@/lib/models/collection'
import {
  StatusBadge,
  MetricCard,
  ProgressIndicator,
} from '@/components/collection/shared'
import { ClientsDataTable } from '@/components/collection/executions/ClientsDataTable'
import { EventChart } from '@/components/collection/executions/EventChart'
import { EventLog } from '@/components/collection/executions/EventLog'
import { ExecutionFlow } from '@/components/collection/executions/ExecutionFlow'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDistanceToNow, format } from 'date-fns'
import { es } from 'date-fns/locale'
import { formatInBusinessTimeZone } from '@/lib/utils/date-format'

import { useRealtimeExecution } from '@/hooks/collection/use-realtime-execution'
import { processExecutionAction } from '@/lib/actions/collection/execution'
import { useCurrentUser } from '@/hooks/use-current-user'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

export default function ExecutionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const executionId = params?.id as string

  const [initialExecution, setInitialExecution] =
    useState<CollectionExecution | null>(null)
  const [events, setEvents] = useState<CollectionEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [refreshingEvents, setRefreshingEvents] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const { user } = useCurrentUser()
  const businessTimezone = user?.timezone || 'America/Bogota'

  // Use realtime hook only when we have initial data
  const realtimeData = useRealtimeExecution(initialExecution!)
  const execution = realtimeData?.execution || initialExecution
  const clientStats = realtimeData?.clientStats

  useEffect(() => {
    async function loadData() {
      if (!executionId) return

      setLoading(true)
      try {
        const [execData, eventsData] = await Promise.all([
          getExecutionByIdAction(executionId),
          fetchEventsByExecutionAction({
            execution_id: executionId,
            page_size: 100,
          }),
        ])

        setInitialExecution(execData)
        setEvents(eventsData.data)
      } catch (error) {
        console.error('Error loading execution details:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [executionId])

  const handleProcess = async () => {
    if (!execution) return
    setProcessing(true)
    try {
      const res = await processExecutionAction(execution.id)
      if (res.success) {
        toast.success('Procesamiento iniciado')
        router.refresh()
      } else {
        toast.error(res.error || 'Error al iniciar procesamiento')
      }
    } catch (error) {
      toast.error('Error de conexión')
    } finally {
      setProcessing(false)
    }
  }

  const handleRefreshEvents = async () => {
    setRefreshingEvents(true)
    try {
      const eventsData = await fetchEventsByExecutionAction({
        execution_id: executionId,
        page_size: 100,
      })
      setEvents(eventsData.data)
    } catch (error) {
      console.error('Error refreshing events:', error)
    } finally {
      setRefreshingEvents(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-md" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>

        {/* Metrics Cards Skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>

        {/* Progress Card Skeleton */}
        <Skeleton className="h-32" />

        {/* Tabs Skeleton */}
        <div className="space-y-4">
          <Skeleton className="h-10 w-96" />

          {/* Overview Tab Content Skeleton */}
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Left Column - Execution Flow */}
            <div className="lg:col-span-2">
              <Skeleton className="h-[400px]" />
            </div>

            {/* Right Column - Details Cards */}
            <div className="lg:col-span-1 space-y-4">
              <Skeleton className="h-48" />
              <Skeleton className="h-40" />
            </div>
          </div>

          {/* Gráfico de Eventos Section Skeleton */}
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  if (!execution) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/collection/executions">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Ejecución no encontrada</h1>
          </div>
        </div>
      </div>
    )
  }

  const deliveryRate =
    execution.total_clients > 0
      ? (execution.emails_delivered / execution.total_clients) * 100
      : 0

  const progressRate =
    execution.total_clients > 0
      ? (execution.emails_sent / execution.total_clients) * 100
      : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/collection/executions">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">
                {execution.name}
              </h1>
              <StatusBadge status={execution.status} />
              <span className="text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded">
                ID: {execution.id}
              </span>
            </div>
            {execution.description && (
              <p className="text-muted-foreground mt-1">
                {execution.description}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {execution.status === 'pending' && (
            <Button onClick={handleProcess} disabled={processing}>
              {processing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              Iniciar Ejecución
            </Button>
          )}
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Clientes"
          value={execution.total_clients}
          description={`${execution.emails_sent} enviados`}
          icon={Users}
        />
        <MetricCard
          title="Tasa de Entrega"
          value={`${deliveryRate.toFixed(1)}%`}
          description={`${execution.emails_delivered} entregados`}
          icon={CheckCircle2}
        />
        <MetricCard
          title="Tasa de Apertura"
          value={`${execution.open_rate.toFixed(1)}%`}
          description={`${execution.emails_opened} abiertos`}
          icon={Mail}
        />
        <MetricCard
          title="Tasa de Rebote"
          value={`${execution.bounce_rate.toFixed(1)}%`}
          description={`${execution.emails_bounced} rebotados`}
          icon={Clock}
        />
      </div>

      {/* Progress */}
      {execution.status === 'processing' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Progreso de Envío
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ProgressIndicator
              value={progressRate}
              label={`${execution.emails_sent} de ${execution.total_clients} enviados`}
              size="lg"
            />
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="clients">
            Clientes ({execution.total_clients})
          </TabsTrigger>
          <TabsTrigger value="events">Eventos ({events.length})</TabsTrigger>
          <TabsTrigger value="settings">Configuración</TabsTrigger>
        </TabsList>

        {/* Overview Tab - Similar to details.png */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Left Column - Execution Flow */}
            <div className="lg:col-span-2">
              <ExecutionFlow execution={execution} />
            </div>

            {/* Right Column - Details & Status */}
            <div className="lg:col-span-1 space-y-4">
              {/* Execution Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">
                    Detalles de la Ejecución
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Estado:</span>
                    <StatusBadge status={execution.status} />
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Creado:</span>
                    <span>
                      {formatInBusinessTimeZone(execution.created_at, 'MMM d, yyyy', businessTimezone)}
                    </span>
                  </div>
                  {execution.started_at && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Iniciado:</span>
                      <span>
                        {formatDistanceToNow(new Date(execution.started_at), {
                          addSuffix: true,
                          locale: es,
                        })}
                      </span>
                    </div>
                  )}
                  {execution.completed_at && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Completado:</span>
                      <span>
                        {formatDistanceToNow(new Date(execution.completed_at), {
                          addSuffix: true,
                          locale: es,
                        })}
                      </span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Modo:</span>
                    <Badge variant="outline">
                      {execution.execution_mode === 'immediate'
                        ? 'Inmediato'
                        : 'Programado'}
                    </Badge>
                  </div>
                  {execution.scheduled_at && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Programado para:
                      </span>
                      <span>
                        {formatInBusinessTimeZone(execution.scheduled_at, 'MMM d, h:mm a', businessTimezone)}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Status Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">
                    Estadísticas
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Progreso</span>
                      <span className="font-medium">
                        {progressRate.toFixed(1)}%
                      </span>
                    </div>
                    <ProgressIndicator
                      value={progressRate}
                      showPercentage={false}
                      size="sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="text-center p-2 bg-muted rounded-lg">
                      <p className="text-2xl font-bold">
                        {execution.emails_delivered}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Entregados
                      </p>
                    </div>
                    <div className="text-center p-2 bg-muted rounded-lg">
                      <p className="text-2xl font-bold">
                        {execution.emails_opened}
                      </p>
                      <p className="text-xs text-muted-foreground">Abiertos</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Gráfico de Eventos Section */}
          {events.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base font-medium">
                  Gráfico de Eventos
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveTab('events')}
                >
                  Ver logs →
                </Button>
              </CardHeader>
              <CardContent>
                <EventChart events={events} />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="clients">
          <ClientsDataTable executionId={executionId} />
        </TabsContent>

        {/* Events Tab - Similar to events.png */}
        <TabsContent value="events">
          <div className="space-y-4">
            {/* Gráfico de Eventos */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-medium">
                  Gráfico de Eventos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <EventChart events={events} />
              </CardContent>
            </Card>

            {/* Logs de Eventos with Details Panel */}
            <EventLog
              events={events}
              onRefresh={handleRefreshEvents}
              isRefreshing={refreshingEvents}
            />
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Configuración General
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">
                    Fallback habilitado:
                  </span>
                  <Badge
                    variant={
                      execution.fallback_enabled ? 'default' : 'secondary'
                    }
                  >
                    {execution.fallback_enabled ? 'Sí' : 'No'}
                  </Badge>
                </div>
                {execution.fallback_enabled && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">
                      Días para fallback:
                    </span>
                    <span className="font-medium">
                      {execution.fallback_days} días
                    </span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">
                    Plantilla de email:
                  </span>
                  <Badge variant="outline">
                    {execution.email_template_id || 'Sin plantilla'}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Adjuntos:</span>
                  <span className="font-medium">
                    {execution.attachment_ids.length} archivo(s)
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
