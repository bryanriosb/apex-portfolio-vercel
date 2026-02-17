'use client'

import { useRealtimeExecution } from '@/hooks/collection/use-realtime-execution'
import { CollectionExecution } from '@/lib/models/collection'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { ArrowLeft, Loader2, Play, Pause, RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { processExecutionAction } from '@/lib/actions/collection/execution'
import { toast } from 'sonner'
import { useState } from 'react'

interface ExecutionDetailProps {
  initialExecution: CollectionExecution
}

export function ExecutionDetail({ initialExecution }: ExecutionDetailProps) {
  const { execution } = useRealtimeExecution(initialExecution)
  const router = useRouter()
  const [processing, setProcessing] = useState(false)

  const handleProcess = async () => {
    setProcessing(true)
    try {
      const res = await processExecutionAction(execution.id)
      if (res.success) {
        toast.success('Procesamiento iniciado')
      } else {
        toast.error(res.error || 'Error al iniciar procesamiento')
      }
    } catch (error) {
      toast.error('Error de conexión')
    } finally {
      setProcessing(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500'
      case 'processing':
        return 'bg-blue-500'
      case 'failed':
        return 'bg-red-500'
      case 'pending':
        return 'bg-yellow-500'
      default:
        return 'bg-gray-500'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              {execution.name}
              <Badge className={getStatusColor(execution.status)}>
                {execution.status}
              </Badge>
            </h1>
            <p className="text-muted-foreground">
              Creado el{' '}
              {format(
                new Date(execution.created_at),
                "d 'de' MMMM, yyyy 'a las' HH:mm",
                { locale: es }
              )}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
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
          <Button variant="outline" onClick={() => router.refresh()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Clientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{execution.total_clients}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Enviados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{execution.emails_sent}</div>
            <p className="text-xs text-muted-foreground">
              {execution.total_clients > 0
                ? (
                    (execution.emails_sent / execution.total_clients) *
                    100
                  ).toFixed(1)
                : 0}
              % del total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Tasa de Apertura
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{execution.open_rate}%</div>
            <p className="text-xs text-muted-foreground">
              {execution.emails_opened} aperturas
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rebotes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{execution.bounce_rate}%</div>
            <p className="text-xs text-muted-foreground">
              {execution.emails_bounced} rebotes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Configuration Info */}
      <Card>
        <CardHeader>
          <CardTitle>Configuración</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <span className="font-semibold">Plantilla:</span>{' '}
            {execution.email_template_id || 'N/A'}
          </div>
          <div>
            <span className="font-semibold">Fallback Activado:</span>{' '}
            {execution.fallback_enabled ? 'Sí' : 'No'}
          </div>
          <div>
            <span className="font-semibold">Días Fallback:</span>{' '}
            {execution.fallback_days}
          </div>
        </CardContent>
      </Card>

      {/* TODO: Add Clients Table & Logs de Eventos Components */}
    </div>
  )
}
