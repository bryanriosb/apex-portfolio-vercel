'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { PaymentSuccess } from '@/components/subscription/PaymentSuccess'
import { Loader2 } from 'lucide-react'

export default function BillingSuccessPage() {
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(true)

  const planName = searchParams.get('plan') || undefined
  const billingCycle = (searchParams.get('cycle') as 'monthly' | 'yearly') || 'monthly'
  const amount = searchParams.get('amount') ? Number(searchParams.get('amount')) : undefined

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 500)

    return () => clearTimeout(timer)
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <PaymentSuccess
      planName={planName}
      billingCycle={billingCycle}
      amount={amount}
    />
  )
}
