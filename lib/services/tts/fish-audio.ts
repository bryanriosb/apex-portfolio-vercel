export interface FishAudioConfig {
  apiKey: string
  referenceId?: string
  format?: 'wav' | 'pcm' | 'mp3' | 'opus'
  latency?: 'normal' | 'balanced'
}

export interface FishAudioCallbacks {
  onAudioChunk: (chunk: Buffer) => void
  onOpen?: () => void
  onClose?: () => void
  onError?: (error: Error) => void
}

export class FishAudioTTSService {
  private config: FishAudioConfig
  private isActive = false
  private abortController: AbortController | null = null

  constructor(config: FishAudioConfig) {
    this.config = config
  }

  async streamTTS(text: string, callbacks: FishAudioCallbacks): Promise<void> {
    if (this.isActive) {
      throw new Error('TTS stream already active')
    }

    this.isActive = true
    this.abortController = new AbortController()

    console.log('[FishAudio] Starting TTS, text length:', text.length)

    try {
      callbacks.onOpen?.()

      const response = await fetch('https://api.fish.audio/v1/tts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          'model': 's1',
        },
        body: JSON.stringify({
          text,
          reference_id: this.config.referenceId,
          format: this.config.format || 'mp3',
          latency: this.config.latency || 'balanced',
        }),
        signal: this.abortController.signal,
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`TTS failed: ${response.status} - ${errorText}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body')
      }

      let totalBytes = 0
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        if (value && value.length > 0) {
          totalBytes += value.length
          callbacks.onAudioChunk(Buffer.from(value))
        }
      }

      console.log('[FishAudio] TTS completed, total bytes:', totalBytes)
      callbacks.onClose?.()
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        console.log('[FishAudio] Request aborted')
        callbacks.onClose?.()
        return
      }

      console.error('[FishAudio] TTS error:', error)
      const err = error instanceof Error ? error : new Error('TTS failed')
      callbacks.onError?.(err)
      throw err
    } finally {
      this.isActive = false
      this.abortController = null
    }
  }

  stop(): void {
    this.abortController?.abort()
    this.isActive = false
  }

  getIsActive(): boolean {
    return this.isActive
  }
}

export function getFishAudioApiKey(): string {
  const key = process.env.FISH_AUDIO_API_KEY
  if (!key) {
    throw new Error('FISH_AUDIO_API_KEY not configured')
  }
  return key
}

export function getFishAudioVoiceId(): string | undefined {
  return process.env.FISH_AUDIO_VOICE_ID
}
