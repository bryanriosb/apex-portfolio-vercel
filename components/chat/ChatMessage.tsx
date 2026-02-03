'use client'

import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Message } from '@/lib/models/chat/message'
import { cn } from '@/lib/utils'
import { useState } from 'react'

interface ChatMessageProps {
  message: Message
  isOwn: boolean
}

export default function ChatMessage({ message, isOwn }: ChatMessageProps) {
  const [imageError, setImageError] = useState(false)

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return format(date, 'HH:mm', { locale: es })
  }

  // Detectar si el contenido es una imagen
  const isImage =
    !imageError &&
    (message.content.includes('chat-media') ||
      /\.(jpg|jpeg|png|gif|webp)$/i.test(message.content))

  return (
    <div
      className={cn('flex w-full', isOwn ? 'justify-end' : 'justify-start')}
    >
      <div
        className={cn(
          'max-w-[75%] rounded-lg',
          isImage ? 'p-1' : 'px-4 py-2',
          isOwn
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-foreground'
        )}
      >
        {isImage ? (
          <div className="space-y-1">
            <img
              src={message.content}
              alt="Imagen del chat"
              className="rounded-md max-w-xs w-full h-auto object-cover"
              onError={() => setImageError(true)}
              loading="lazy"
            />
            <p
              className={cn(
                'text-xs px-2 pb-1',
                isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
              )}
            >
              {formatTime(message.created_at)}
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm whitespace-pre-wrap break-words">
              {message.content}
            </p>
            <p
              className={cn(
                'text-xs mt-1',
                isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
              )}
            >
              {formatTime(message.created_at)}
            </p>
          </>
        )}
      </div>
    </div>
  )
}
