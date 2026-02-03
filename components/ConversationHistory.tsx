'use client'

import { useEffect } from 'react'
import { useThreads } from '@/hooks/useThreads'
import { Button } from './ui/button'
import { ScrollArea } from './ui/scroll-area'
import {
  Loader2,
  MessageSquare,
  Clock,
  RefreshCcw,
  BotMessageSquare,
  MessageCirclePlus,
} from 'lucide-react'
import type { ThreadInfo } from '@/lib/types/agent-stream'
import type { AgentService } from '@/lib/services/agent/agent-service'
import { Tooltip } from '@radix-ui/react-tooltip'
import { TooltipContent, TooltipTrigger } from './ui/tooltip'

interface ConversationHistoryProps {
  service: AgentService | null
  userId: string
  currentThreadId: string | null
  onThreadSelect: (thread: ThreadInfo) => void
  onNewConversation: () => void
}

export function ConversationHistory({
  service,
  userId,
  currentThreadId,
  onThreadSelect,
  onNewConversation,
}: ConversationHistoryProps) {
  const { threads, isLoading, error, loadThreads } = useThreads({
    service,
    userId,
  })

  // Cargar threads al montar el componente
  useEffect(() => {
    if (service && userId) {
      loadThreads()
    }
  }, [service, userId, loadThreads])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) {
      return `Hace ${diffMins} min`
    } else if (diffHours < 24) {
      return `Hace ${diffHours}h`
    } else if (diffDays < 7) {
      return `Hace ${diffDays}d`
    } else {
      return date.toLocaleDateString()
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 p-4 border-b">
        <h2 className="text-lg font-semibold mb-2">Conversaciones</h2>
        <div className="grid grid-cols-4 gap-2">
          <Button
            onClick={onNewConversation}
            variant="default"
            className="w-full col-span-3 space-x-1"
            size="sm"
          >
            <MessageCirclePlus />
            <span>Nueva</span>
          </Button>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() => loadThreads()}
                variant="outline"
                size="sm"
                className="w-full col-span-1"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <RefreshCcw className="animate-spin mr-2" />
                  </>
                ) : (
                  <RefreshCcw />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Recargar</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <ScrollArea className="flex-1">
        {isLoading && (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <div className="p-4 text-sm text-destructive">
            Error al cargar conversaciones: {error.message}
          </div>
        )}

        {!isLoading && !error && threads && threads.length === 0 && (
          <div className="p-4 text-sm text-muted-foreground text-center">
            No hay conversaciones previas
          </div>
        )}

        {!isLoading && !error && threads && threads.length > 0 && (
          <div className="p-2">
            {threads.map((thread) => (
              <button
                key={thread.id}
                onClick={() => onThreadSelect(thread)}
                className={`w-full text-left p-3 rounded-lg mb-2 transition-colors ${
                  currentThreadId === thread.id
                    ? 'bg-primary/10 border border-primary/20'
                    : 'hover:bg-muted'
                }`}
              >
                <div className="flex items-start gap-2">
                  <MessageSquare className="h-4 w-4 mt-1 flex-shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      {thread.metadata?.title || 'Conversación'}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {formatDate(thread.updated_at)}
                      </span>
                      {thread.metadata?.message_count && (
                        <span className="text-xs text-muted-foreground">
                          • {thread.metadata.message_count} mensajes
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
