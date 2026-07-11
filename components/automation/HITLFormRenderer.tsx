import { DynamicUIRenderer } from '@/components/ui/DynamicUIRenderer'
import type { Component, UiEvent } from '@zavora-ai/adk-ui-react'

interface HITLFormRendererProps {
  components: Component[] | any[]
  theme?: 'light' | 'dark' | 'system'
  onAction: (event: UiEvent) => void
}

export function HITLFormRenderer({ components, theme = 'light', onAction }: HITLFormRendererProps) {
  return <DynamicUIRenderer components={components} theme={theme} onAction={onAction} />
}
