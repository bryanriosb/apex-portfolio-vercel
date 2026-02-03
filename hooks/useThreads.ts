import { useState, useCallback } from 'react'
import { AgentService } from '@/lib/services/agent/agent-service'
import type {
  ThreadInfo,
  ThreadMessage,
  ThreadCheckpoint,
} from '@/lib/types/agent-stream'

interface UseThreadsOptions {
  service: AgentService | null
  userId: string
}

interface UseThreadsReturn {
  threads: ThreadInfo[]
  currentThread: ThreadInfo | null
  messages: ThreadMessage[]
  checkpoints: ThreadCheckpoint[]
  isLoading: boolean
  error: Error | null
  loadThreads: (limit?: number) => Promise<void>
  loadMessages: (threadId: string, limit?: number) => Promise<void>
  loadCheckpoints: (threadId: string, limit?: number) => Promise<void>
  setCurrentThread: (thread: ThreadInfo | null) => void
  clearCurrentThread: () => void
}

/**
 * Hook para gestionar threads/conversaciones con el agente
 */
export function useThreads({
  service,
  userId,
}: UseThreadsOptions): UseThreadsReturn {
  const [threads, setThreads] = useState<ThreadInfo[]>([])
  const [currentThread, setCurrentThread] = useState<ThreadInfo | null>(null)
  const [messages, setMessages] = useState<ThreadMessage[]>([])
  const [checkpoints, setCheckpoints] = useState<ThreadCheckpoint[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  /**
   * Carga la lista de threads del usuario
   */
  const loadThreads = useCallback(
    async (limit: number = 20) => {
      if (!service) {
        const err = new Error('Agent service not initialized')
        setError(err)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const response = await service.listThreads({
          user_id: userId,
          limit,
        })

        if (response.success) {
          setThreads(response.threads)
        } else {
          throw new Error('Failed to load threads')
        }
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error('Failed to load threads')
        setError(error)
        console.error('Error loading threads:', error)
      } finally {
        setIsLoading(false)
      }
    },
    [service, userId]
  )

  /**
   * Carga los mensajes de un thread específico
   */
  const loadMessages = useCallback(
    async (threadId: string, limit: number = 50) => {
      if (!service) {
        const err = new Error('Agent service not initialized')
        setError(err)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const response = await service.getMessages({
          thread_id: threadId,
          get_messages: true,
          limit,
        })

        if (response.success) {
          // ⚠️ REEMPLAZAR los mensajes, no concatenar
          setMessages(response.messages)
        } else {
          throw new Error('Failed to load messages')
        }
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error('Failed to load messages')
        setError(error)
        console.error('Error loading messages:', error)
      } finally {
        setIsLoading(false)
      }
    },
    [service]
  )

  /**
   * Carga los checkpoints de un thread específico
   */
  const loadCheckpoints = useCallback(
    async (threadId: string, limit: number = 10) => {
      if (!service) {
        const err = new Error('Agent service not initialized')
        setError(err)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const response = await service.getCheckpoints({
          thread_id: threadId,
          limit,
        })

        if (response.success) {
          setCheckpoints(response.checkpoints)
        } else {
          throw new Error('Failed to load checkpoints')
        }
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error('Failed to load checkpoints')
        setError(error)
        console.error('Error loading checkpoints:', error)
      } finally {
        setIsLoading(false)
      }
    },
    [service]
  )

  /**
   * Limpia el thread actual y los mensajes
   */
  const clearCurrentThread = useCallback(() => {
    setCurrentThread(null)
    setMessages([])
    setCheckpoints([])
  }, [])

  return {
    threads,
    currentThread,
    messages,
    checkpoints,
    isLoading,
    error,
    loadThreads,
    loadMessages,
    loadCheckpoints,
    setCurrentThread,
    clearCurrentThread,
  }
}
