'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { HistoryIcon, Trash2Icon, MessageSquareIcon } from 'lucide-react'
import { SessionService } from '@/lib/services/session'
import type { SessionSummary } from '@/lib/services/agent/types'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatInBusinessTimeZone } from '@/lib/utils/date-format'
import { useActiveBusinessStore } from '@/lib/store/active-business-store'
import { toZonedTime } from 'date-fns-tz'

interface ChatHistoryProps {
  userId: string
  apiBaseUrl: string
  appName: string
  currentSessionId: string | null
  onSelectSession: (sessionId: string) => void
  onNewChat: () => void
  isOpen?: boolean
  className?: string
}

export function ChatHistory({
  userId,
  apiBaseUrl,
  appName,
  currentSessionId,
  onSelectSession,
  onNewChat,
  isOpen = false,
  className,
}: ChatHistoryProps) {
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const sessionService = new SessionService({ baseUrl: apiBaseUrl })
  const timezone = useActiveBusinessStore((s) => s.activeBusiness?.timezone || 'America/Bogota')

  const loadSessions = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await sessionService.listSessions(userId, appName)

      setSessions(response.sessions)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load sessions')
    } finally {
      setIsLoading(false)
    }
  }, [userId, appName])

  useEffect(() => {
    if (!userId || !appName) return
    loadSessions()
  }, [loadSessions, userId, appName])

  useEffect(() => {
    if (isOpen && userId && appName) {
      loadSessions()
    }
  }, [isOpen, userId, appName, loadSessions])

  useEffect(() => {
    if (currentSessionId && userId && appName) {
      loadSessions()
    }
  }, [currentSessionId, userId, appName, loadSessions])

  const handleDelete = useCallback(
    async (sessionId: string, e: React.MouseEvent) => {
      e.stopPropagation()
      setDeletingId(sessionId)
      try {
        await sessionService.deleteSession(sessionId, userId, appName)
        setSessions((prev) => prev.filter((s) => s.session_id !== sessionId))
        if (currentSessionId === sessionId) {
          onNewChat()
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to delete session')
      } finally {
        setDeletingId(null)
      }
    },
    [userId, currentSessionId, onNewChat]
  )

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const nowZoned = toZonedTime(new Date(), timezone)
    const dateZoned = toZonedTime(date, timezone)

    const startOfToday = new Date(nowZoned)
    startOfToday.setHours(0, 0, 0, 0)
    const startOfDate = new Date(dateZoned)
    startOfDate.setHours(0, 0, 0, 0)

    const diffMs = startOfToday.getTime() - startOfDate.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    const time = formatInBusinessTimeZone(date, 'HH:mm', timezone)

    if (diffDays === 0) return `Hoy ${time}`
    if (diffDays === 1) return `Ayer ${time}`
    if (diffDays < 7) return `Hace ${diffDays} días`
    return formatInBusinessTimeZone(date, 'dd MMM', timezone)
  }

  return (
    <div
      className={cn(
        'flex flex-col h-full bg-background border-x border-primary/20',
        className
      )}
    >
      <div className="flex items-center justify-between h-14 px-4 py-3 border-b border-primary/20">
        <div className="flex items-center gap-2">
          <HistoryIcon className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium">Historial</span>
        </div>
        <Button
          variant="ghost"
          size="xs"
          onClick={onNewChat}
          className="text-muted-foreground"
        >
          <MessageSquareIcon className="size-3" />
          Nuevo
        </Button>
      </div>

      {error && (
        <div className="px-4 py-2 text-xs text-destructive bg-destructive/10">
          {error}
        </div>
      )}

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {isLoading && sessions.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              Cargando...
            </div>
          )}

          {!isLoading && sessions.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No hay conversaciones
            </div>
          )}

          {sessions.map((session) => (
            <div
              key={session.session_id}
              onClick={() => onSelectSession(session.session_id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) =>
                e.key === 'Enter' && onSelectSession(session.session_id)
              }
              className={cn(
                'w-full text-left px-3 py-2 group/item transition-colors cursor-pointer',
                'hover:bg-muted',
                currentSessionId === session.session_id && 'bg-muted'
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate" title={session.preview}>
                    {session.preview?.slice(0, 30) ||
                      'Conversación sin mensajes'}
                    {(session.preview?.length || 0) > 30 ? '...' : ''}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">
                      {formatDate(session.updated_at)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {session.event_count} mensajes
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={(e) => handleDelete(session.session_id, e)}
                  disabled={deletingId === session.session_id}
                  className="opacity-0 group-hover/item:opacity-100 focus-visible:opacity-100 max-md:opacity-100 text-muted-foreground hover:text-destructive"
                >
                  <Trash2Icon className="size-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}

export default ChatHistory
