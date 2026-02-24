'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import {
  Shield,
  Globe,
  Mail,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Clock,
} from 'lucide-react'
import { EmailReputationProfile } from '@/lib/models/collection/email-reputation'
import { cn } from '@/lib/utils'

interface ReputationOverviewProps {
  profiles: EmailReputationProfile[]
  loading: boolean
}

const getRateColor = (rate: number, type: 'good' | 'bad' = 'good') => {
  if (type === 'good') {
    if (rate >= 90) return 'text-primary'
    if (rate >= 70) return 'text-yellow-600'
    return 'text-red-600'
  } else {
    if (rate <= 2) return 'text-primary'
    if (rate <= 5) return 'text-yellow-600'
    return 'text-red-600'
  }
}

const getProgressColor = (rate: number, type: 'good' | 'bad' = 'good') => {
  if (type === 'good') {
    if (rate >= 90) return 'bg-primary'
    if (rate >= 70) return 'bg-yellow-600'
    return 'bg-red-600'
  } else {
    if (rate <= 2) return 'bg-primary'
    if (rate <= 5) return 'bg-yellow-600'
    return 'bg-red-600'
  }
}

export const ReputationOverview: React.FC<ReputationOverviewProps> = ({
  profiles,
  loading,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-semibold tracking-tight flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Reputación de Dominios
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Monitor de reputación de envío para evitar bloqueos y mejorar entregabilidad
          </p>
        </div>
        {!loading && (
          <span className="text-sm text-muted-foreground shrink-0">
            {profiles.length} dominio{profiles.length !== 1 ? 's' : ''} configurado{profiles.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <Card key={i} className="rounded-none border shadow-none">
              <CardHeader className="pb-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-2 w-full" />
                <Skeleton className="h-2 w-full" />
                <Skeleton className="h-2 w-full" />
                <div className="grid grid-cols-4 gap-2 pt-2">
                  {[1, 2, 3, 4].map((j) => (
                    <Skeleton key={j} className="h-10 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : profiles.length === 0 ? (
        <Card className="rounded-none border border-dashed py-12">
          <div className="text-center">
            <Globe className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Sin dominios configurados</h3>
            <p className="text-muted-foreground text-sm">
              Los dominios se configuran automáticamente al crear estrategias de envío
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {profiles.map((profile) => (
            <Card key={profile.id} className="rounded-none border shadow-none">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'p-2 rounded-lg shrink-0',
                        profile.has_reputation_issues
                          ? 'bg-red-100 text-red-700'
                          : profile.is_warmed_up
                            ? 'bg-primary/10 text-primary'
                            : 'bg-blue-100 text-blue-700'
                      )}
                    >
                      <Globe className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate">{profile.domain}</CardTitle>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {profile.is_warmed_up ? (
                          <Badge variant="default" className="bg-primary">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Calentado
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <Clock className="w-3 h-3 mr-1" />
                            En calentamiento (Día {profile.current_warmup_day})
                          </Badge>
                        )}
                        {profile.has_reputation_issues && (
                          <Badge variant="destructive">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Problemas de reputación
                          </Badge>
                        )}
                        {profile.is_under_review && (
                          <Badge variant="outline" className="border-amber-500 text-amber-600">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            En revisión
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-medium">
                      {profile.total_emails_sent.toLocaleString()} enviados
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {profile.daily_sending_limit.toLocaleString()}/día límite
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                {/* Progress bars */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        Entregados
                      </span>
                      <span className={cn('font-medium', getRateColor(Math.min(100, profile.delivery_rate), 'good'))}>
                        {Math.min(100, profile.delivery_rate).toFixed(1)}%
                      </span>
                    </div>
                    <Progress
                      value={Math.min(100, profile.delivery_rate)}
                      className="h-2"
                      // @ts-ignore
                      indicatorClassName={getProgressColor(profile.delivery_rate, 'good')}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        Apertura
                      </span>
                      <span className={cn('font-medium', getRateColor(Math.min(100, profile.open_rate), 'good'))}>
                        {Math.min(100, profile.open_rate).toFixed(1)}%
                      </span>
                    </div>
                    <Progress
                      value={Math.min(100, profile.open_rate)}
                      className="h-2"
                      // @ts-ignore
                      indicatorClassName={getProgressColor(profile.open_rate, 'good')}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <TrendingDown className="w-3 h-3" />
                        Rebotes
                      </span>
                      <span className={cn('font-medium', getRateColor(profile.bounce_rate, 'bad'))}>
                        {profile.bounce_rate.toFixed(1)}%
                      </span>
                    </div>
                    <Progress
                      value={Math.min(profile.bounce_rate * 10, 100)}
                      className="h-2"
                      // @ts-ignore
                      indicatorClassName={getProgressColor(profile.bounce_rate, 'bad')}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Quejas
                      </span>
                      <span className={cn('font-medium', getRateColor(profile.complaint_rate, 'bad'))}>
                        {profile.complaint_rate.toFixed(2)}%
                      </span>
                    </div>
                    <Progress
                      value={Math.min(profile.complaint_rate * 20, 100)}
                      className="h-2"
                      // @ts-ignore
                      indicatorClassName={getProgressColor(profile.complaint_rate, 'bad')}
                    />
                  </div>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-4 border-t">
                  <div>
                    <div className="text-2xl font-semibold">
                      {profile.total_emails_delivered.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">Entregados</div>
                  </div>
                  <div>
                    <div className="text-2xl font-semibold">
                      {profile.total_emails_opened.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">Abiertos</div>
                  </div>
                  <div>
                    <div className="text-2xl font-semibold text-red-600">
                      {profile.total_emails_bounced.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">Rebotes</div>
                  </div>
                  <div>
                    <div className="text-2xl font-semibold text-amber-600">
                      {profile.total_complaints.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">Quejas</div>
                  </div>
                </div>

                {/* Footer: IP + estrategia (sin proveedor) */}
                {(profile.sending_ip || profile.current_strategy) && (
                  <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm text-muted-foreground">
                    {profile.sending_ip && (
                      <div>
                        IP: <span className="font-medium text-foreground">{profile.sending_ip}</span>
                      </div>
                    )}
                    {profile.current_strategy && (
                      <div>
                        Estrategia:{' '}
                        <span className="font-medium text-foreground capitalize">
                          {profile.current_strategy.replace('_', '-')}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
