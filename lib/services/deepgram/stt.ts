import { getDeepgramApiKey, getDeepgramConfig, type DeepgramConfig } from '@/lib/actions/deepgram/stt'

export interface DeepgramSTTCallbacks {
  onTranscript?: (text: string, isFinal: boolean) => void
  onUtteranceEnd?: (fullTranscript: string) => void
  onError?: (error: Error) => void
  onOpen?: () => void
  onClose?: () => void
}

export interface DeepgramSTTOptions {
  language?: string
  model?: string
}

interface DeepgramWord {
  word: string
  start: number
  end: number
  confidence: number
  punctuated_word?: string
}

interface DeepgramAlternative {
  transcript: string
  confidence: number
  words: DeepgramWord[]
}

interface DeepgramChannel {
  alternatives: DeepgramAlternative[]
}

interface DeepgramResultMessage {
  type: 'Results'
  channel_index: number[]
  duration: number
  start: number
  is_final: boolean
  speech_final: boolean
  channel: DeepgramChannel
}

interface DeepgramUtteranceEndMessage {
  type: 'UtteranceEnd'
  channel: number[]
  last_word_end: number
}

interface DeepgramSpeechStartedMessage {
  type: 'SpeechStarted'
  channel: number[]
  timestamp: number
}

interface DeepgramMetadataMessage {
  type: 'Metadata'
  transaction_key: string
  request_id: string
  sha256: string
  created: string
  duration: number
  channels: number
  models: string[]
  model_info: Record<string, unknown>
}

interface DeepgramErrorMessage {
  type: 'Error'
  description: string
  message: string
  variant: string
}

type DeepgramMessage =
  | DeepgramResultMessage
  | DeepgramUtteranceEndMessage
  | DeepgramSpeechStartedMessage
  | DeepgramMetadataMessage
  | DeepgramErrorMessage

export class DeepgramSTTService {
  private ws: WebSocket | null = null
  private config: DeepgramConfig | null = null
  private callbacks: DeepgramSTTCallbacks = {}
  private accumulatedTranscript = ''
  private isConnected = false

  async connect(callbacks: DeepgramSTTCallbacks, options?: DeepgramSTTOptions): Promise<void> {
    this.callbacks = callbacks

    try {
      const [apiKey, config] = await Promise.all([
        getDeepgramApiKey(),
        getDeepgramConfig()
      ])

      this.config = {
        ...config,
        language: options?.language || config.language,
        model: options?.model || config.model
      }

      const params = new URLSearchParams({
        model: this.config.model,
        language: this.config.language,
        encoding: this.config.encoding,
        sample_rate: this.config.sampleRate.toString(),
        channels: this.config.channels.toString(),
        punctuate: this.config.punctuate.toString(),
        interim_results: this.config.interimResults.toString(),
        utterance_end_ms: this.config.utteranceEndMs.toString(),
        vad_events: this.config.vadEvents.toString(),
        endpointing: this.config.endpointing.toString(),
      })

      const wsUrl = `wss://api.deepgram.com/v1/listen?${params.toString()}`

      this.ws = new WebSocket(wsUrl, ['token', apiKey])
      this.setupEventHandlers()
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to connect to Deepgram')
      this.callbacks.onError?.(err)
      throw err
    }
  }

  private setupEventHandlers(): void {
    if (!this.ws) return

    this.ws.onopen = () => {
      this.isConnected = true
      this.accumulatedTranscript = ''
      this.callbacks.onOpen?.()
    }

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as DeepgramMessage
        this.handleMessage(message)
      } catch {
        console.error('Error parsing Deepgram message')
      }
    }

    this.ws.onerror = () => {
      this.callbacks.onError?.(new Error('Deepgram WebSocket error'))
    }

    this.ws.onclose = () => {
      this.isConnected = false
      this.callbacks.onClose?.()
    }
  }

  private handleMessage(message: DeepgramMessage): void {
    switch (message.type) {
      case 'Results':
        this.handleResults(message)
        break
      case 'UtteranceEnd':
        this.handleUtteranceEnd()
        break
      case 'SpeechStarted':
        break
      case 'Error':
        this.callbacks.onError?.(new Error(message.description || message.message))
        break
    }
  }

  private handleResults(message: DeepgramResultMessage): void {
    const transcript = message.channel?.alternatives?.[0]?.transcript || ''

    if (!transcript) return

    if (message.is_final) {
      this.accumulatedTranscript += (this.accumulatedTranscript ? ' ' : '') + transcript
      this.callbacks.onTranscript?.(transcript, true)

      if (message.speech_final) {
        this.emitUtteranceEnd()
      }
    } else {
      this.callbacks.onTranscript?.(transcript, false)
    }
  }

  private handleUtteranceEnd(): void {
    this.emitUtteranceEnd()
  }

  private emitUtteranceEnd(): void {
    if (this.accumulatedTranscript.trim()) {
      this.callbacks.onUtteranceEnd?.(this.accumulatedTranscript.trim())
      this.accumulatedTranscript = ''
    }
  }

  sendAudio(audioData: ArrayBuffer | Int16Array): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return
    }

    const buffer = audioData instanceof Int16Array
      ? audioData.buffer
      : audioData

    this.ws.send(buffer)
  }

  getAccumulatedTranscript(): string {
    return this.accumulatedTranscript.trim()
  }

  clearAccumulatedTranscript(): void {
    this.accumulatedTranscript = ''
  }

  isActive(): boolean {
    return this.isConnected && this.ws?.readyState === WebSocket.OPEN
  }

  async disconnect(): Promise<void> {
    if (this.ws) {
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'CloseStream' }))
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      this.ws.close()
      this.ws = null
    }
    this.isConnected = false
    this.accumulatedTranscript = ''
  }

  destroy(): void {
    this.disconnect()
    this.callbacks = {}
  }
}
