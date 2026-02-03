'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { MessageSquare } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import ChatSheet from './ChatSheet'

interface ChatButtonProps {
  unreadCount?: number
}

export default function ChatButton({ unreadCount = 0 }: ChatButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        className="relative"
        onClick={() => setIsOpen(true)}
      >
        <MessageSquare className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 text-xs"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      <ChatSheet open={isOpen} onOpenChange={setIsOpen} />
    </>
  )
}
