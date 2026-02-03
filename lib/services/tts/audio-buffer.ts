export interface AudioBufferConfig {
  sampleRate?: number
  bufferSize?: number
  format?: 'mp3' | 'pcm' | 'wav'
}

export interface AudioBufferCallbacks {
  onPlaybackStart?: () => void
  onPlaybackEnd?: () => void
  onBufferLow?: () => void
  onError?: (error: Error) => void
  onVolumeChange?: (volume: number) => void
}

export class CircularAudioBuffer {
  private queue: ArrayBuffer[] = []
  private audioElement: HTMLAudioElement | null = null
  private mediaSource: MediaSource | null = null
  private sourceBuffer: SourceBuffer | null = null
  private isSourceBufferReady = false
  private readonly BUFFER_SIZE = 50
  private currentVolume = 0
  private blobUrl: string | null = null
  private isProcessing = false
  private isTrimming = false
  private useFallbackMode = false
  private fallbackQueue: string[] = []
  private isPlayingFallback = false
  private isVolumeMonitoringActive = false
  private fallbackAccumulator: ArrayBuffer[] = []
  private fallbackAccumulatorSize = 0
  private readonly FALLBACK_MIN_SIZE = 4000
  private config: Required<AudioBufferConfig>
  private callbacks: AudioBufferCallbacks
  private volumeMonitorInterval?: ReturnType<typeof setInterval>
  private gainValue = 1
  private hasStartedPlaying = false
  
  // Anti-loop: Deduplicación de chunks
  private lastChunkHash: string | null = null
  private duplicateChunkCount = 0
  private readonly MAX_DUPLICATE_COUNT = 2

  private boundHandlers: {
    onPlay?: () => void
    onPause?: () => void
    onEnded?: () => void
    onWaiting?: () => void
    onUpdateEnd?: () => void
    onSourceOpen?: () => void
  } = {}

  constructor(config: AudioBufferConfig = {}, callbacks: AudioBufferCallbacks = {}) {
    this.config = {
      sampleRate: config.sampleRate || 44100,
      bufferSize: config.bufferSize || 4096,
      format: config.format || 'mp3',
    }
    this.callbacks = callbacks
  }

  async initialize(): Promise<void> {
    if (this.audioElement) {
      return
    }

    this.audioElement = new Audio()
    this.audioElement.autoplay = true

    this.boundHandlers.onPlay = () => {
      if (!this.hasStartedPlaying) {
        this.hasStartedPlaying = true
        this.callbacks.onPlaybackStart?.()
      }
      this.startVolumeMonitoring()
    }

    this.boundHandlers.onPause = () => {
      if (this.useFallbackMode && this.fallbackQueue.length > 0) {
        return
      }
      this.stopVolumeMonitoring()
    }

    this.boundHandlers.onEnded = () => {
      if (this.useFallbackMode) {
        this.playNextFallback()
      } else {
        if (!this.hasAudioPending()) {
          this.stopVolumeMonitoring()
          this.callbacks.onPlaybackEnd?.()
        }
      }
    }

    this.boundHandlers.onWaiting = () => {
      if (this.useFallbackMode && this.fallbackQueue.length > 0) {
        return
      }
      if (!this.hasAudioPending()) {
        this.stopVolumeMonitoring()
      }
    }

    this.audioElement.addEventListener('play', this.boundHandlers.onPlay)
    this.audioElement.addEventListener('pause', this.boundHandlers.onPause)
    this.audioElement.addEventListener('ended', this.boundHandlers.onEnded)
    this.audioElement.addEventListener('waiting', this.boundHandlers.onWaiting)

    const isMpegSupported = MediaSource.isTypeSupported('audio/mpeg')

    if (!isMpegSupported) {
      console.log('[AudioBuffer] audio/mpeg no soportado en MSE, usando Blob URLs')
      this.useFallbackMode = true
      this.isSourceBufferReady = true
      return
    }

    this.mediaSource = new MediaSource()
    this.blobUrl = URL.createObjectURL(this.mediaSource)
    this.audioElement.src = this.blobUrl

    return new Promise((resolve) => {
      this.boundHandlers.onSourceOpen = () => {
        try {
          if (!this.mediaSource || this.mediaSource.readyState !== 'open') {
            resolve()
            return
          }

          this.sourceBuffer = this.mediaSource.addSourceBuffer('audio/mpeg')
          this.boundHandlers.onUpdateEnd = () => this.onChunkAppended()
          this.sourceBuffer.addEventListener('updateend', this.boundHandlers.onUpdateEnd)

          this.sourceBuffer.addEventListener('error', (e) => {
            console.error('[AudioBuffer] SourceBuffer error:', e)
          })

          this.isSourceBufferReady = true
          console.log('[AudioBuffer] MediaSource inicializado para MP3 streaming')
          resolve()
        } catch (error) {
          console.error('[AudioBuffer] Error creando SourceBuffer:', error)
          this.useFallbackMode = true
          this.isSourceBufferReady = true
          console.log('[AudioBuffer] Usando modo fallback')
          resolve()
        }
      }

      this.mediaSource!.addEventListener('sourceopen', this.boundHandlers.onSourceOpen)
      this.mediaSource!.addEventListener('error', (e) => {
        console.error('[AudioBuffer] MediaSource error:', e)
      })
    })
  }

