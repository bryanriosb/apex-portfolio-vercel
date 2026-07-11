'use client'

import { useState } from 'react'
import { BrainCircuit } from 'lucide-react'
import { ModelSelectorLogo } from '@/components/ai-elements/model-selector'
import { cn } from '@/lib/utils'

// Ids internos que difieren del id de models.dev (fuente de los logos)
const LOGO_ALIASES: Record<string, string> = {
  gemini: 'google',
  meta: 'llama',
}

interface ProviderLogoProps {
  provider: string
  className?: string
}

export function ProviderLogo({ provider, className }: ProviderLogoProps) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <BrainCircuit
        className={cn('size-4 shrink-0 text-muted-foreground', className)}
      />
    )
  }

  return (
    <ModelSelectorLogo
      provider={LOGO_ALIASES[provider] ?? provider}
      className={cn('size-4 shrink-0', className)}
      onError={() => setFailed(true)}
    />
  )
}
