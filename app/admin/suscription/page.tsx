'use client'

import { useState, useEffect } from 'react'
import { Settings, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useActiveBusinessStore } from '@/lib/store/active-business-store'
import { getPlanByIdAction } from '@/lib/actions/plan'
import { getBusinessAccountAction } from '@/lib/actions/business-account'
import { PlanSelector } from '@/components/subscription/PlanSelector'
import { CheckoutForm } from '@/components/subscription/CheckoutForm'
import { SubscriptionStatus } from '@/components/subscription/SubscriptionStatus'
import { PaymentHistory } from '@/components/subscription/PaymentHistory'
import { SavedCardsManager } from '@/components/subscription/SavedCardsManager'
import { SubscriptionActions } from './SubscriptionActions'
import type { Plan } from '@/lib/models/plan/plan'
import type { BillingCycle } from '@/lib/models/subscription/subscription'

export default function SuscriptionPage() {
  const router = useRouter()
  const { activeBusiness } = useActiveBusinessStore()
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [selectedCycle, setSelectedCycle] = useState<BillingCycle>('monthly')
  const [showCheckout, setShowCheckout] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null)

  useEffect(() => {
    const fetchAccountPlan = async () => {
      if (!activeBusiness?.business_account_id) return
      const account = await getBusinessAccountAction(
        activeBusiness.business_account_id
      )
      if (account) {
        setCurrentPlanId(account.plan_id)
      }
    }
    fetchAccountPlan()
  }, [activeBusiness?.business_account_id])

  const handleSelectPlan = async (
    planId: string,
    billingCycle: BillingCycle
  ) => {
    setIsLoading(true)
    const plan = await getPlanByIdAction(planId)
    if (plan) {
      setSelectedPlan(plan)
      setSelectedCycle(billingCycle)
      setShowCheckout(true)
    }
    setIsLoading(false)
  }

  const handleCheckoutSuccess = async () => {
    setShowCheckout(false)
    setSelectedPlan(null)

    // Refresh account data to get updated plan
    if (activeBusiness?.business_account_id) {
      const account = await getBusinessAccountAction(
        activeBusiness.business_account_id
      )
      if (account?.plan_id) {
        setCurrentPlanId(account.plan_id)
      }
    }

    router.refresh()
  }

  const handleCheckoutCancel = () => {
    setShowCheckout(false)
    setSelectedPlan(null)
  }

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              Suscripción
            </h1>
            <p className="text-muted-foreground">
              Administra tu plan y métodos de pago
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="subscription" className="space-y-6">
        <TabsList>
          <TabsTrigger value="subscription">Mi Suscripción</TabsTrigger>
          <TabsTrigger value="plans">Cambiar Plan</TabsTrigger>
          <TabsTrigger value="payment-methods">Métodos de Pago</TabsTrigger>
          <TabsTrigger value="history">Historial</TabsTrigger>
        </TabsList>

        <TabsContent value="subscription" className="space-y-6">
          <SubscriptionStatus />
          <SubscriptionActions />
        </TabsContent>

        <TabsContent value="payment-methods">
          <SavedCardsManager />
        </TabsContent>

        <TabsContent value="plans">
          <div className="space-y-4">
            <div className="text-center max-w-2xl mx-auto mb-8">
              <h2 className="text-xl font-semibold mb-2">
                Elige el plan perfecto para tu negocio
              </h2>
              <p className="text-muted-foreground">
                Todos los planes incluyen acceso a las funcionalidades básicas.
                Actualiza para desbloquear más características.
              </p>
            </div>

            <PlanSelector
              currentPlanId={currentPlanId}
              onSelectPlan={handleSelectPlan}
              isLoading={isLoading}
            />
          </div>
        </TabsContent>

        <TabsContent value="history">
          <PaymentHistory />
        </TabsContent>
      </Tabs>

      <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
        <DialogContent
          className="sm:max-w-lg"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Completar Suscripción</DialogTitle>
            <DialogDescription>
              Ingresa los datos de tu tarjeta para activar tu suscripción
            </DialogDescription>
          </DialogHeader>

          {selectedPlan && (
            <CheckoutForm
              plan={selectedPlan}
              billingCycle={selectedCycle}
              onSuccess={handleCheckoutSuccess}
              onCancel={handleCheckoutCancel}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