  private startVolumeMonitoring(): void {
    if (this.isVolumeMonitoringActive) {
      return
    }

    if (this.volumeMonitorInterval) {
      clearInterval(this.volumeMonitorInterval)
    }

    this.isVolumeMonitoringActive = true

    this.volumeMonitorInterval = setInterval(() => {
      if (!this.audioElement) {
        this.stopVolumeMonitoring()
        return
      }

      if (this.hasAudioPending() || this.isCurrentlyPlaying()) {
        this.currentVolume = 0.7
        this.callbacks.onVolumeChange?.(this.currentVolume)
      } else {
        this.stopVolumeMonitoring()
      }
    }, 100)
  }

  private stopVolumeMonitoring(): void {
    if (!this.isVolumeMonitoringActive) {
      return
    }

    this.isVolumeMonitoringActive = false

    if (this.volumeMonitorInterval) {
      clearInterval(this.volumeMonitorInterval)
      this.volumeMonitorInterval = undefined
    }

    if (this.currentVolume !== 0) {
      this.currentVolume = 0
      this.callbacks.onVolumeChange?.(0)
    }
  }

  private flushFallbackAccumulator(): void {
    if (this.fallbackAccumulator.length === 0) return

    const combined = new Uint8Array(this.fallbackAccumulatorSize)
    let offset = 0
    for (const buffer of this.fallbackAccumulator) {
      combined.set(new Uint8Array(buffer), offset)
      offset += buffer.byteLength
    }

    const blob = new Blob([combined], { type: 'audio/mpeg' })
    const blobUrl = URL.createObjectURL(blob)
    this.fallbackQueue.push(blobUrl)

    this.fallbackAccumulator = []
    this.fallbackAccumulatorSize = 0
  }

  private addToFallbackAccumulator(arrayBuffer: ArrayBuffer): void {
    this.fallbackAccumulator.push(arrayBuffer)
    this.fallbackAccumulatorSize += arrayBuffer.byteLength

    if (this.fallbackAccumulatorSize >= this.FALLBACK_MIN_SIZE) {
      this.flushFallbackAccumulator()
    }
  }

  private playNextFallback(): void {
    if (this.fallbackQueue.length === 0) {
      if (this.fallbackAccumulatorSize > 0) {
        this.flushFallbackAccumulator()
      }

      if (this.fallbackQueue.length === 0) {
        this.isPlayingFallback = false
        this.stopVolumeMonitoring()
        this.callbacks.onPlaybackEnd?.()
        return
      }
    }

    const blobUrl = this.fallbackQueue.shift()
    if (blobUrl && this.audioElement) {
      this.audioElement.src = blobUrl
      this.audioElement.volume = this.gainValue
      this.audioElement.play().catch((err) => {
        console.warn('[AudioBuffer] Error reproduciendo chunk:', err)
        this.playNextFallback()
      })
      setTimeout(() => URL.revokeObjectURL(blobUrl), 5000)
    }
  }

  private generateChunkHash(data: ArrayBuffer): string {
    const view = new Uint8Array(data)
    let hash = 0
    for (let i = 0; i < Math.min(view.length, 100); i++) {
      hash = ((hash << 5) - hash + view[i]) & 0xffffffff
    }
    return hash.toString(36)
  }

