'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { DeepgramSTTService } from '@/lib/services/deepgram/stt'
import { AudioPreprocessorService, resampleAudio } from '@/lib/services/audio'

interface UseDeepgramSTTOptions {
  onInterimTranscript?: (text: string) => void
  onFinalTranscript?: (text: string) => void
  onUtteranceEnd?: (fullText: string) => void
  onError?: (error: Error) => void
  language?: string
  highPassCutoff?: number
  useHighPassFilter?: boolean
}

interface UseDeepgramSTTReturn {
  isListening: boolean
  isConnected: boolean
  interimTranscript: string
  finalTranscript: string
  isSpeaking: boolean
  isMuted: boolean
  volume: number
  start: () => Promise<void>
  stop: () => void
  toggleListening: () => void
  toggleMute: () => void
  setMuted: (muted: boolean) => void
  destroy: () => void
}

const SAMPLE_RATE = 16000

export function useDeepgramSTT(options: UseDeepgramSTTOptions = {}): UseDeepgramSTTReturn {
  const {
    onInterimTranscript,
    onFinalTranscript,
    onUtteranceEnd,
    onError,
    language = 'es-419',
    highPassCutoff = 50,
    useHighPassFilter = true,
  } = options

  const [isListening, setIsListening] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [interimTranscript, setInterimTranscript] = useState('')
  const [finalTranscript, setFinalTranscript] = useState('')
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(0)

  const deepgramRef = useRef<DeepgramSTTService | null>(null)
  const preprocessorRef = useRef<AudioPreprocessorService | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const processorNodeRef = useRef<ScriptProcessorNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const isActiveRef = useRef(false)
  const speakingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const onInterimTranscriptRef = useRef(onInterimTranscript)
  const onFinalTranscriptRef = useRef(onFinalTranscript)
  const onUtteranceEndRef = useRef(onUtteranceEnd)
  const onErrorRef = useRef(onError)

  useEffect(() => {
    onInterimTranscriptRef.current = onInterimTranscript
    onFinalTranscriptRef.current = onFinalTranscript
    onUtteranceEndRef.current = onUtteranceEnd
    onErrorRef.current = onError
  }, [onInterimTranscript, onFinalTranscript, onUtteranceEnd, onError])

  const SPEAKING_TIMEOUT_MS = 1500

  const resetSpeakingTimeout = useCallback(() => {
    if (speakingTimeoutRef.current) {
      clearTimeout(speakingTimeoutRef.current)
    }
    speakingTimeoutRef.current = setTimeout(() => {
      setIsSpeaking(false)
      setVolume(0)
    }, SPEAKING_TIMEOUT_MS)
  }, [])

  const handleTranscript = useCallback((text: string, isFinal: boolean) => {
    if (isFinal) {
      setFinalTranscript(prev => prev + (prev ? ' ' : '') + text)
      setInterimTranscript('')
      onFinalTranscriptRef.current?.(text)
    } else {
      setInterimTranscript(text)
      onInterimTranscriptRef.current?.(text)
    }
    setIsSpeaking(true)
    resetSpeakingTimeout()
  }, [resetSpeakingTimeout])

  const handleUtteranceEnd = useCallback((fullText: string) => {
    if (speakingTimeoutRef.current) {
      clearTimeout(speakingTimeoutRef.current)
      speakingTimeoutRef.current = null
    }
    setIsSpeaking(false)
    setInterimTranscript('')
    setVolume(0)
    onUtteranceEndRef.current?.(fullText)
    setFinalTranscript('')
  }, [])

  const setupAudioCapture = useCallback(async () => {
    try {
      if (!isActiveRef.current) {
        return false
      }

      const rawStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        }
      })

      if (!isActiveRef.current) {
        rawStream.getTracks().forEach(track => track.stop())
        return false
      }

      const preprocessor = new AudioPreprocessorService({
        highPassCutoff,
        bufferDuration: 0.5,
        useHighPassFilter,
      })
      preprocessorRef.current = preprocessor

      await preprocessor.initialize(rawStream)

      if (!isActiveRef.current || preprocessorRef.current !== preprocessor) {
        rawStream.getTracks().forEach(track => track.stop())
        preprocessor.destroy()
        return false
      }

      streamRef.current = rawStream

      const sharedContext = preprocessor.getAudioContext()

      if (!sharedContext) {
        throw new Error('AudioPreprocessor not properly initialized')
      }

      audioContextRef.current = sharedContext
      const nativeSampleRate = sharedContext.sampleRate
      const needsResampling = nativeSampleRate !== SAMPLE_RATE

      const bufferSize = 4096
      processorNodeRef.current = sharedContext.createScriptProcessor(bufferSize, 1, 1)

      processorNodeRef.current.onaudioprocess = (event) => {
        if (!isActiveRef.current || !deepgramRef.current?.isActive()) return

        const rawData = event.inputBuffer.getChannelData(0)

        // Calculate volume for visualization
        let sum = 0
        for (let i = 0; i < rawData.length; i++) {
          sum += rawData[i] * rawData[i]
        }
        const rms = Math.sqrt(sum / rawData.length)
        const normalizedVolume = Math.min(1, rms * 5)
        setVolume(normalizedVolume)

        const audioData = needsResampling
          ? resampleAudio(new Float32Array(rawData), nativeSampleRate, SAMPLE_RATE)
          : rawData

        const int16Data = new Int16Array(audioData.length)
        for (let i = 0; i < audioData.length; i++) {
          const s = Math.max(-1, Math.min(1, audioData[i]))
          int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
        }

        deepgramRef.current.sendAudio(int16Data)
      }

      const audioSourceNode = preprocessor.getWorkletNode() || preprocessor.getSourceNode()
      if (audioSourceNode) {
        audioSourceNode.connect(processorNodeRef.current)
      }
      processorNodeRef.current.connect(sharedContext.destination)

      return true
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to setup audio capture')
      onErrorRef.current?.(err)
      return false
    }
  }, [highPassCutoff, useHighPassFilter])

  const start = useCallback(async () => {
    if (isListening) return

    try {
      isActiveRef.current = true
      setIsListening(true)
      setFinalTranscript('')
      setInterimTranscript('')

      deepgramRef.current = new DeepgramSTTService()

      await deepgramRef.current.connect({
        onTranscript: handleTranscript,
        onUtteranceEnd: handleUtteranceEnd,
        onError: (error) => {
          onError?.(error)
          setIsConnected(false)
        },
        onOpen: () => {
          setIsConnected(true)
        },
        onClose: () => {
          setIsConnected(false)
        }
      }, { language, model: 'nova-3' })

      const audioReady = await setupAudioCapture()
      if (!audioReady) {
        throw new Error('Failed to setup audio capture')
      }

    } catch (error) {
      isActiveRef.current = false
      setIsListening(false)
      setIsConnected(false)
      const err = error instanceof Error ? error : new Error('Failed to start STT')
      onError?.(err)
    }
  }, [isListening, handleTranscript, handleUtteranceEnd, language, setupAudioCapture, onError])

  const stop = useCallback(() => {
    isActiveRef.current = false

    if (speakingTimeoutRef.current) {
      clearTimeout(speakingTimeoutRef.current)
      speakingTimeoutRef.current = null
    }

    if (processorNodeRef.current) {
      processorNodeRef.current.disconnect()
      processorNodeRef.current = null
    }

    audioContextRef.current = null

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }

    if (preprocessorRef.current) {
      preprocessorRef.current.destroy()
      preprocessorRef.current = null
    }

    const pendingTranscript = deepgramRef.current?.getAccumulatedTranscript()
    if (pendingTranscript) {
      onUtteranceEnd?.(pendingTranscript)
    }

    if (deepgramRef.current) {
      deepgramRef.current.disconnect()
      deepgramRef.current = null
    }

    setIsListening(false)
    setIsConnected(false)
    setIsSpeaking(false)
    setInterimTranscript('')
    setVolume(0)
  }, [onUtteranceEnd])

  const toggleListening = useCallback(() => {
    if (isListening) {
      stop()
    } else {
      start()
    }
  }, [isListening, start, stop])

  const toggleMute = useCallback(() => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setIsMuted(!audioTrack.enabled)
      }
    }
  }, [])

  const setMutedState = useCallback((muted: boolean) => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !muted
        setIsMuted(muted)
      }
    }
  }, [])

  const destroy = useCallback(() => {
    stop()
    setFinalTranscript('')
  }, [stop])

  useEffect(() => {
    return () => {
      isActiveRef.current = false
      if (speakingTimeoutRef.current) {
        clearTimeout(speakingTimeoutRef.current)
      }
      deepgramRef.current?.destroy()
      preprocessorRef.current?.destroy()
      streamRef.current?.getTracks().forEach(track => track.stop())
    }
  }, [])

  return {
    isListening,
    isConnected,
    interimTranscript,
    finalTranscript,
    isSpeaking,
    isMuted,
    volume,
    start,
    stop,
    toggleListening,
    toggleMute,
    setMuted: setMutedState,
    destroy,
  }
}
