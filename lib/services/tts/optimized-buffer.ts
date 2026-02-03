/**
 * Buffer optimizado para streaming TTS de ultra-baja latencia.
 * Estrategia: 3 tokens o 50ms, lo que ocurra primero.
 * Usa process.nextTick/setImmediate para timer ultra-liviano.
 */
export class OptimizedTTSBuffer {
  private tokens: string[] = []
  private lastFlushTime = 0
  private flushTimer: ReturnType<typeof setTimeout> | null = null
  private isDestroyed = false

  // Configuración optimizable
  private readonly TOKEN_THRESHOLD = 3
  private readonly TIME_THRESHOLD = 50 // ms
  private readonly TIMER_INTERVAL = 30 // ms (más rápido que 50ms)

  constructor(
    private readonly onFlush: (text: string) => void,
    private readonly onFlushImmediate?: (text: string) => void
  ) {}

  /**
   * Agrega un token al buffer y verifica si debe hacer flush
   * usando la estrategia: 3 tokens o 50ms
   */
  pushToken(token: string): void {
    if (this.isDestroyed || !token) return

    // Agregar token al buffer
    this.tokens.push(token)
    console.log('[OptimizedTTS] Token added:', `"${token}"`, `total: ${this.tokens.length}`)

    // Estrategia 1: Si tenemos 3+ tokens, flush inmediato
    if (this.tokens.length >= this.TOKEN_THRESHOLD) {
      this.flushNow()
      return
    }

    // Estrategia 2: Iniciar timer para timeout de 50ms
    this.startFlushTimer()
  }

  /**
   * Timer ultra-liviano usando setImmediate/process.nextTick
   * Verifica cada 30ms si han pasado 50ms desde el último token
   */
  private startFlushTimer(): void {
    if (this.flushTimer) return

    const checkTime = () => {
      if (this.isDestroyed) {
        this.flushTimer = null
        return
      }

      const now = Date.now()
      const timeSinceLastToken = now - this.lastFlushTime

      // Si han pasado 50ms desde el último flush, hacer flush
      if (timeSinceLastToken >= this.TIME_THRESHOLD && this.tokens.length > 0) {
        this.flushNow()
        this.flushTimer = null
        return
      }

      // Si no hay tokens, cancelar timer
      if (this.tokens.length === 0) {
        this.flushTimer = null
        return
      }

      // Programar siguiente chequeo en 30ms (usando setTimeout para compatibilidad)
      this.flushTimer = setTimeout(checkTime, 30)
    }

    // Iniciar el ciclo de chequeo
    this.flushTimer = setTimeout(checkTime, 30)
  }

  /**
   * Flush inmediato del buffer actual
   */
  private flushNow(): void {
    if (this.tokens.length === 0) return

    // Cancelar timer existente
    if (this.flushTimer) {
      clearTimeout(this.flushTimer)
      this.flushTimer = null
    }

    // Construir texto del buffer
    const text = this.tokens.join(' ').trim()
    if (!text) return

    console.log('[OptimizedTTS] Flushing:', `"${text}"`, `tokens: ${this.tokens.length}`)

    // Resetear buffer y timestamps
    this.tokens = []
    this.lastFlushTime = Date.now()

    // Enviar texto al callback
    if (this.isDestroyed) {
      this.onFlushImmediate?.(text)
    } else {
      this.onFlush(text)
    }
  }

  /**
   * Agrega texto tokenizado (para compatibilidad con streaming LLM)
   */
  pushText(text: string): void {
    if (this.isDestroyed || !text) return

    // Tokenización simple: dividir por espacios pero preservar puntuación
    const tokens = text.split(/\s+/).filter(token => token.length > 0)
    
    // Procesar cada token individualmente para máxima granularidad
    for (const token of tokens) {
      this.pushToken(token)
    }
  }

  /**
   * Forzar flush de cualquier contenido pendiente
   */
  flush(): void {
    if (this.tokens.length > 0) {
      this.flushNow()
    }
  }

  /**
   * Destruir el buffer y limpiar timers
   */
  destroy(): void {
    this.isDestroyed = true
    this.tokens = []

    if (this.flushTimer) {
      clearTimeout(this.flushTimer)
      this.flushTimer = null
    }
  }

  /**
   * Obtener estado actual del buffer (para debugging)
   */
  getStatus(): {
    tokensCount: number
    tokens: string[]
    timeSinceLastFlush: number
    isDestroyed: boolean
  } {
    return {
      tokensCount: this.tokens.length,
      tokens: [...this.tokens],
      timeSinceLastFlush: Date.now() - this.lastFlushTime,
      isDestroyed: this.isDestroyed,
    }
  }

  /**
   * Verificar si hay contenido pendiente
   */
  hasPendingContent(): boolean {
    return this.tokens.length > 0
  }

  /**
   * Obtener contenido actual del buffer sin hacer flush
   */
  getBufferContent(): string {
    return this.tokens.join(' ').trim()
  }
}