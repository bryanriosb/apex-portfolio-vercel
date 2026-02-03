'use client'

import { AlertCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useState } from 'react'

interface SubscriptionWarningBannerProps {
  message: string
}

export function SubscriptionWarningBanner({ message }: SubscriptionWarningBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false)

  if (isDismissed) return null

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
      <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800">{message}</p>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-100">
            <Link href="/admin/suscription">
              Renovar Ahora
            </Link>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-amber-600 hover:text-amber-800 hover:bg-amber-100"
            onClick={() => setIsDismissed(true)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
