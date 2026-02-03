'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Loader2,
  X,
  Bot,
  Square,
  Volume2,
  VolumeX,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { ChatMessage } from './ChatMessage'
import { AgentChatInput } from './AgentChatInput'
import { FeedbackIndicator } from './FeedbackIndicator'
import { useAgentSSE } from '@/hooks/useAgentSSE'
import { useDeepgramSTT } from '@/hooks/useDeepgramSTT'
import { useFishAudioTTS } from '@/hooks/useFishAudioTTS'
import { cn } from '@/lib/utils'

interface AgentChatSocketWidgetProps {
  token: string
  onClose?: () => void
  className?: string
}

export function AgentChatSocketWidget({
  token,
  onClose,
  className,
}: AgentChatSocketWidgetProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const [inputValue, setInputValue] = useState('')
  const [voiceMode, setVoiceMode] = useState(false)
  const [isNearBottom, setIsNearBottom] = useState(true)
  const [ttsEnabled, setTtsEnabled] = useState(true)
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

  const handleTTSChunk = useCallback(
    (chunk: string) => {
      if (voiceModeRef.current && ttsEnabledRef.current) {
        streamText(chunk)
      }
    },
    [streamText]
  )

  const handleTTSStreamEnd = useCallback(() => {
    if (voiceModeRef.current && ttsEnabledRef.current) {
      finishStream()
    }
  }, [finishStream])

  const handleWelcome = useCallback((_message: string) => {
    // TTS del mensaje de bienvenida deshabilitado
  }, [])

  const handleFallback = useCallback(
    (message: string) => {
      if (voiceModeRef.current && ttsEnabledRef.current && message) {
        speak(message)
      }
    },
    [speak]
  )

  const {
    isProcessing,
    messages,
    feedback,
    error,
    sendMessage,
    interruptAgent,
    connect,
    agentTyping,
    session,
  } = useAgentSSE({
    token,
    onChunk: handleTTSChunk,
    onStreamEnd: handleTTSStreamEnd,
    onWelcome: handleWelcome,
    onFallback: handleFallback,
    onError: (err) => console.error('SSE error:', err),
  })

  const handleUtteranceEnd = useCallback(
    async (text: string) => {
      if (!text.trim()) return
      await sendMessage(text.trim())
    },
    [sendMessage]
  )

  const {
    isListening,
    isSpeaking,
    volume,
    start: startListening,
    stop: stopListening,
    toggleMute,
    isMuted,
  } = useDeepgramSTT({
    onUtteranceEnd: handleUtteranceEnd,
    onError: (err) => console.error('STT Error:', err),
    useHighPassFilter: true,
    language: 'es-419',
  })

  // Scroll interno del ScrollArea
  const scrollToBottom = useCallback(() => {
    if (!scrollAreaRef.current) return
    const viewport = scrollAreaRef.current.querySelector(
      '[data-radix-scroll-area-viewport]'
    )
    if (viewport) {
      viewport.scrollTop = viewport.scrollHeight
    }
  }, [])

  // Detectar si el usuario está cerca del fondo
  const checkIfNearBottom = useCallback(() => {
    if (!scrollAreaRef.current) return
    const viewport = scrollAreaRef.current.querySelector(
      '[data-radix-scroll-area-viewport]'
    )
    if (viewport) {
      const threshold = 100
      const isNear =
        viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight <
        threshold
      setIsNearBottom(isNear)
    }
  }, [])

  // Solo auto-scroll si el usuario está cerca del fondo
  const lastMessageContent = messages[messages.length - 1]?.content || ''
  useEffect(() => {
    if (isNearBottom) {
      scrollToBottom()
    }
  }, [messages.length, lastMessageContent, isNearBottom, scrollToBottom])

  // Scroll al enviar mensaje (siempre)
  useEffect(() => {
    if (isProcessing) {
      scrollToBottom()
      setIsNearBottom(true)
    }
  }, [isProcessing, scrollToBottom])

  // Listener para detectar scroll manual del usuario
  useEffect(() => {
    const scrollArea = scrollAreaRef.current
    if (!scrollArea) return

    const viewport = scrollArea.querySelector(
      '[data-radix-scroll-area-viewport]'
    )
    if (!viewport) return

    const handleScroll = () => checkIfNearBottom()
    viewport.addEventListener('scroll', handleScroll)
    return () => viewport.removeEventListener('scroll', handleScroll)
  }, [checkIfNearBottom])

  useEffect(() => {
    connect()
  }, [connect])

  const handleSubmit = async () => {
    if (inputValue.trim()) {
      const message = inputValue.trim()
      setInputValue('')
      await sendMessage(message)
    }
  }

  const handleModeChange = async (mode: 'normal' | 'voice') => {
    setVoiceMode(mode === 'voice')
    if (mode === 'voice') {
      await startListening()
    } else {
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

  if (error) {
    return (
      <div className={cn('flex h-full items-center justify-center', className)}>
        <div className="flex flex-col items-center gap-4 text-center px-4 max-w-sm">
          <div className="rounded-full bg-destructive/10 p-3">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <div className="space-y-1">
            <p className="font-medium text-destructive">Enlace no válido</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
          {onClose && (
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
          )}
        </div>
      </div>
    )
  }

  if (!session) {
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

  return (
    <div className={cn('flex h-full flex-col bg-background', className)}>
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <span className="font-medium">
            {session?.settings?.assistant_name ?? 'Asistente Virtual'}
          </span>
          <span className="flex h-2 w-2 rounded-full bg-green-500" />
        </div>
        <div className="flex items-center gap-1">
          {isProcessing && (
            <Button
              variant="ghost"
              size="icon"
              onClick={interruptAgent}
              className="text-destructive hover:text-destructive"
            >
              <Square className="!h-5 !w-5" />
            </Button>
          )}
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

      <div ref={scrollAreaRef} className="flex-1 overflow-hidden">
        <ScrollArea className="h-full p-2">
          <div className="flex flex-col gap-1 pb-4">
            {messages.map((message, index) => (
              <ChatMessage
                key={message.id}
                role={message.role}
                content={message.content}
                isStreaming={
                  isProcessing &&
                  message.role === 'assistant' &&
                  index === messages.length - 1
                }
              />
            ))}
            {agentTyping && !isProcessing && (
              <ChatMessage role="assistant" content="" isTyping />
            )}
            {isProcessing && (
              <FeedbackIndicator
                feedback={
                  feedback || { type: 'thinking', message: 'Procesando...' }
                }
                className="mx-2 mt-2"
              />
            )}
          </div>
        </ScrollArea>
      </div>

      <div className="p-4 pt-8">
        <AgentChatInput
          value={inputValue}
          onChange={setInputValue}
          onSubmit={handleSubmit}
          disabled={isProcessing}
          isLoading={isProcessing}
          showVoiceButton={true}
          isVoiceActive={isListening}
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
