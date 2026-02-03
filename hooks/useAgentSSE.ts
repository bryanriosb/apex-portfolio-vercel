'use client'

import { useState, useCallback, useRef, useEffect } from 'react'

interface AgentSession {
  sessionId: string
  conversationId: string
  businessId: string
  settings?: {
    assistant_name?: string
    welcome_message?: string
  }
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface FeedbackMessage {
  type: 'thinking' | 'progress' | 'waiting'
  message: string
  toolName?: string
}

interface UseAgentSSEOptions {
  token: string
  onMessage?: (message: Message) => void
  onChunk?: (chunk: string) => void
  onStreamEnd?: () => void
  onFallback?: (message: string) => void
  onWelcome?: (message: string) => void
  onError?: (error: string) => void
  onSessionStart?: (session: AgentSession, welcomeMessage: string) => void
  onFeedback?: (feedback: FeedbackMessage) => void
  onSessionEnd?: (message: string, reason?: string) => void
}

interface UseAgentSSEReturn {
  isConnected: boolean
  isConnecting: boolean
  isProcessing: boolean
  session: AgentSession | null
  messages: Message[]
  feedback: FeedbackMessage | null
  currentTool: string | null
  error: string | null
  sendMessage: (message: string) => Promise<void>
  interruptAgent: () => void
  connect: () => void
  disconnect: () => void
  agentTyping: boolean
  clearError: () => void
}

export function useAgentSSE({
  token,
  onMessage,
  onChunk,
  onStreamEnd,
  onFallback,
  onWelcome,
  onError,
  onSessionStart,
  onFeedback,
  onSessionEnd,
}: UseAgentSSEOptions): UseAgentSSEReturn {
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [session, setSession] = useState<AgentSession | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [agentTyping, setAgentTyping] = useState(false)
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(null)
  const [currentTool, setCurrentTool] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [connectionAttempts, setConnectionAttempts] = useState(0)

  const abortControllerRef = useRef<AbortController | null>(null)
  const currentMessageRef = useRef<string>('')
  const currentMessageIdRef = useRef<string>('')
  const sessionRef = useRef<AgentSession | null>(null)
  const tokenRef = useRef(token)
  const maxConnectionAttempts = 3

  useEffect(() => {
    tokenRef.current = token
  }, [token])

  useEffect(() => {
    sessionRef.current = session
  }, [session])

  const connect = useCallback(async () => {
    if (isConnecting || session || connectionAttempts >= maxConnectionAttempts) return

    setIsConnecting(true)
    setError(null)
    setConnectionAttempts(prev => prev + 1)

    try {
      const response = await fetch('/api/agent/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenRef.current }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        const errorMsg = data.error || 'Error al iniciar sesión'
        setError(errorMsg)
        onError?.(errorMsg)
        setIsConnecting(false)
        
        // Si alcanzamos el máximo de intentos, limpiar el token para evitar más intentos
        if (connectionAttempts + 1 >= maxConnectionAttempts) {
          console.error('[useAgentSSE] Máximo de intentos de conexión alcanzado')
          tokenRef.current = ''
        }
        
        return
      }

      const newSession: AgentSession = {
        sessionId: data.session.sessionId,
        conversationId: data.session.conversationId,
        businessId: data.session.businessId,
        settings: data.session.settings,
      }

      setSession(newSession)
      setIsConnected(true)

      const welcomeMessage = data.welcomeMessage || '¡Hola! ¿En qué puedo ayudarte?'
      const welcomeMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: welcomeMessage,
      }
      setMessages([welcomeMsg])
      onMessage?.(welcomeMsg)
      onWelcome?.(welcomeMessage)
      onSessionStart?.(newSession, welcomeMessage)
      
      // Reset connection attempts on successful connection
      setConnectionAttempts(0)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error de conexión'
      setError(errorMsg)
      onError?.(errorMsg)
      
      // Si alcanzamos el máximo de intentos, limpiar el token
      if (connectionAttempts >= maxConnectionAttempts) {
        console.error('[useAgentSSE] Máximo de intentos de conexión alcanzado')
        tokenRef.current = ''
      }
    } finally {
      setIsConnecting(false)
    }
  }, [isConnecting, session, connectionAttempts, onMessage, onWelcome, onError, onSessionStart])

