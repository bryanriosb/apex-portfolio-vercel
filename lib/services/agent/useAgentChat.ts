import { useCallback, useEffect, useRef, useState } from 'react'
import { AgentService, type AgentServiceOptions } from '@/lib/services/agent/AgentService'
import { SessionService } from '@/lib/services/session/SessionService'
import { getAuthTicket } from '@/lib/actions/api/auth-ticket'
import { useWebSocketReconnectionStore } from '@/lib/store/websocket-reconnection-store'
import type { Component, UiEvent } from '@zavora-ai/adk-ui-react'
import type {
  AgentState,
  ChatMessage,
  SendMessageOptions,
  ServerEvent,
  ToolCallData,
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
  sendUiEvent: (event: UiEvent) => boolean
}

function buildMessagesFromEvents(events: ServerEvent[]): ChatMessage[] {
  const messages: ChatMessage[] = []
  let currentContent = ''
  let reasoningParts: string[] = []
  let inReasoning = false
  let toolCalls: ToolCallData[] = []
  let uiComponents: Component[] | undefined = undefined
  let uiTheme: 'light' | 'dark' | 'system' | undefined = undefined
  let uiToolName: string | undefined = undefined
  let msgId = 0

  const flushAssistant = () => {
    if (currentContent || toolCalls.length > 0 || uiComponents || reasoningParts.length > 0) {
      messages.push({
        id: `session_msg_${++msgId}`,
        role: 'assistant',
        content: currentContent,
        reasoning: reasoningParts.length > 0 ? reasoningParts.join('') : undefined,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        uiComponents,
        uiTheme,
        uiToolName,
        createdAt: new Date(),
      })
    }
    currentContent = ''
    reasoningParts = []
    inReasoning = false
    toolCalls = []
    uiComponents = undefined
    uiTheme = undefined
    uiToolName = undefined
  }

  for (const event of events) {
    switch (event.type) {
      case 'user':
        flushAssistant()
        messages.push({
          id: `session_msg_${++msgId}`,
          role: 'user',
          content: event.content,
          createdAt: new Date(),
        })
        break

      case 'assistant':
        flushAssistant()
        currentContent = event.content
        break

      case 'tool_call':
        toolCalls.push({
          type: 'dynamic-tool',
          toolCallId: `tool_${Date.now()}_${msgId}`,
          toolName: event.name,
          state: 'output-available',
          input: (() => { try { return JSON.parse(event.arguments) } catch { return event.arguments } })(),
          attempts: 1,
          toolType: event.tool_type ?? 'Function',
        })
        break

      case 'reasoning_start':
        inReasoning = true
        break

      case 'reasoning_delta':
        reasoningParts.push(event.content)
        break

      case 'reasoning_end':
        inReasoning = false
        break

      case 'ui_response':
        flushAssistant()
        uiComponents = event.payload.components
        uiTheme = event.payload.theme as 'light' | 'dark' | 'system' | undefined
        uiToolName = event.tool_name
        break
    }
  }

  flushAssistant()
  return messages
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
    isLoadingSession: false,
    error: null,
    currentContent: '',
    currentReasoning: '',
    currentToolCalls: [],
    currentSkills: [],
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

      setState((prev) => ({ ...prev, isLoadingSession: true }))

      try {
        const session = await sessionServiceRef.current.getSession(
          newSessionId,
          optionsRef.current.userId,
          optionsRef.current.appName
        )
        const loadedMessages = buildMessagesFromEvents(session.events)
        sessionIdRef.current = newSessionId
        serviceRef.current?.setConversation(newSessionId, loadedMessages)

        if (!serviceRef.current) {
          setState((prev) => ({
            ...prev,
            sessionId: newSessionId,
            messages: loadedMessages,
            isLoadingSession: false,
          }))
        } else {
          setState((prev) => ({ ...prev, isLoadingSession: false }))
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
            isLoadingSession: false,
          }))
        } else {
          setState((prev) => ({ ...prev, isLoadingSession: false }))
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

  const sendUiEvent = useCallback(
    (event: UiEvent): boolean => {
      if (!serviceRef.current) return false
      return serviceRef.current.sendUiEvent(event, sessionIdRef.current ?? '', optionsRef.current.userId)
    },
    []
  )

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
    sendUiEvent,
  }
}
