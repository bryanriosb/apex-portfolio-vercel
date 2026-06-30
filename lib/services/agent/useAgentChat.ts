import { useCallback, useEffect, useRef, useState } from 'react'
import { AgentService, type AgentServiceOptions } from '@/lib/services/agent/AgentService'
import { SessionService } from '@/lib/services/session/SessionService'
import { getAuthTicket } from '@/lib/actions/api/auth-ticket'
import { useWebSocketReconnectionStore } from '@/lib/store/websocket-reconnection-store'
import type {
  AgentState,
  ChatMessage,
  SendMessageOptions,
} from '@/lib/services/agent/types'

export interface UseAgentChatOptions {
  agentId: string
  userId: string
  appName: string
  wsBaseUrl: string
  apiBaseUrl?: string
  sessionId?: string
  model?: string
  baseUrl?: string
  provider?: string
  provider_options?: Record<string, any>
  initialMessages?: ChatMessage[]
  isWorkflow?: boolean
  reconnection?: AgentServiceOptions['reconnection']
}

export interface UseAgentChatReturn extends AgentState {
  send: (
    content: string,
    model?: string,
    baseUrl?: string,
    provider?: string,
    provider_options?: Record<string, any>
  ) => boolean
  stop: () => void
  clear: () => void
  connect: () => Promise<void>
  disconnect: () => void
  reconnect: () => Promise<void>
  regenerate: () => void
  setSessionId: (sessionId: string | null) => void
}