  const disconnect = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setIsConnected(false)
    setSession(null)
    setMessages([])
    setIsProcessing(false)
    setFeedback(null)
    setCurrentTool(null)
    setConnectionAttempts(0)
  }, [])

  const sendMessage = useCallback(async (message: string) => {
    const currentSession = sessionRef.current
    if (!currentSession || isProcessing) return

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: message,
    }
    setMessages((prev) => [...prev, userMessage])
    onMessage?.(userMessage)

    currentMessageIdRef.current = crypto.randomUUID()
    currentMessageRef.current = ''
    setIsProcessing(true)
    setAgentTyping(true)

    abortControllerRef.current = new AbortController()

    try {
      const response = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          session: currentSession,
          token: tokenRef.current,
        }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Error al enviar mensaje')
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No se pudo obtener el stream')

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split('\n\n')
        buffer = parts.pop() || ''

        for (const part of parts) {
          if (!part.trim()) continue

          const lines = part.split('\n')
          let eventType = 'message'
          let jsonData = ''

          for (const line of lines) {
            if (line.startsWith('event: ')) {
              eventType = line.slice(7).trim()
            } else if (line.startsWith('data: ')) {
              jsonData = line.slice(6)
            }
          }

          if (jsonData) {
            try {
              const data = JSON.parse(jsonData)
              handleSSEEvent(eventType, data)
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return
      }
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido'
      onError?.(errorMsg)
    } finally {
      setIsProcessing(false)
      setAgentTyping(false)
      setFeedback(null)
      setCurrentTool(null)
      abortControllerRef.current = null
    }
  }, [isProcessing, onMessage, onError])

  const handleSSEEvent = useCallback((eventType: string, data: Record<string, unknown>) => {
    switch (eventType) {
      case 'session_end': {
        console.log('[useAgentSSE] Session end received:', data)
        const message = data.message as string || 'La sesión ha finalizado'
        const reason = data.reason as string
        
        // Agregar mensaje de despedida
        const goodbyeMessage: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: message,
        }
        setMessages((prev) => [...prev, goodbyeMessage])
        onMessage?.(goodbyeMessage)
        
        // Notificar fin de sesión
        onStreamEnd?.()
        onSessionEnd?.(message, reason)
        
        // Limpiar estado de procesamiento
        setIsProcessing(false)
        setAgentTyping(false)
        setFeedback(null)
        setCurrentTool(null)
        
        console.log('[useAgentSSE] Session ended due to:', reason)
        return
      }
      case 'message': {
        const chunk = data.chunk as string
        const isComplete = data.isComplete as boolean

        if (chunk) {
          currentMessageRef.current += chunk
          onChunk?.(chunk)

          setMessages((prev) => {
            const lastMessage = prev[prev.length - 1]
            if (lastMessage?.id === currentMessageIdRef.current) {
              return prev.map((m) =>
                m.id === currentMessageIdRef.current
                  ? { ...m, content: currentMessageRef.current }
                  : m
              )
            } else {
              const newMsg: Message = {
                id: currentMessageIdRef.current,
                role: 'assistant',
                content: currentMessageRef.current,
              }
              return [...prev, newMsg]
            }
          })
        }

        if (isComplete) {
          onStreamEnd?.()
          const finalMessage: Message = {
            id: currentMessageIdRef.current,
            role: 'assistant',
            content: currentMessageRef.current,
          }
          onMessage?.(finalMessage)
          currentMessageRef.current = ''
          currentMessageIdRef.current = ''
        }
        break
      }

      case 'typing':
        setAgentTyping(data.isTyping as boolean)
        break

      case 'feedback': {
        const feedbackData: FeedbackMessage = {
          type: data.type as 'thinking' | 'progress' | 'waiting',
          message: data.message as string,
          toolName: data.toolName as string | undefined,
        }
        setFeedback(feedbackData)
        onFeedback?.(feedbackData)
        break
      }

      case 'tool': {
        const status = data.status as 'start' | 'end'
        const toolName = data.toolName as string
        if (status === 'start') {
          setCurrentTool(toolName)
        } else {
          setCurrentTool(null)
          setFeedback(null)
        }
        break
      }

      case 'fallback': {
        const fallbackMessage = data.message as string
        if (data.speak) {
          onFallback?.(fallbackMessage)
        }
        break
      }

      case 'error': {
        const errorMsg = data.error as string
        onError?.(errorMsg)
        break
      }

      case 'interrupted':
        setIsProcessing(false)
        setAgentTyping(false)
        currentMessageRef.current = ''
        currentMessageIdRef.current = ''
        break
    }
  }, [onChunk, onStreamEnd, onMessage, onFeedback, onFallback, onError])

  const interruptAgent = useCallback(() => {
    if (abortControllerRef.current && isProcessing) {
      abortControllerRef.current.abort()
      setIsProcessing(false)
      setAgentTyping(false)
      setFeedback(null)
      setCurrentTool(null)
    }
  }, [isProcessing])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return {
    isConnected,
    isConnecting,
    isProcessing,
    session,
    messages,
    feedback,
    currentTool,
    error,
    sendMessage,
    interruptAgent,
    connect,
    disconnect,
    agentTyping,
    clearError,
  }
}
