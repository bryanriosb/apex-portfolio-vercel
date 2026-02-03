'use client'

import { CreditCard, Calendar, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useSubscriptionStatus } from '@/hooks/use-subscription-status'
import { Skeleton } from '@/components/ui/skeleton'

export function SubscriptionStatus() {
  const {
    status,
    isLoading,
    isExpired,
    isInGracePeriod,
    daysRemaining,
    paymentStatus,
  } = useSubscriptionStatus()

  if (isLoading) {
    return <SubscriptionStatusSkeleton />
  }

  if (!status) {
    return null
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value)
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A'
    return new Date(dateStr).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  }

  const getStatusBadge = () => {
    switch (paymentStatus) {
      case 'active':
        return <Badge className="bg-green-500">Activa</Badge>
      case 'pending':
        return <Badge variant="secondary">Pendiente</Badge>
      case 'paused':
        return <Badge className="bg-amber-500">Pausada</Badge>
      case 'failed':
        return <Badge variant="destructive">Fallida</Badge>
      case 'cancelled':
        return <Badge variant="destructive">Cancelada</Badge>
      default:
        return <Badge variant="outline">Sin suscripción</Badge>
    }
  }

  const getProgressValue = () => {
    if (!daysRemaining || daysRemaining < 0) return 0
    const totalDays = status.billingCycle === 'yearly' ? 365 : 30
    return Math.min(100, ((totalDays - daysRemaining) / totalDays) * 100)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Estado de Suscripción
            </CardTitle>
            <CardDescription>
              {status.planName || 'Sin plan activo'}
            </CardDescription>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {isInGracePeriod && (
          <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">
                Período de Gracia
              </p>
              <p className="text-xs text-amber-700">
                Tu suscripción ha vencido. Tienes {daysRemaining} día(s) para renovar
                antes de perder el acceso.
              </p>
            </div>
          </div>
        )}

        {isExpired && (
          <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">
                Suscripción Expirada
              </p>
              <p className="text-xs text-red-700">
                Por favor, renueva tu suscripción para continuar usando la plataforma.
              </p>
            </div>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Ciclo de Facturación</p>
            <p className="font-medium">
              {status.billingCycle === 'yearly' ? 'Anual' : 'Mensual'}
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Precio</p>
            <p className="font-medium">
              {formatCurrency(
                status.billingCycle === 'yearly'
                  ? status.yearlyPrice
                  : status.monthlyPrice
              )}
              {status.billingCycle === 'yearly' ? '/año' : '/mes'}
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Próximo Cobro
            </p>
            <p className="font-medium">{formatDate(status.expiresAt)}</p>
          </div>

          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Último Pago</p>
            <p className="font-medium">{formatDate(status.lastPaymentAt)}</p>
          </div>
        </div>

        {paymentStatus === 'active' && daysRemaining !== null && daysRemaining > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tiempo restante</span>
              <span className="font-medium">{daysRemaining} días</span>
            </div>
            <Progress value={getProgressValue()} className="h-2" />
          </div>
        )}

        {paymentStatus === 'active' && (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle2 className="h-4 w-4" />
            <span>Tu suscripción está activa y al día</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function SubscriptionStatusSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-6 w-20" />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-32" />
            </div>
          ))}
        </div>
        <Skeleton className="h-2 w-full" />
      </CardContent>
    </Card>
  )
}
