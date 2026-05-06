'use client'

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '.'

interface BuildTooltipProps {
  trigger: React.ReactNode
  content: string
  asChild?: boolean
}

export default function BuildTooltip({ trigger, content, asChild = true }: BuildTooltipProps) {
  if (!content) {
    return trigger
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild={asChild}>
          {trigger}
        </TooltipTrigger>
        <TooltipContent>{content}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
