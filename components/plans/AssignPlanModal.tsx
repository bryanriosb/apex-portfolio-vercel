'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { Plan } from '@/lib/models/plan/plan'
import type { BusinessAccountWithPlan } from '@/lib/services/plan/plan-service'
import { Loader2, CreditCard, Building2, XCircle } from 'lucide-react'

interface AssignPlanModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  account: BusinessAccountWithPlan | null
  accountCount: number
  plans: Plan[]
  onAssign: (planId: string | null) => Promise<void>
}

function formatPrice(cents: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

const billingPeriodLabels = {
  monthly: '/mes',
  yearly: '/año',
  lifetime: 'único',
}

export function AssignPlanModal({
  open,
  onOpenChange,
  account,
  accountCount,
  plans,
  onAssign,
}: AssignPlanModalProps) {
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isBulk = !account && accountCount > 1
  const currentPlanId = account?.plan_id || null

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSelectedPlanId(null)
    }
    onOpenChange(newOpen)
  }

  const handleAssign = async () => {
    setIsSubmitting(true)
    try {
      await onAssign(selectedPlanId)
      handleOpenChange(false)
    } catch (error) {
      console.error('Error assigning plan:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isBulk ? 'Asignar Plan a Múltiples Cuentas' : 'Asignar Plan'}
          </DialogTitle>
          <DialogDescription>
            {isBulk ? (
              <>Selecciona el plan para asignar a {accountCount} cuenta(s)</>
            ) : account ? (
              <div className="flex items-center gap-2 mt-2">
                <Building2 className="h-4 w-4" />
                <span className="font-medium">{account.company_name}</span>
                {account.plan && (
                  <Badge variant="secondary" className="ml-2">
                    Plan actual: {account.plan.name}
                  </Badge>
                )}
              </div>
            ) : (
              'Selecciona un plan'
            )}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[400px] pr-4">
          <RadioGroup
            value={selectedPlanId || 'none'}
            onValueChange={(value: string) => setSelectedPlanId(value === 'none' ? null : value)}
            className="space-y-3"
          >
            {/* Opción sin plan */}
            <div
              className={`flex items-center space-x-3 rounded-lg border p-4 cursor-pointer hover:bg-accent/50 transition-colors ${
                selectedPlanId === null ? 'border-primary bg-accent/30' : ''
              }`}
              onClick={() => setSelectedPlanId(null)}
            >
              <RadioGroupItem value="none" id="plan-none" />
              <Label htmlFor="plan-none" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium">Sin Plan</div>
                    <div className="text-xs text-muted-foreground">
                      Remover el plan asignado
                    </div>
                  </div>
                </div>
              </Label>
            </div>

            {/* Lista de planes */}
            {plans.map((plan) => {
              const isCurrentPlan = plan.id === currentPlanId
              return (
                <div
                  key={plan.id}
                  className={`flex items-start space-x-3 rounded-lg border p-4 cursor-pointer hover:bg-accent/50 transition-colors ${
                    selectedPlanId === plan.id ? 'border-primary bg-accent/30' : ''
                  } ${isCurrentPlan ? 'opacity-60' : ''}`}
                  onClick={() => !isCurrentPlan && setSelectedPlanId(plan.id)}
                >
                  <RadioGroupItem
                    value={plan.id}
                    id={`plan-${plan.id}`}
                    disabled={isCurrentPlan}
                  />
                  <Label
                    htmlFor={`plan-${plan.id}`}
                    className="flex-1 cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-primary" />
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {plan.name}
                            {isCurrentPlan && (
                              <Badge variant="outline" className="text-xs">
                                Actual
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {plan.description}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">
                          {formatPrice(plan.price_cents)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {billingPeriodLabels[plan.billing_period]}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <Badge variant="secondary" className="text-xs">
                        {plan.max_businesses} negocio(s)
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {plan.max_users_per_business} usuarios
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {plan.max_specialists_per_business} especialistas
                      </Badge>
                    </div>
                  </Label>
                </div>
              )
            })}
          </RadioGroup>
        </ScrollArea>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button onClick={handleAssign} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {selectedPlanId ? 'Asignar Plan' : 'Remover Plan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
