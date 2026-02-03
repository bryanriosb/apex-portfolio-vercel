'use client'

import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Plan } from '@/lib/models/plan/plan'
import type { BillingCycle } from '@/lib/models/subscription/subscription'
import { FEATURES } from './const/features'

interface PlanPricingCardProps {
  plan: Plan
  billingCycle: BillingCycle
  isCurrentPlan?: boolean
  isPopular?: boolean
  onSelect: (planId: string) => void
  isLoading?: boolean
}

export function PlanPricingCard({
  plan,
  billingCycle,
  isCurrentPlan = false,
  isPopular = false,
  onSelect,
  isLoading = false,
}: PlanPricingCardProps) {
  const price =
    billingCycle === 'yearly'
      ? plan.yearly_price_cents / 100
      : plan.monthly_price_cents / 100

  const monthlyEquivalent =
    billingCycle === 'yearly'
      ? plan.yearly_price_cents / 100 / 12
      : plan.monthly_price_cents / 100

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  return (
    <Card
      className={cn(
        'relative flex flex-col',
        isPopular && 'border-primary shadow-lg scale-105',
        isCurrentPlan && 'border-green-500'
      )}
    >
      {isPopular && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
          Más Popular
        </Badge>
      )}

      {isCurrentPlan && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-secondary text-white">
          Plan Actual
        </Badge>
      )}

      <CardHeader className="text-center pb-2">
        <CardTitle className="text-xl">{plan.name}</CardTitle>
        <CardDescription>{plan.description}</CardDescription>
      </CardHeader>

      <CardContent className="flex-1">
        <div className="text-center mb-6">
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-4xl font-bold">
              {formatCurrency(
                billingCycle === 'yearly' ? monthlyEquivalent : price
              )}
            </span>
            <span className="text-muted-foreground">/mes</span>
          </div>

          {billingCycle === 'yearly' && (
            <div className="mt-1 space-y-1">
              <p className="text-sm text-muted-foreground">
                {formatCurrency(price)} facturado anualmente
              </p>
              <Badge variant="secondary" className="text-white">
                Ahorra {plan.yearly_discount_percent}%
              </Badge>
            </div>
          )}
        </div>

        <ul className="space-y-3">
          {FEATURES(plan).map((feature, index) => (
            <li key={index} className="flex items-start gap-2">
              <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
              <span className="text-sm">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter>
        <Button
          className="w-full"
          variant={isPopular ? 'default' : 'outline'}
          disabled={isCurrentPlan || isLoading}
          onClick={() => onSelect(plan.id)}
        >
          {isCurrentPlan ? 'Plan Actual' : 'Seleccionar'}
        </Button>
      </CardFooter>
    </Card>
  )
}
