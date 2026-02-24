'use client'

import { useState, useEffect, useCallback } from 'react'
import { useActiveBusinessStore } from '@/lib/store/active-business-store'
import { EmailReputationProfile } from '@/lib/models/collection/email-reputation'
import { getReputationSummaryAction } from '@/lib/actions/collection/email-strategies'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  AlertCircle,
  CheckCircle2,
  Globe,
  TrendingUp,
  TrendingDown,
  Mail,
  AlertTriangle,
  Clock,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export function DomainReputationTab() {
  const { activeBusiness } = useActiveBusinessStore()
  const [profiles, setProfiles] = useState<EmailReputationProfile[]>([])
  const [loading, setLoading] = useState(true)

  const loadProfiles = useCallback(async () => {
    if (!activeBusiness?.id) return

    setLoading(true)
    try {
      const data = await getReputationSummaryAction(activeBusiness.id)
      setProfiles(data)
    } catch (error) {
      console.error('Error loading reputation profiles:', error)
      toast.error('Error al cargar los perfiles de reputación')
    } finally {
      setLoading(false)
    }
  }, [activeBusiness?.id])

  useEffect(() => {
    loadProfiles()
  }, [loadProfiles])

  const getRateColor = (rate: number, type: 'good' | 'bad' = 'good') => {
    if (type === 'good') {
      if (rate >= 90) return 'text-green-600'
      if (rate >= 70) return 'text-yellow-600'
      return 'text-red-600'
    } else {
      if (rate <= 2) return 'text-green-600'
      if (rate <= 5) return 'text-yellow-600'
      return 'text-red-600'
    }
  }

  const getProgressColor = (rate: number, type: 'good' | 'bad' = 'good') => {
    if (type === 'good') {
      if (rate >= 90) return 'bg-green-600'
      if (rate >= 70) return 'bg-yellow-600'
      return 'bg-red-600'
    } else {
      if (rate <= 2) return 'bg-green-600'
      if (rate <= 5) return 'bg-yellow-600'
      return 'bg-red-600'
    }
  }

  if (!activeBusiness?.id) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center">
        <p className="text-muted-foreground">
          Selecciona una sucursal para ver los dominios configurados
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="h-20 bg-muted" />
            <CardContent className="h-40 bg-muted mt-2" />
          </Card>
        ))}
      </div>
    )
  }

  if (profiles.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center">
        <Globe className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">Sin dominios configurados</h3>
        <p className="text-muted-foreground max-w-md mx-auto mb-4">
          Los dominios se configuran automáticamente al crear estrategias de envío o al usar el wizard de cobros.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Reputación de Dominios</h3>
          <p className="text-sm text-muted-foreground">
            Monitorea el estado y métricas de tus dominios de envío
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          {profiles.length} dominio{profiles.length !== 1 && 's'} configurado
          {profiles.length !== 1 && 's'}
        </div>
      </div>

      <div className="grid gap-6">
        {profiles.map((profile) => (
          <Card key={profile.id}>
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'p-2 rounded-lg',
                      profile.has_reputation_issues
                        ? 'bg-red-100 text-red-700'
                        : profile.is_warmed_up
                          ? 'bg-green-100 text-green-700'
                          : 'bg-blue-100 text-blue-700'
                    )}
                  >
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{profile.domain}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      {profile.is_warmed_up ? (
                        <Badge variant="default" className="bg-green-600">
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
                <div className="text-right">
                  <div className="text-sm font-medium">
                    {profile.total_emails_sent.toLocaleString()} emails enviados
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {profile.daily_sending_limit.toLocaleString()}/día límite
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Delivery Rate */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      Delivery Rate
                    </span>
                    <span
                      className={cn(
                        'font-medium',
                        getRateColor(Math.min(100, profile.delivery_rate), 'good')
                      )}
                    >
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

                {/* Open Rate */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      Open Rate
                    </span>
                    <span
                      className={cn(
                        'font-medium',
                        getRateColor(Math.min(100, profile.open_rate), 'good')
                      )}
                    >
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

                {/* Bounce Rate */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <TrendingDown className="w-3 h-3" />
                      Bounce Rate
                    </span>
                    <span
                      className={cn(
                        'font-medium',
                        getRateColor(profile.bounce_rate, 'bad')
                      )}
                    >
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

                {/* Complaint Rate */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Complaint Rate
                    </span>
                    <span
                      className={cn(
                        'font-medium',
                        getRateColor(profile.complaint_rate, 'bad')
                      )}
                    >
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

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-4 border-t">
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
                  <div className="text-xs text-muted-foreground">Bounces</div>
                </div>
                <div>
                  <div className="text-2xl font-semibold text-amber-600">
                    {profile.total_complaints.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground">Quejas</div>
                </div>
              </div>

              {/* Provider Info */}
              <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm">
                <div className="text-muted-foreground">
                  Proveedor: <span className="font-medium text-foreground">{profile.provider || 'N/A'}</span>
                  {profile.sending_ip && (
                    <>
                      {' '}
                      | IP: <span className="font-medium text-foreground">{profile.sending_ip}</span>
                    </>
                  )}
                </div>
                <div className="text-muted-foreground">
                  Estrategia actual:{' '}
                  <span className="font-medium text-foreground capitalize">
                    {profile.current_strategy.replace('_', '-')}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