  async addChunk(data: ArrayBuffer): Promise<void> {
    console.log('[AudioBuffer] addChunk called, size:', data.byteLength, 'isReady:', this.isReady(), 'fallback:', this.useFallbackMode)

    // Anti-loop: Verificar duplicados
    const chunkHash = this.generateChunkHash(data)
    if (chunkHash === this.lastChunkHash) {
      this.duplicateChunkCount++
      console.warn(`[AudioBuffer] Duplicate chunk detected (${this.duplicateChunkCount}/${this.MAX_DUPLICATE_COUNT})`)
      
      // Ignorar si hay demasiados duplicados consecutivos (evita loops infinitos)
      if (this.duplicateChunkCount >= this.MAX_DUPLICATE_COUNT) {
        console.warn('[AudioBuffer] Too many duplicate chunks, ignoring to prevent loop')
        return
      }
    } else {
      // Reset contador cuando es un chunk diferente
      this.lastChunkHash = chunkHash
      this.duplicateChunkCount = 0
    }

    if (!this.isReady() && this.queue.length === 0 && !this.useFallbackMode) {
      console.warn('[AudioBuffer] Buffer no está listo, inicializando...')
      await this.initialize()
    }

    try {
      if (this.useFallbackMode) {
        this.addToFallbackAccumulator(data)

        if (!this.isPlayingFallback && this.fallbackQueue.length > 0 && this.audioElement) {
          this.isPlayingFallback = true
          this.startVolumeMonitoring()
          this.playNextFallback()
        }
        return
      }

      this.queue.push(data)
      console.log('[AudioBuffer] Chunk added to queue, length:', this.queue.length)

      if (this.queue.length > this.BUFFER_SIZE) {
        console.warn(`[AudioBuffer] Buffer lleno (${this.queue.length}), descartando chunk antiguo`)
        this.queue.shift()
      }

      if (this.isReady()) {
        this.processNextChunk()
      } else {
        console.warn('[AudioBuffer] Not ready yet, waiting...')
      }
    } catch (error) {
      console.error('[AudioBuffer] Error agregando chunk:', error)
      this.callbacks.onError?.(error instanceof Error ? error : new Error('Failed to add chunk'))
    }
  }

  private async onChunkAppended(): Promise<void> {
    // Si estábamos trimming, solo resetear el flag y continuar
    if (this.isTrimming) {
      this.isTrimming = false
      // Continuar procesando chunks pendientes
      if (this.queue.length > 0) {
        this.processNextChunk()
      }
      return
    }

    this.isProcessing = false

    if (this.audioElement && this.audioElement.paused && this.getBufferedTime() > 0) {
      try {
        this.audioElement.volume = this.gainValue
        await this.audioElement.play()
        console.log('[AudioBuffer] Reproducción iniciada')
      } catch {
        // Ignorar errores de autoplay
      }
    }

    if (this.queue.length > 0) {
      this.processNextChunk()
    } else {
      // Solo hacer trim cuando no hay más chunks pendientes
      this.trimBuffer()
    }
  }

  private trimBuffer(): void {
    if (!this.sourceBuffer || !this.audioElement || this.sourceBuffer.updating || this.isTrimming) {
      return
    }

    const currentTime = this.audioElement.currentTime
    // Mantener solo 5 segundos de audio antes del tiempo actual
    const trimEnd = currentTime - 5

    if (trimEnd > 0 && this.audioElement.buffered.length > 0) {
      const bufferedStart = this.audioElement.buffered.start(0)
      if (bufferedStart < trimEnd) {
        try {
          this.isTrimming = true
          this.sourceBuffer.remove(bufferedStart, trimEnd)
          console.log('[AudioBuffer] Trimmed buffer from', bufferedStart, 'to', trimEnd)
        } catch (e) {
          this.isTrimming = false
          console.warn('[AudioBuffer] Error trimming buffer:', e)
        }
      }
    }
  }

  private processNextChunk(): void {
    if (!this.isSourceBufferReady || !this.sourceBuffer) {
      return
    }

    if (this.sourceBuffer.updating || this.isProcessing) {
      return
    }

    if (this.queue.length === 0) {
      return
    }

    const chunk = this.queue.shift()
    if (!chunk) {
      return
    }

    try {
      this.isProcessing = true
      this.sourceBuffer.appendBuffer(chunk)
    } catch (error) {
      this.isProcessing = false
      console.error('[AudioBuffer] Error agregando al SourceBuffer:', error)
      if (this.queue.length > 0) {
        setTimeout(() => this.processNextChunk(), 10)
      }
    }
  }

