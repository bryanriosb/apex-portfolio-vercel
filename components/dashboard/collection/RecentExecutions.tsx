'use client'

import React from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Activity,
  ChevronRight,
  Users,
  Send,
  MailOpen,
  AlertTriangle,
  PlayCircle,
  CheckCircle2,
  Clock,
  Zap,
} from 'lucide-react'

interface RecentExecutionsProps {
  executions: any[]
  loading: boolean
  formatDate: (date: string | null | undefined) => string
  getStatusColor: (status: string) => string
}

const getStatusIcon = (status: string) => {
  switch (status.toLowerCase()) {
    case 'completed':
      return CheckCircle2
    case 'processing':
      return PlayCircle
    case 'pending':
      return Clock
    case 'failed':
      return AlertTriangle
    default:
      return Send
  }
}

export const RecentExecutions: React.FC<RecentExecutionsProps> = ({
  executions,
  loading,
  formatDate,
  getStatusColor,
}) => {
  return (
    <div className="space-y-3">
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">
                <h2 className="font-semibold tracking-tight flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Campañas Recientes
                </h2>
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Historial de campañas de cobro ejecutadas y su rendimiento
              </p>
            </div>
            <Link href="/admin/collection/executions">
              <Button variant="ghost" size="sm" className="h-8 text-xs">
                Ver Todas
                <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3 py-2">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          ) : executions.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <h3 className="text-sm font-semibold mb-1">
                Sin ejecuciones aún
              </h3>
              <p className="text-xs text-muted-foreground mb-3">
                Crea tu primera campaña de cobro
              </p>
              <Link href="/admin/collection/campaing">
                <Button size="sm">Crear Campaña</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {executions.slice(0, 5).map((exec) => {
                const StatusIcon = getStatusIcon(exec.status)
                return (
                  <Link
                    key={exec.id}
                    href={`/admin/collection/executions/${exec.id}`}
                    className="flex items-center gap-4 py-4 px-3 -mx-3 hover:bg-muted/50 transition-colors group border border-transparent hover:border-border"
                  >
                    {/* Icono de estado */}
                    <div
                      className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${getStatusColor(exec.status)}`}
                    >
                      <StatusIcon className="h-5 w-5" />
                    </div>

                    {/* Info principal - Expandida */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-sm truncate">
                          {exec.name}
                        </h3>
                        <Badge
                          variant="outline"
                          className="text-[10px] h-4 px-1.5 shrink-0"
                        >
                          {formatDate(exec.created_at)}
                        </Badge>
                      </div>
                      {/* Indicadores expandidos en grid */}
                      <div className="grid grid-cols-4 gap-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Users className="h-4 w-4" />
                          <span className="font-medium text-foreground">{exec.total_clients}</span> clientes
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Send className="h-4 w-4" />
                          <span className="font-medium text-foreground">{exec.emails_sent}</span> enviados
                        </span>
                        <span className="flex items-center gap-1.5">
                          <MailOpen className="h-4 w-4" />
                          <span className="font-medium text-foreground">{exec.emails_opened || 0}</span> abiertos
                        </span>
                        <span className="flex items-center gap-1.5 text-red-600">
                          <AlertTriangle className="h-4 w-4" />
                          <span className="font-medium">{exec.emails_bounced || 0}</span> fallidos
                        </span>
                      </div>
                    </div>

                    {/* Métrica de rendimiento */}
                    <div className="text-right shrink-0">
                      <div className="text-lg font-semibold leading-none">
                        {exec.avg_open_rate?.toFixed(0) || 0}%
                      </div>
                      <div className="text-xs text-muted-foreground">
                        tasa apertura
                      </div>
                    </div>

                    {/* Flecha */}
                    <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </Link>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
