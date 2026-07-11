'use client'

import { useEffect, useRef } from 'react'
import { useSidebar } from '@/components/ui/sidebar'
import { useGlobalChatStore } from '@/lib/store/global-chat-store'
import { useIsMobile } from '@/hooks/use-mobile'

export function SidebarSync() {
  const { isPanelOpen } = useGlobalChatStore()
  const { setOpen } = useSidebar()
  const isMobile = useIsMobile()
  const prevPanelOpen = useRef(isPanelOpen)

  useEffect(() => {
    if (isMobile) return

    if (isPanelOpen && !prevPanelOpen.current) {
      setOpen(false)
    } else if (!isPanelOpen && prevPanelOpen.current) {
      setOpen(true)
    }

    prevPanelOpen.current = isPanelOpen
  }, [isPanelOpen, isMobile, setOpen])

  return null
}
