'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Mail,
  Users,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
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
import { Skeleton } from '@/components/ui/skeleton'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

import { useRealtimeExecution } from '@/hooks/collection/use-realtime-execution'
import { processExecutionAction } from '@/lib/actions/collection/execution'
import { toast } from 'sonner'
import { Loader2, Play } from 'lucide-react'

// ... imports remain the same

export default function ExecutionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const executionId = params?.id as string

  const [initialExecution, setInitialExecution] =
    useState<CollectionExecution | null>(null)
  const [events, setEvents] = useState<CollectionEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)

  // Use realtime hook only when we have initial data
  const realtimeData = useRealtimeExecution(initialExecution!)
  const execution = realtimeData?.execution || initialExecution
  const clientStats = realtimeData?.clientStats
  const recentClients = realtimeData?.recentClients

  useEffect(() => {
    async function loadData() {
      if (!executionId) return

      setLoading(true)
      try {
        const [execData, eventsData] = await Promise.all([
          getExecutionByIdAction(executionId),
          fetchEventsByExecutionAction({
            execution_id: executionId,
            page_size: 50,
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

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
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
          icon={AlertTriangle}
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
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="clients">
            Clientes ({execution.total_clients})
          </TabsTrigger>
          <TabsTrigger value="events">Eventos ({events.length})</TabsTrigger>
          <TabsTrigger value="settings">Configuración</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Detalles de Ejecución</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Creado:</span>
                  <span className="font-medium">
                    {formatDistanceToNow(new Date(execution.created_at), {
                      addSuffix: true,
                      locale: es,
                    })}
                  </span>
                </div>
                {execution.started_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Iniciado:</span>
                    <span className="font-medium">
                      {formatDistanceToNow(new Date(execution.started_at), {
                        addSuffix: true,
                        locale: es,
                      })}
                    </span>
                  </div>
                )}
                {execution.completed_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Completado:</span>
                    <span className="font-medium">
                      {formatDistanceToNow(new Date(execution.completed_at), {
                        addSuffix: true,
                        locale: es,
                      })}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Estadísticas de Envío</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Enviados</span>
                    <span className="font-medium">{execution.emails_sent}</span>
                  </div>
                  <ProgressIndicator
                    value={progressRate}
                    showPercentage={false}
                    size="sm"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Entregados</span>
                    <span className="font-medium">
                      {execution.emails_delivered}
                    </span>
                  </div>
                  <ProgressIndicator
                    value={deliveryRate}
                    showPercentage={false}
                    size="sm"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Abiertos</span>
                    <span className="font-medium">
                      {execution.emails_opened}
                    </span>
                  </div>
                  <ProgressIndicator
                    value={execution.open_rate}
                    showPercentage={false}
                    size="sm"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="clients">
          <Card>
            <CardHeader>
              <CardTitle>Lista de Clientes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                DataTable de clientes - Por implementar
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events">
          <Card>
            <CardHeader>
              <CardTitle>Timeline de Eventos</CardTitle>
            </CardHeader>
            <CardContent>
              {events.length === 0 ? (
                <p className="text-muted-foreground">
                  No hay eventos registrados aún
                </p>
              ) : (
                <div className="space-y-4">
                  {events.slice(0, 10).map((event) => (
                    <div key={event.id} className="flex gap-4 border-l-2 pl-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{event.event_type}</Badge>
                          <Badge
                            variant={
                              event.event_status === 'success'
                                ? 'default'
                                : event.event_status === 'error'
                                  ? 'destructive'
                                  : 'secondary'
                            }
                          >
                            {event.event_status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(event.timestamp), {
                            addSuffix: true,
                            locale: es,
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Configuración</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Fallback habilitado:
                </span>
                <Badge
                  variant={execution.fallback_enabled ? 'default' : 'secondary'}
                >
                  {execution.fallback_enabled ? 'Sí' : 'No'}
                </Badge>
              </div>
              {execution.fallback_enabled && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Días para fallback:
                  </span>
                  <span className="font-medium">{execution.fallback_days}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Plantilla de email:
                </span>
                <span className="font-medium">
                  {execution.email_template_id || 'Sin plantilla'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Adjuntos:</span>
                <span className="font-medium">
                  {execution.attachment_ids.length}
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
