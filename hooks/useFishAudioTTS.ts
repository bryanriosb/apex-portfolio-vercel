'use client'

import { useState, useRef, useCallback } from 'react'
import { CircularAudioBuffer } from '@/lib/services/tts/audio-buffer'
import { TextChunkerService } from '@/lib/services/tts/text-chunker'

interface UseFishAudioTTSOptions {
  referenceId?: string
  onPlaybackStart?: () => void
  onPlaybackEnd?: () => void
  onError?: (error: Error) => void
}

interface UseFishAudioTTSReturn {
  speak: (text: string) => Promise<void>
  streamText: (chunk: string) => void
  finishStream: () => void
  stop: () => void
  pause: () => void
  resume: () => void
  isSpeaking: boolean
  isLoading: boolean
  isStreaming: boolean
  volume: number
  setVolume: (volume: number) => void
}

export function useFishAudioTTS(options: UseFishAudioTTSOptions = {}): UseFishAudioTTSReturn {
  const { referenceId, onPlaybackStart, onPlaybackEnd, onError } = options

  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [volume, setVolumeState] = useState(0)
  const [gainVolume, setGainVolume] = useState(1)

  const audioBufferRef = useRef<CircularAudioBuffer | null>(null)
  const chunkerRef = useRef<TextChunkerService | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const ttsQueueRef = useRef<string[]>([])
  const isProcessingQueueRef = useRef(false)
  const isStreamingRef = useRef(false)
  
  // Guard anti-recursión
  const processQueueDepthRef = useRef(0)
  const MAX_PROCESSING_DEPTH = 3

  const initAudioBuffer = useCallback(() => {
    if (audioBufferRef.current) return audioBufferRef.current

    const buffer = new CircularAudioBuffer(
      { format: 'mp3', sampleRate: 44100 },
      {
        onPlaybackStart: () => {
          setIsSpeaking(true)
          onPlaybackStart?.()
        },
        onPlaybackEnd: () => {
          setIsSpeaking(false)
          setVolumeState(0)
          onPlaybackEnd?.()
        },
        onVolumeChange: (v) => setVolumeState(v),
        onError: (err) => onError?.(err),
      }
    )

    buffer.initialize()
    audioBufferRef.current = buffer
    return buffer
  }, [onPlaybackStart, onPlaybackEnd, onError])

  const processQueue = useCallback(async () => {
    // Guard anti-recursión: prevenir procesamiento infinito
    if (processQueueDepthRef.current >= MAX_PROCESSING_DEPTH) {
      console.warn('[TTS] Maximum processing depth reached, stopping to prevent infinite recursion')
      isProcessingQueueRef.current = false
      setIsLoading(false)
      setIsStreaming(false)
      return
    }

    if (isProcessingQueueRef.current) return
    if (ttsQueueRef.current.length === 0) {
      setIsLoading(false)
      if (!isStreamingRef.current) {
        setIsStreaming(false)
      }
      return
    }

    isProcessingQueueRef.current = true
    processQueueDepthRef.current++
    const buffer = initAudioBuffer()
    buffer.setVolume(gainVolume)

    while (ttsQueueRef.current.length > 0) {
      const text = ttsQueueRef.current.shift()
      if (!text) continue

      console.log('[TTS] Processing text:', text.substring(0, 50) + '...')

      const controller = new AbortController()
      abortControllerRef.current = controller

      try {
        const response = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, referenceId }),
          signal: controller.signal,
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error('[TTS] API error:', response.status, errorText)
          throw new Error(`TTS request failed: ${response.status}`)
        }

        const reader = response.body?.getReader()
        if (!reader) throw new Error('No response body')

        let totalBytes = 0
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          if (value && value.length > 0) {
            totalBytes += value.length
            await buffer.addChunk(value.buffer)
          }
        }
        console.log('[TTS] Audio received:', totalBytes, 'bytes')
      } catch (error) {
        if ((error as Error).name === 'AbortError') {
          break
        }
        console.error('[TTS] Stream error:', error)
        onError?.(error instanceof Error ? error : new Error('TTS failed'))
      }
    }

    isProcessingQueueRef.current = false
    processQueueDepthRef.current--

    if (ttsQueueRef.current.length > 0 && processQueueDepthRef.current < MAX_PROCESSING_DEPTH) {
      // Usar setTimeout para evitar recursión síncrona inmediata
      setTimeout(() => processQueue(), 10)
    } else if (!isStreamingRef.current) {
      setIsLoading(false)
      setIsStreaming(false)
    }
  }, [referenceId, gainVolume, initAudioBuffer, onError])

  const enqueueTTS = useCallback((text: string) => {
    ttsQueueRef.current.push(text)
    setIsLoading(true)
    processQueue()
  }, [processQueue])

  const streamText = useCallback((text: string) => {
    if (!text) return

    if (!isStreamingRef.current) {
      isStreamingRef.current = true
      setIsStreaming(true)
      chunkerRef.current = new TextChunkerService({
        onChunk: enqueueTTS,
      })
    }

    chunkerRef.current?.append(text)
  }, [enqueueTTS])

  const finishStream = useCallback(() => {
    isStreamingRef.current = false
    if (chunkerRef.current) {
      chunkerRef.current.flush()
      chunkerRef.current = null
    }
  }, [])

  const speak = useCallback(async (text: string) => {
    if (!text.trim()) return

    console.log('[TTS] speak() called with', text.length, 'chars')

    abortControllerRef.current?.abort()
    ttsQueueRef.current = []
    isProcessingQueueRef.current = false
    isStreamingRef.current = false

    // Destruir el buffer anterior completamente para evitar listeners duplicados
    audioBufferRef.current?.destroy()
    audioBufferRef.current = null

    if (chunkerRef.current) {
      chunkerRef.current.reset()
      chunkerRef.current = null
    }

    enqueueTTS(text)
  }, [enqueueTTS])

  const stop = useCallback(() => {
    abortControllerRef.current?.abort()
    ttsQueueRef.current = []
    isProcessingQueueRef.current = false
    isStreamingRef.current = false

    if (chunkerRef.current) {
      chunkerRef.current.reset()
      chunkerRef.current = null
    }

    // Destruir el buffer completamente para limpiar todos los recursos
    audioBufferRef.current?.destroy()
    audioBufferRef.current = null
    setIsLoading(false)
    setIsSpeaking(false)
    setIsStreaming(false)
    setVolumeState(0)
  }, [])

  const pause = useCallback(() => {
    audioBufferRef.current?.pause()
    setIsSpeaking(false)
  }, [])

  const resume = useCallback(() => {
    audioBufferRef.current?.resume()
    setIsSpeaking(true)
  }, [])

  const setVolume = useCallback((v: number) => {
    setGainVolume(v)
    audioBufferRef.current?.setVolume(v)
  }, [])

  return {
    speak,
    streamText,
    finishStream,
    stop,
    pause,
    resume,
    isSpeaking,
    isLoading,
    isStreaming,
    volume,
    setVolume,
  }
}
