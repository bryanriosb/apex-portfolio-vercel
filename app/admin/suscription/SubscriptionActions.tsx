'use client'

import { useState } from 'react'
import { Pause, Play, XCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { useActiveBusinessStore } from '@/lib/store/active-business-store'
import { useSubscriptionStatus } from '@/hooks/use-subscription-status'
import {
  pauseSubscriptionAction,
  reactivateSubscriptionAction,
  cancelSubscriptionAction,
} from '@/lib/actions/subscription'

export function SubscriptionActions() {
  const router = useRouter()
  const { activeBusiness } = useActiveBusinessStore()
  const { paymentStatus, refetch } = useSubscriptionStatus()
  const [isLoading, setIsLoading] = useState<string | null>(null)

  const businessAccountId = activeBusiness?.business_account_id

  if (!businessAccountId || paymentStatus === 'none') {
    return null
  }

  const handlePause = async () => {
    setIsLoading('pause')
    const result = await pauseSubscriptionAction(businessAccountId)

    if (result.success) {
      toast.success('Suscripción pausada')
      refetch()
      router.refresh()
    } else {
      toast.error(result.error || 'Error al pausar la suscripción')
    }
    setIsLoading(null)
  }

  const handleReactivate = async () => {
    setIsLoading('reactivate')
    const result = await reactivateSubscriptionAction(businessAccountId)

    if (result.success) {
      toast.success('Suscripción reactivada')
      refetch()
      router.refresh()
    } else {
      toast.error(result.error || 'Error al reactivar la suscripción')
    }
    setIsLoading(null)
  }

  const handleCancel = async () => {
    setIsLoading('cancel')
    const result = await cancelSubscriptionAction(businessAccountId)

    if (result.success) {
      toast.success('Suscripción cancelada')
      refetch()
      router.refresh()
    } else {
      toast.error(result.error || 'Error al cancelar la suscripción')
    }
    setIsLoading(null)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Acciones de Suscripción</CardTitle>
        <CardDescription>
          Administra el estado de tu suscripción
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-wrap gap-3">
        {paymentStatus === 'active' && (
          <Button
            variant="outline"
            onClick={handlePause}
            disabled={isLoading !== null}
          >
            {isLoading === 'pause' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Pause className="mr-2 h-4 w-4" />
            )}
            Pausar Suscripción
          </Button>
        )}

        {paymentStatus === 'paused' && (
          <Button onClick={handleReactivate} disabled={isLoading !== null}>
            {isLoading === 'reactivate' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            Reactivar Suscripción
          </Button>
        )}

        {(paymentStatus === 'active' || paymentStatus === 'paused') && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={isLoading !== null}>
                <XCircle className="mr-2 h-4 w-4" />
                Cancelar Suscripción
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Cancelar suscripción?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acción cancelará tu suscripción. Perderás acceso a las
                  funcionalidades premium cuando expire el período actual.
                  Esta acción no se puede deshacer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Mantener Suscripción</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleCancel}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isLoading === 'cancel' ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Sí, Cancelar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </CardContent>
    </Card>
  )
}
