'use client'

import { useState, useEffect } from 'react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PlanPricingCard } from './PlanPricingCard'
import { getActivePlansWithPricingAction } from '@/lib/actions/subscription'
import { Skeleton } from '@/components/ui/skeleton'
import type { Plan } from '@/lib/models/plan/plan'
import type { BillingCycle } from '@/lib/models/subscription/subscription'

interface PlanSelectorProps {
  currentPlanId?: string | null
  onSelectPlan: (planId: string, billingCycle: BillingCycle) => void
  isLoading?: boolean
}

export function PlanSelector({
  currentPlanId,
  onSelectPlan,
  isLoading = false,
}: PlanSelectorProps) {
  const [plans, setPlans] = useState<Plan[]>([])
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly')
  const [loadingPlans, setLoadingPlans] = useState(true)

  useEffect(() => {
    const fetchPlans = async () => {
      setLoadingPlans(true)
      const data = await getActivePlansWithPricingAction()
      setPlans(data)
      setLoadingPlans(false)
    }

    fetchPlans()
  }, [])

  const handleSelectPlan = (planId: string) => {
    onSelectPlan(planId, billingCycle)
  }

  if (loadingPlans) {
    return <PlanSelectorSkeleton />
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-center">
        <Tabs
          value={billingCycle}
          onValueChange={(v) => setBillingCycle(v as BillingCycle)}
          className="w-auto"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="monthly" className="px-8">
              Mensual
            </TabsTrigger>
            <TabsTrigger value="yearly" className="px-8">
              Anual
              <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                Mejor precio
              </span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
        {plans.map((plan) => (
          <PlanPricingCard
            key={plan.id}
            plan={plan}
            billingCycle={billingCycle}
            isCurrentPlan={plan.id === currentPlanId}
            isPopular={plan.code === 'pro'}
            onSelect={handleSelectPlan}
            isLoading={isLoading}
          />
        ))}
      </div>
    </div>
  )
}

function PlanSelectorSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex justify-center">
        <Skeleton className="h-10 w-64" />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-6">
            <Skeleton className="h-6 w-24 mx-auto mb-2" />
            <Skeleton className="h-4 w-32 mx-auto mb-6" />
            <Skeleton className="h-10 w-full mb-6" />
            <div className="space-y-3">
              {[1, 2, 3, 4].map((j) => (
                <Skeleton key={j} className="h-4 w-full" />
              ))}
            </div>
            <Skeleton className="h-10 w-full mt-6" />
          </Card>
        ))}
      </div>
    </div>
  )
}

import { Card } from '@/components/ui/card'