  setVolume(volume: number): void {
    this.gainValue = Math.max(0, Math.min(1, volume))
    if (this.audioElement) {
      this.audioElement.volume = this.gainValue
    }
  }

  pause(): void {
    if (this.audioElement) {
      this.audioElement.pause()
    }
  }

  resume(): void {
    if (this.audioElement && this.audioElement.paused) {
      this.audioElement.play().catch(() => {})
    }
  }

  stop(): void {
    this.queue = []
    this.fallbackQueue = []
    this.fallbackAccumulator = []
    this.fallbackAccumulatorSize = 0
    this.isPlayingFallback = false
    this.hasStartedPlaying = false
    this.isProcessing = false
    this.isTrimming = false
    this.stopVolumeMonitoring()

    if (this.audioElement) {
      this.audioElement.pause()
      this.audioElement.currentTime = 0
    }
  }

  clear(): void {
    this.stop()
  }

  getIsPlaying(): boolean {
    return this.isCurrentlyPlaying()
  }

  getBufferLength(): number {
    return this.queue.length
  }

  getBufferedDuration(): number {
    return this.getBufferedTime()
  }

  private isReady(): boolean {
    if (this.useFallbackMode) {
      return true
    }
    return (
      this.isSourceBufferReady &&
      this.mediaSource !== null &&
      this.mediaSource.readyState === 'open'
    )
  }

  private isCurrentlyPlaying(): boolean {
    if (!this.audioElement) return false
    return !this.audioElement.paused && !this.audioElement.ended
  }

  private hasAudioPending(): boolean {
    if (this.useFallbackMode) {
      return (
        this.fallbackQueue.length > 0 ||
        this.fallbackAccumulatorSize > 0 ||
        this.isPlayingFallback
      )
    }

    const hasQueue = this.queue.length > 0
    const currentTime = this.audioElement?.currentTime || 0
    const bufferedTime = this.getBufferedTime()
    const hasBufferedContent = bufferedTime > currentTime + 0.1

    return hasQueue || hasBufferedContent
  }

  private getBufferedTime(): number {
    if (this.audioElement && this.audioElement.buffered.length > 0) {
      return this.audioElement.buffered.end(this.audioElement.buffered.length - 1)
    }
    return 0
  }

  destroy(): void {
    this.stop()
    this.isProcessing = false
    this.isTrimming = false

    if (this.audioElement) {
      if (this.boundHandlers.onPlay) {
        this.audioElement.removeEventListener('play', this.boundHandlers.onPlay)
      }
      if (this.boundHandlers.onPause) {
        this.audioElement.removeEventListener('pause', this.boundHandlers.onPause)
      }
      if (this.boundHandlers.onEnded) {
        this.audioElement.removeEventListener('ended', this.boundHandlers.onEnded)
      }
      if (this.boundHandlers.onWaiting) {
        this.audioElement.removeEventListener('waiting', this.boundHandlers.onWaiting)
      }
    }

    if (this.sourceBuffer && this.boundHandlers.onUpdateEnd) {
      this.sourceBuffer.removeEventListener('updateend', this.boundHandlers.onUpdateEnd)
    }

    if (this.mediaSource && this.boundHandlers.onSourceOpen) {
      this.mediaSource.removeEventListener('sourceopen', this.boundHandlers.onSourceOpen)
    }

    this.boundHandlers = {}

    if (this.sourceBuffer && this.mediaSource && this.mediaSource.readyState === 'open') {
      try {
        this.mediaSource.removeSourceBuffer(this.sourceBuffer)
      } catch {
        // Ignore
      }
    }

    if (this.mediaSource && this.mediaSource.readyState === 'open') {
      try {
        this.mediaSource.endOfStream()
      } catch {
        // Ignore
      }
    }

    if (this.audioElement) {
      this.audioElement.pause()
      this.audioElement.src = ''
      this.audioElement.load()
      this.audioElement = null
    }

    if (this.blobUrl) {
      URL.revokeObjectURL(this.blobUrl)
      this.blobUrl = null
    }

    this.mediaSource = null
    this.sourceBuffer = null
    this.isSourceBufferReady = false
    this.callbacks = {}
  }
}
