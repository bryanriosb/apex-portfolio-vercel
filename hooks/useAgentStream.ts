import { useState, useCallback } from 'react'
import { AgentService } from '@/lib/services/agent/agent-service'
import type {
  AgentRequest,
  AgentResponse,
  StreamCallbacks,
} from '@/lib/types/agent-stream'

interface UseAgentStreamOptions {
  service: AgentService | null
  onThinking?: (content: string, meta?: Record<string, unknown>) => void
  onContent?: (content: string, meta?: Record<string, unknown>) => void
  onProgress?: (step: string, meta?: Record<string, unknown>) => void
  onError?: (error: Error) => void
  onComplete?: (response: AgentResponse) => void
}

interface UseAgentStreamReturn {
  sendQuery: (query: string, options?: Partial<AgentRequest>) => Promise<void>
  isStreaming: boolean
  error: Error | null
  thinkingContent: string
  contentChunks: string[]
  progressStatus: string
  finalResponse: AgentResponse | null
}

/**
 * Hook para manejar la comunicación con el agente usando dual-stream
 */
export function useAgentStream({
  service,
  onThinking,
  onContent,
  onProgress,
  onError,
  onComplete,
}: UseAgentStreamOptions): UseAgentStreamReturn {
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [thinkingContent, setThinkingContent] = useState('')
  const [contentChunks, setContentChunks] = useState<string[]>([])
  const [progressStatus, setProgressStatus] = useState('')
  const [finalResponse, setFinalResponse] = useState<AgentResponse | null>(
    null
  )

  const sendQuery = useCallback(
    async (query: string, options?: Partial<AgentRequest>) => {
      if (!service) {
        const err = new Error('Agent service not initialized')
        setError(err)
        onError?.(err)
        return
      }

      if (isStreaming) {
        const err = new Error('Query already in progress')
        setError(err)
        onError?.(err)
        return
      }

      // Validar que la query no esté vacía
      if (!query || query.trim() === '') {
        const err = new Error('Query cannot be empty')
        setError(err)
        onError?.(err)
        return
      }

      setIsStreaming(true)
      setError(null)
      setThinkingContent('')
      setContentChunks([])
      setProgressStatus('')
      setFinalResponse(null)

      const request: AgentRequest = {
        query: query.trim(),
        max_steps: 10,
        timeout: 60,
        ...options,
        user_id: options?.user_id || '', // user_id es requerido
      }

      const callbacks: StreamCallbacks = {
        onThinking: (content: string, meta?: Record<string, unknown>) => {
          setThinkingContent((prev) => prev + content)
          onThinking?.(content, meta)
        },
        onContent: (content: string, meta?: Record<string, unknown>) => {
          setContentChunks((prev) => [...prev, content])
          onContent?.(content, meta)
        },
        onProgress: (step: string, meta?: Record<string, unknown>) => {
          setProgressStatus(step)
          onProgress?.(step, meta)
        },
        onError: (err: Error) => {
          setError(err)
          setIsStreaming(false)
          onError?.(err)
        },
        onComplete: (response: AgentResponse) => {
          setFinalResponse(response)
          setIsStreaming(false)
          onComplete?.(response)
        },
      }

      try {
        await service.sendQuery(request, callbacks)
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to send query')
        setError(error)
        setIsStreaming(false)
        onError?.(error)
      }
    },
    [service, isStreaming, onThinking, onContent, onProgress, onError, onComplete]
  )

  return {
    sendQuery,
    isStreaming,
    error,
    thinkingContent,
    contentChunks,
    progressStatus,
    finalResponse,
  }
}
