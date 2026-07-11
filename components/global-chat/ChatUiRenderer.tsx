'use client'

import { DynamicUIRenderer } from '@/components/ui/DynamicUIRenderer'
import type { Component, UiEvent } from '@zavora-ai/adk-ui-react'

interface ChatUiRendererProps {
  components: Component[] | any[]
  theme?: 'light' | 'dark' | 'system'
  onAction: (event: UiEvent) => void
  isStreaming?: boolean
  disabled?: boolean
}

export function ChatUiRenderer({ components, theme = 'light', onAction, isStreaming = false, disabled = false }: ChatUiRendererProps) {
  return (
    <DynamicUIRenderer
      components={components}
      theme={theme}
      onAction={onAction}
      compact
      isStreaming={isStreaming}
      isDisabled={disabled}
    />
  )
}
