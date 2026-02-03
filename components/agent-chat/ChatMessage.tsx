'use client'

import { cn } from '@/lib/utils'
import { Bot, User } from 'lucide-react'
import { MarkdownMessage } from './MarkdownMessage'

interface ChatMessageProps {
  role: 'user' | 'assistant'
  content: string
  isTyping?: boolean
  isStreaming?: boolean
}

export function ChatMessage({ role, content, isTyping, isStreaming }: ChatMessageProps) {
  const isUser = role === 'user'

  return (
    <div
      className={cn(
        'flex gap-3 px-4 py-3',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      <div
        className={cn(
          'flex max-w-[80%] flex-col gap-1 rounded-2xl px-4 py-2.5',
          isUser
            ? 'bg-primary text-primary-foreground rounded-br-md'
            : 'bg-muted rounded-bl-md'
        )}
      >
        {isTyping ? (
          <div className="flex items-center gap-1 py-1">
            <span className="h-2 w-2 animate-bounce rounded-full bg-current [animation-delay:-0.3s]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-current [animation-delay:-0.15s]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-current" />
          </div>
        ) : isUser ? (
          <p className="text-sm whitespace-pre-wrap">{content}</p>
        ) : (
          <>
            <MarkdownMessage content={content} />
            {isStreaming && (
              <span className="inline-block w-2 h-4 bg-current animate-pulse ml-1" />
            )}
          </>
        )}
      </div>
    </div>
  )
}
