'use client'

import { CollectionExecution } from '@/lib/models/collection'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Clock,
  Play,
  Mail,
  Send,
  CheckCircle2,
  XCircle,
  Zap,
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface ExecutionFlowProps {
  execution: CollectionExecution
}

interface FlowStep {
  id: string
  title: string
  description: string
  icon: any
  status: 'pending' | 'active' | 'completed' | 'error'
  timestamp?: string
  badge?: string
}

export function ExecutionFlow({ execution }: ExecutionFlowProps) {
  // Determinar timestamp para envío basado en cuando se inició
  const getSendingTimestamp = () => {
    if (execution.started_at && execution.emails_sent > 0) {
      return execution.started_at
    }
    return undefined
  }

  // Determinar timestamp para entrega basado en el primer email entregado
  // Por ahora usamos el started_at + un offset estimado o el mismo started_at
  const getDeliveringTimestamp = () => {
    if (execution.started_at && execution.emails_delivered > 0) {
      return execution.started_at
    }
    return undefined
  }

  const steps: FlowStep[] = [
    {
      id: 'pending',
      title: 'Pendiente',
      description: 'Ejecución creada y esperando inicio',
      icon: Clock,
      status: execution.status === 'pending' ? 'active' : 'completed',
      timestamp: execution.created_at,
    },
    {
      id: 'started',
      title: 'Iniciado',
      description: 'Procesamiento comenzado',
      icon: Play,
      status:
        execution.status === 'processing'
          ? 'active'
          : execution.started_at
            ? 'completed'
            : 'pending',
      timestamp: execution.started_at || undefined,
    },
    {
      id: 'sending',
      title: 'Enviando emails',
      description: `${execution.emails_sent} de ${execution.total_clients} enviados`,
      icon: Send,
      status:
        execution.status === 'processing' && execution.emails_sent > 0
          ? 'active'
          : execution.emails_sent > 0
            ? 'completed'
            : 'pending',
      timestamp: getSendingTimestamp(),
      badge: execution.emails_sent > 0 ? `${execution.emails_sent}` : undefined,
    },
    {
      id: 'delivering',
      title: 'Entregando',
      description: `${execution.emails_delivered} entregados`,
      icon: Mail,
      status:
        execution.status === 'processing' && execution.emails_delivered > 0
          ? 'active'
          : execution.emails_delivered > 0
            ? 'completed'
            : 'pending',
      timestamp: getDeliveringTimestamp(),
      badge:
        execution.emails_delivered > 0
          ? `${execution.emails_delivered}`
          : undefined,
    },
    {
      id: 'completed',
      title: execution.status === 'failed' ? 'Fallido' : 'Completado',
      description:
        execution.status === 'failed'
          ? 'La ejecución falló'
          : 'Todos los procesos finalizados',
      icon: execution.status === 'failed' ? XCircle : CheckCircle2,
      status:
        execution.status === 'completed'
          ? 'completed'
          : execution.status === 'failed'
            ? 'error'
            : 'pending',
      timestamp: execution.completed_at || undefined,
    },
  ]

  if (execution.fallback_enabled) {
    steps.push({
      id: 'fallback',
      title: 'Fallback',
      description:
        execution.fallback_sent > 0
          ? `${execution.fallback_sent} enviados`
          : 'Esperando...',
      icon: Zap,
      status: execution.fallback_sent > 0 ? 'completed' : 'pending',
      timestamp:
        execution.fallback_sent > 0
          ? execution.completed_at || undefined
          : undefined,
      badge:
        execution.fallback_sent > 0 ? `${execution.fallback_sent}` : undefined,
    })
  }

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-primary text-primary-foreground border-primary'
      case 'active':
        return 'bg-primary text-primary-foreground border-primary animate-pulse'
      case 'error':
        return 'bg-destructive text-destructive-foreground border-destructive'
      default:
        return 'bg-muted text-muted-foreground border-muted-foreground/20'
    }
  }

  const getConnectorColor = (index: number) => {
    const currentStep = steps[index]

    if (currentStep.status === 'completed') {
      return 'bg-primary'
    }
    if (currentStep.status === 'active') {
      return 'bg-primary'
    }
    return 'bg-muted'
  }

  const formatTimestamp = (timestamp: string) => {
    try {
      return format(new Date(timestamp), 'HH:mm:ss', { locale: es })
    } catch {
      return ''
    }
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base font-medium">
          Flujo de Ejecución
        </CardTitle>
      </CardHeader>
      <CardContent className="overflow-y-auto">
        <div className="relative">
          {steps.map((step, index) => {
            const Icon = step.icon
            const isLast = index === steps.length - 1

            return (
              <div key={step.id} className="flex gap-3 relative">
                {/* Connector line */}
                {!isLast && (
                  <div
                    className={`absolute left-4 top-6 w-0.5 h-full ${getConnectorColor(index)}`}
                    style={{ height: 'calc(100% - 12px)' }}
                  />
                )}

                {/* Icon - más pequeño */}
                <div
                  className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full border-2 shrink-0 ${getStatusStyles(
                    step.status
                  )}`}
                >
                  <Icon className="w-4 h-4" />
                </div>

                {/* Content */}
                <div className="flex-1 pb-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-sm">{step.title}</h4>
                        {step.badge && (
                          <Badge variant="secondary" className="text-xs">
                            {step.badge}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {step.description}
                      </p>
                    </div>
                    {/* Timestamp siempre visible */}
                    <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                      {step.timestamp ? formatTimestamp(step.timestamp) : '-'}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
