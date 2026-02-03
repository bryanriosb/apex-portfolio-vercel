'use client'

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '.'

interface BuildTooltipProps {
  trigger: React.ReactNode
  content: string
}

export default function BuildTooltip({ trigger, content }: BuildTooltipProps) {
  if (!content) {
    return trigger
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {trigger}
        </TooltipTrigger>
        <TooltipContent>{content}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