export function useAgentChat(options: UseAgentChatOptions): UseAgentChatReturn {
  const {
    agentId,
    userId,
    appName,
    wsBaseUrl,
    apiBaseUrl,
    sessionId: initialSessionId,
    model: defaultModel,
    baseUrl: defaultBaseUrl,
    initialMessages = [],
    isWorkflow = false,
    reconnection,
  } = options

  const [state, setState] = useState<AgentState>({
    messages: initialMessages,
    isStreaming: false,
    isConnected: false,
    error: null,
    currentContent: '',
    currentReasoning: '',
    sessionId: initialSessionId ?? null,
    reconnectAttempt: 0,
    reconnectCountdown: 0,
    maxRetries: reconnection?.maxRetries ?? 10,
  })

  const serviceRef = useRef<AgentService | null>(null)
  const lastUserMessageRef = useRef<string>('')
  const sessionServiceRef = useRef<SessionService | null>(null)
  const sessionIdRef = useRef<string | null>(initialSessionId ?? null)
  const optionsRef = useRef({ agentId, userId, appName, wsBaseUrl, apiBaseUrl, defaultModel, defaultBaseUrl, isWorkflow, reconnection })

  useEffect(() => {
    optionsRef.current = { agentId, userId, appName, wsBaseUrl, apiBaseUrl, defaultModel, defaultBaseUrl, isWorkflow, reconnection }
  }, [agentId, userId, appName, wsBaseUrl, apiBaseUrl, defaultModel, defaultBaseUrl, isWorkflow, reconnection])

  useEffect(() => {
    if (serviceRef.current) {
      serviceRef.current.disconnect()
      serviceRef.current = null
    }

    const agentServiceOptions: AgentServiceOptions = {
      urlBuilder: async () => {
        const timeoutMs = 10000
        const ticketPromise = getAuthTicket()
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Auth ticket timeout')), timeoutMs)
        )
        const { ticket } = await Promise.race([ticketPromise, timeoutPromise])
        const url = new URL(wsBaseUrl)
        url.searchParams.set('token', ticket)
        url.searchParams.set('agent_id', agentId)
        url.searchParams.set('user_id', userId)
        return url.toString()
      },
      reconnection: reconnection ?? { maxRetries: 10, countdownSeconds: 10, urlBuilderRetries: 3, urlBuilderRetryDelayMs: 1000 },
    }

    serviceRef.current = new AgentService({
      onStateChange: (newState) => {
        sessionIdRef.current = newState.sessionId ?? null
        setState(newState)
      },
      onSessionCreated: (newSessionId) => {
        setState((prev) => ({ ...prev, sessionId: newSessionId }))
      },
    }, agentServiceOptions, isWorkflow)

    if (apiBaseUrl) {
      sessionServiceRef.current = new SessionService({ baseUrl: apiBaseUrl })
    }

    return () => {
      serviceRef.current?.disconnect()
      serviceRef.current = null
    }
  }, [isWorkflow, apiBaseUrl, wsBaseUrl, agentId, userId])

  const connect = useCallback(async () => {
    const svc = serviceRef.current
    if (svc && !svc.getConnectionStatus()?.startsWith('connect')) {
      await svc.connect(optionsRef.current.agentId, optionsRef.current.userId)
    }
  }, [])

  const disconnect = useCallback(() => {
    serviceRef.current?.disconnect()
  }, [])

  const reconnect = useCallback(async () => {
    disconnect()
    await connect()
  }, [connect, disconnect])

  useEffect(() => {
    useWebSocketReconnectionStore.getState().registerChannel('globalChat', reconnect)
    return () => {
      useWebSocketReconnectionStore.getState().unregisterChannel('globalChat')
    }
  }, [reconnect])

  const setSessionId = useCallback(
    async (newSessionId: string | null) => {
      if (!newSessionId || !sessionServiceRef.current) {
        sessionIdRef.current = newSessionId
        serviceRef.current?.setConversation(newSessionId, [])

        if (!serviceRef.current) {
          setState((prev) => ({
            ...prev,
            sessionId: newSessionId,
            messages: [],
          }))
        }
        return
      }

      try {
        const session = await sessionServiceRef.current.getSession(
          newSessionId,
          optionsRef.current.userId,
          optionsRef.current.appName
        )
        const loadedMessages: ChatMessage[] = session.events.map((event) => ({
          id: event.id,
          role: event.author === 'user' ? 'user' : 'assistant',
          content: event.content,
          createdAt: new Date(event.timestamp),
        }))
        sessionIdRef.current = newSessionId
        serviceRef.current?.setConversation(newSessionId, loadedMessages)

        if (!serviceRef.current) {
          setState((prev) => ({
            ...prev,
            sessionId: newSessionId,
            messages: loadedMessages,
          }))
        }
      } catch (error) {
        console.error('Failed to load session messages:', error)
        sessionIdRef.current = newSessionId
        serviceRef.current?.setConversation(newSessionId, [])

        if (!serviceRef.current) {
          setState((prev) => ({
            ...prev,
            sessionId: newSessionId,
            messages: [],
          }))
        }
      }
    },
    []
  )

  const send = useCallback(
    (
      content: string,
      model?: string,
      baseUrl?: string,
      provider?: string,
      provider_options?: Record<string, any>
    ): boolean => {
      if (!serviceRef.current) return false

      lastUserMessageRef.current = content
      const sendOptions: SendMessageOptions = {
        content,
        userId: optionsRef.current.userId,
        sessionId: sessionIdRef.current ?? undefined,
        model: model || optionsRef.current.defaultModel,
        baseUrl: baseUrl || optionsRef.current.defaultBaseUrl,
        provider,
        provider_options,
      }

      return serviceRef.current.send(sendOptions)
    },
    []
  )

  const stop = useCallback(() => {
    serviceRef.current?.stop()
  }, [])

  const clear = useCallback(() => {
    serviceRef.current?.clear()
  }, [])

  const regenerate = useCallback(() => {
    if (!lastUserMessageRef.current || state.isStreaming) return

    setState((prev) => ({
      ...prev,
      messages: prev.messages.slice(0, -1),
    }))

    setTimeout(() => {
      send(lastUserMessageRef.current)
    }, 80)
  }, [send, state.isStreaming])

  return {
    ...state,
    send,
    stop,
    clear,
    connect,
    disconnect,
    reconnect,
    regenerate,
    setSessionId,
  }
}
