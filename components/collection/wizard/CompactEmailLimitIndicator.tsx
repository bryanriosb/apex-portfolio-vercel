'use client'

import { useState, useEffect } from 'react'
import { Mail, Loader2 } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { getAccountEmailLimitInfoAction } from '@/lib/actions/business-account'

interface CompactEmailLimitIndicatorProps {
  businessAccountId: string
}

interface LimitInfo {
  maxEmails: number | null
  emailsSent: number
  emailsRemaining: number | null
  hasReachedLimit: boolean
}

export function CompactEmailLimitIndicator({
  businessAccountId,
}: CompactEmailLimitIndicatorProps) {
  const [limitInfo, setLimitInfo] = useState<LimitInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadLimitInfo()
  }, [businessAccountId])

  const loadLimitInfo = async () => {
    if (!businessAccountId) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)

    try {
      const { data } = await getAccountEmailLimitInfoAction(businessAccountId)
      if (data) {
        setLimitInfo(data)
      }
    } catch (err) {
      console.error('Error loading email limit:', err)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Cargando...</span>
      </div>
    )
  }

  if (!limitInfo || limitInfo.maxEmails === null) {
    return null
  }

  const percentage = Math.min(
    100,
    (limitInfo.emailsSent / limitInfo.maxEmails) * 100
  )

  return (
    <div className="flex items-center gap-3 flex-1">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Mail className="h-3.5 w-3.5" />
        <span className="text-xs">Límite de Correos:</span>
      </div>

      <div className="flex-1 max-w-[200px]">
        <Progress value={percentage} className="h-1.5" />
      </div>

      <div className="flex items-center gap-1 text-xs">
        <span className="font-medium text-foreground">
          {limitInfo.emailsSent}
        </span>
        <span className="text-muted-foreground">/</span>
        <span className="text-muted-foreground">{limitInfo.maxEmails}</span>
        <span className="text-muted-foreground">
          ({limitInfo.emailsRemaining} restantes)
        </span>
      </div>
    </div>
  )
}
