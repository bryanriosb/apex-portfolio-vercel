'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Loader2, X, Bot, Volume2, VolumeX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { ChatMessage } from './ChatMessage'
import { AgentChatInput } from './AgentChatInput'
import { useDeepgramSTT } from '@/hooks/useDeepgramSTT'
import { useFishAudioTTS } from '@/hooks/useFishAudioTTS'
import { cn } from '@/lib/utils'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface AgentLinkSettings {
  assistant_name?: string
  welcome_message?: string
  require_phone_verification?: boolean
}

interface AgentSession {
  sessionId: string
  conversationId: string
  businessId?: string
  linkId?: string | null
  settings?: AgentLinkSettings
}

interface AgentChatWidgetProps {
  token: string
  onClose?: () => void
  className?: string
}

export function AgentChatWidget({
  token,
  onClose,
  className,
}: AgentChatWidgetProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)
  const [session, setSession] = useState<AgentSession | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [voiceMode, setVoiceMode] = useState(false)
  const [ttsEnabled, setTtsEnabled] = useState(true)

  const scrollRef = useRef<HTMLDivElement>(null)
  const voiceModeRef = useRef(voiceMode)
  const ttsEnabledRef = useRef(ttsEnabled)

  useEffect(() => {
    voiceModeRef.current = voiceMode
  }, [voiceMode])

  useEffect(() => {
    ttsEnabledRef.current = ttsEnabled
  }, [ttsEnabled])

  const {
    speak,
    streamText,
    finishStream,
    stop: stopTTS,
    isSpeaking: isTTSSpeaking,
    volume: ttsVolume,
  } = useFishAudioTTS({
    onError: (err) => console.error('TTS Error:', err),
  })

  const sendMessageToAgent = useCallback(
    async (text: string) => {
      if (!text.trim() || !session || isLoading) return

      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content: text.trim(),
      }

      const assistantMessageId = crypto.randomUUID()

      setMessages((prev) => [...prev, userMessage])
      setInputValue('')
      setIsLoading(true)
      setIsStreaming(true)

      try {
        const response = await fetch('/api/agent/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text.trim(),
            session,
            token,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          if (errorData.expired) {
            setError('La sesión ha expirado')
            return
          }
          throw new Error(errorData.error || 'Error al enviar mensaje')
        }

        // Add empty assistant message that will be updated with streaming content
        setMessages((prev) => [
          ...prev,
          {
            id: assistantMessageId,
            role: 'assistant',
            content: '',
          },
        ])

        const reader = response.body?.getReader()
        const decoder = new TextDecoder()
        let accumulatedContent = ''

        if (reader) {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const chunk = decoder.decode(value, { stream: true })
            const lines = chunk.split('\n')

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6))

                  if (data.error) {
                    throw new Error(data.error)
                  }

                  if (data.chunk !== undefined) {
                    if (data.chunk) {
                      accumulatedContent += data.chunk
                      setMessages((prev) =>
                        prev.map((msg) =>
                          msg.id === assistantMessageId
                            ? { ...msg, content: accumulatedContent }
                            : msg
                        )
                      )
                    }
                  }

                  // Manejar chunks optimizados para TTS
                  if (data.tts_chunk) {
                    if (voiceModeRef.current && ttsEnabledRef.current) {
                      streamText(data.tts_chunk.text)
                      // Si es el chunk final, finalizar el stream
                      if (data.tts_chunk.isFinal) {
                        finishStream()
                      }
                    }
                  }

                  if (data.isComplete) {
                    setIsStreaming(false)
                    if (voiceModeRef.current && ttsEnabledRef.current) {
                      finishStream()
                    }
                  }

                  // Manejar errores del servidor
                  if (data.type === 'error') {
                    throw new Error(data.error || 'Error del servidor')
                  }

                  // Manejar mensajes de retroalimentación
                  if (data.type === 'feedback' && data.message) {
                    console.log('[Feedback]', data.message)
                  }
                } catch {
                  // Ignore JSON parse errors for incomplete chunks
                }
              }
            }
          }
        }
      } catch (err) {
        console.error('Error sending message:', err)

        // Remover mensaje vacío si existe
        setMessages((prev) =>
          prev.filter(
            (msg) => !(msg.id === assistantMessageId && !msg.content.trim())
          )
        )

        // Agregar mensaje de error
        const errorMessage =
          err instanceof Error ? err.message : 'Error desconocido'
        const userMessage =
          errorMessage.includes('tiempo') || errorMessage.includes('timeout')
            ? 'Lo siento, estoy tardando mucho en responder. Por favor, intenta con una pregunta más breve.'
            : 'Lo siento, tuve un problema al procesar tu mensaje. Por favor, intenta de nuevo.'

        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: userMessage,
          },
        ])
      } finally {
        setIsLoading(false)
        setIsStreaming(false)
      }
    },
    [session, isLoading, token, speak]
  )

  const handleUtteranceEnd = useCallback(
    async (text: string) => {
      if (!text.trim() || !session) return
      setInputValue('')
      await sendMessageToAgent(text.trim())
    },
    [session, sendMessageToAgent]
  )

  const {
    isListening,
    interimTranscript,
    isSpeaking,
    volume,
    start: startListening,
    stop: stopListening,
    toggleMute,
    isMuted,
  } = useDeepgramSTT({
    onUtteranceEnd: handleUtteranceEnd,
    onInterimTranscript: (text) => setInputValue(text),
    onError: (err) => console.error('STT Error:', err),
    language: 'es-419',
  })

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  useEffect(() => {
    initializeSession()
  }, [token])

  const initializeSession = async () => {
    try {
      setIsInitializing(true)
      setError(null)

      const response = await fetch('/api/agent/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })

      const data = await response.json()

      if (!data.success) {
        setError(data.error || 'Error al iniciar sesión')
        return
      }

      setSession({
        sessionId: data.session.sessionId,
        conversationId: data.session.conversationId,
        businessId: data.session.businessId,
        settings: data.session.settings,
      })

      if (data.message) {
        setMessages([
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: data.message,
          },
        ])
      }
    } catch (err) {
      setError('Error de conexión')
      console.error('Error initializing session:', err)
    } finally {
      setIsInitializing(false)
    }
  }

  const handleSubmit = () => {
    if (inputValue.trim()) {
      sendMessageToAgent(inputValue)
    }
  }

  const handleModeChange = async (mode: 'normal' | 'voice') => {
    if (mode === 'voice') {
      setVoiceMode(true)
      await startListening()
    } else {
      setVoiceMode(false)
      stopListening()
      stopTTS()
    }
  }

  const toggleTTS = useCallback(() => {
    if (ttsEnabled && isTTSSpeaking) {
      stopTTS()
    }
    setTtsEnabled((prev) => !prev)
  }, [ttsEnabled, isTTSSpeaking, stopTTS])

  if (isInitializing) {
    return (
      <div className={cn('flex h-full items-center justify-center', className)}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Conectando con el asistente...
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn('flex h-full items-center justify-center', className)}>
        <div className="flex flex-col items-center gap-4 text-center px-4">
          <div className="rounded-full bg-destructive/10 p-3">
            <X className="h-6 w-6 text-destructive" />
          </div>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" onClick={initializeSession}>
            Reintentar
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex h-full flex-col bg-background', className)}>
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <span className="font-medium">
            {session?.settings?.assistant_name || 'Asistente Virtual'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {voiceMode && (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTTS}
              className={cn('h-8 w-8', !ttsEnabled && 'text-muted-foreground')}
              title={ttsEnabled ? 'Desactivar voz' : 'Activar voz'}
            >
              {ttsEnabled ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4" />
              )}
            </Button>
          )}
          <ThemeToggle />
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1 p-2">
        <div className="flex flex-col gap-1 pb-4">
          {messages.map((message, index) => (
            <ChatMessage
              key={message.id}
              role={message.role}
              content={message.content}
              isStreaming={
                isStreaming &&
                message.role === 'assistant' &&
                index === messages.length - 1
              }
            />
          ))}
          {isLoading && !isStreaming && (
            <ChatMessage role="assistant" content="" isTyping />
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      <div className="border-t p-4 pt-8">
        <AgentChatInput
          value={inputValue}
          onChange={setInputValue}
          onSubmit={handleSubmit}
          disabled={isLoading}
          isLoading={isLoading}
          showVoiceButton={true}
          isVoiceActive={voiceMode && isListening}
          isMuted={isMuted}
          isSpeaking={isSpeaking}
          volume={volume}
          outputVolume={ttsVolume}
          onModeChange={handleModeChange}
          onToggleMute={toggleMute}
        />
      </div>
    </div>
  )
}
