/**
 * WebSocketService - Manages WebSocket connections with unified reconnection
 *
 * Migrated from apex-agent/src/lib/services/websocket/WebSocketService.ts
 * Expanded with reconnection, countdown, and connection status management.
 *
 * Requirements: 4.3, 13.1, 13.2, 13.3, 13.4, 13.5
 */

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error'

export interface ReconnectionOptions {
  maxRetries: number
  countdownSeconds: number
  baseDelay: number
  urlBuilderRetries: number
  urlBuilderRetryDelayMs: number
}

export interface WebSocketCallbacks {
  onOpen?: () => void
  onClose?: (event: CloseEvent) => void
  onMessage?: (data: string) => void
  onError?: (error: Event) => void
  onPong?: () => void
  onStatusChange?: (status: ConnectionStatus) => void
  onReconnectAttempt?: (attempt: number, countdown: number) => void
}

export interface WebSocketOutgoingMessage {
  type: string
  payload: Record<string, unknown>
}

export interface WebSocketServiceOptions {
  heartbeatInterval?: number
  enableHeartbeat?: boolean
  connectionTimeoutMs?: number
  heartbeatTimeoutMs?: number
}

interface LegacyConstructorArgs {
  url: string
  agentId: string
  userId: string
  callbacks: WebSocketCallbacks
  token?: string
  options?: WebSocketServiceOptions
}

interface UrlBuilderConstructorArgs {
  urlBuilder: () => string | Promise<string>
  callbacks: WebSocketCallbacks
  heartbeatInterval?: number
  heartbeatMessage?: string
  connectionTimeoutMs?: number
  heartbeatTimeoutMs?: number
  reconnection?: Partial<ReconnectionOptions>
}

function isLegacyArgs(args: unknown): args is LegacyConstructorArgs {
  return typeof args === 'object' && args !== null && 'url' in args && 'agentId' in args
}

const DEFAULT_RECONNECTION: ReconnectionOptions = {
  maxRetries: 10,
  countdownSeconds: 10,
  baseDelay: 1000,
  urlBuilderRetries: 3,
  urlBuilderRetryDelayMs: 1000,
}

const HEARTBEAT_MESSAGE = JSON.stringify({ type: 'ping' })
const DEFAULT_CONNECTION_TIMEOUT_MS = 10000
const DEFAULT_HEARTBEAT_TIMEOUT_MS = 35000

/**
 * WebSocketService handles real-time bidirectional communication with the agent backend.
 *
 * Features:
 * - Connection lifecycle management (connect, disconnect)
 * - Lazy URL construction via urlBuilder
 * - Automatic reconnection with countdown and max retries
 * - Heartbeat (ping/pong) management
 * - Connection status tracking with callbacks
 */
export class WebSocketService {
  private ws: WebSocket | null = null
  private readonly url: string | null = null
  private readonly urlBuilder: (() => string | Promise<string>) | null = null
  private readonly callbacks: WebSocketCallbacks
  private readonly heartbeatIntervalMs: number
  private readonly heartbeatMessage: string
  private readonly enableHeartbeat: boolean
  private readonly reconnectionOptions: ReconnectionOptions
  private readonly connectionTimeoutMs: number
  private readonly heartbeatTimeoutMs: number
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private heartbeatTimeoutTimer: ReturnType<typeof setTimeout> | null = null
  private connectionStatus: ConnectionStatus = 'disconnected'
  private reconnectAttempt = 0
  private reconnectCountdown = 0
  private countdownTimer: ReturnType<typeof setInterval> | null = null
  private connectionTimeoutTimer: ReturnType<typeof setTimeout> | null = null
  private intentionalDisconnect = false
  private lastPongAt = 0

  constructor(
    ...args:
      | [LegacyConstructorArgs]
      | [UrlBuilderConstructorArgs]
      | [string, string, string, WebSocketCallbacks, string?, WebSocketServiceOptions?]
  ) {
    if (isLegacyArgs(args[0])) {
      const a = args[0]
      this.url = (() => {
        const params = new URLSearchParams({
          agent_id: a.agentId,
          user_id: a.userId,
        })
        if (a.token) {
          params.set('token', a.token)
        }
        return `${a.url}?${params.toString()}`
      })()
      this.callbacks = a.callbacks
      this.heartbeatIntervalMs = a.options?.heartbeatInterval ?? 25000
      this.heartbeatMessage = HEARTBEAT_MESSAGE
      this.enableHeartbeat = a.options?.enableHeartbeat ?? true
      this.reconnectionOptions = { ...DEFAULT_RECONNECTION, maxRetries: 0 }
      this.connectionTimeoutMs = a.options?.connectionTimeoutMs ?? DEFAULT_CONNECTION_TIMEOUT_MS
      this.heartbeatTimeoutMs = a.options?.heartbeatTimeoutMs ?? DEFAULT_HEARTBEAT_TIMEOUT_MS
    } else {
      const a = args[0] as UrlBuilderConstructorArgs
      this.urlBuilder = a.urlBuilder
      this.callbacks = a.callbacks
      this.heartbeatIntervalMs = a.heartbeatInterval ?? 30000
      this.heartbeatMessage = a.heartbeatMessage ?? HEARTBEAT_MESSAGE
      this.enableHeartbeat = true
      this.reconnectionOptions = { ...DEFAULT_RECONNECTION, ...a.reconnection }
      this.connectionTimeoutMs = a.connectionTimeoutMs ?? DEFAULT_CONNECTION_TIMEOUT_MS
      this.heartbeatTimeoutMs = a.heartbeatTimeoutMs ?? DEFAULT_HEARTBEAT_TIMEOUT_MS
    }
  }

  get isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN
  }

  get connectionUrl(): string | null {
    return this.url
  }

  /**
   * Establish a WebSocket connection.
   * If a connection already exists and is not closed/closing, this is a no-op.
   */
  connect(): void {
    this.intentionalDisconnect = false

    if (this.ws) {
      if (this.ws.readyState === WebSocket.OPEN) {
        return
      }
      if (this.ws.readyState === WebSocket.CONNECTING) {
        this.forceCloseSocket()
      } else {
        try {
          this.ws.close()
        } catch {
          // ignore
        }
        this.ws = null
      }
    }

    this.stopConnectionTimeout()
    this.stopHeartbeat()
    this.stopReconnect()

    this.updateStatus('connecting')

    const doConnect = async (urlBuilderAttempt: number = 0) => {
      try {
        let resolvedUrl: string
        if (this.urlBuilder) {
          resolvedUrl = await this.urlBuilder()
        } else {
          resolvedUrl = this.url!
        }

        this.ws = new WebSocket(resolvedUrl)
        this.startConnectionTimeout()

        this.ws.onopen = () => {
          this.stopConnectionTimeout()
          this.reconnectAttempt = 0
          this.reconnectCountdown = 0
          this.lastPongAt = Date.now()
          this.updateStatus('connected')
          this.callbacks.onOpen?.()
          if (this.enableHeartbeat) {
            this.startHeartbeat()
          }
        }

        this.ws.onmessage = (event) => {
          this.handlePong(event.data)
          this.callbacks.onMessage?.(event.data)
        }

        this.ws.onclose = (event) => {
          this.stopConnectionTimeout()
          this.stopHeartbeat()
          this.ws = null
          this.callbacks.onClose?.(event)
          if (this.intentionalDisconnect) {
            this.updateStatus('disconnected')
          } else {
            this.handleConnectionFailure()
          }
        }

        this.ws.onerror = (error) => {
          this.callbacks.onError?.(error)
        }
      } catch (error) {
        this.stopConnectionTimeout()
        
        const maxUrlBuilderRetries = this.reconnectionOptions.urlBuilderRetries
        if (urlBuilderAttempt < maxUrlBuilderRetries && !this.intentionalDisconnect) {
          await new Promise(resolve => setTimeout(resolve, this.reconnectionOptions.urlBuilderRetryDelayMs))
          return doConnect(urlBuilderAttempt + 1)
        }

        if (this.connectionStatus !== 'reconnecting' && !this.intentionalDisconnect) {
          this.handleConnectionFailure()
        }
      }
    }

    doConnect()
  }

  disconnect(code: number = 1000, reason: string = 'User disconnect'): void {
    this.intentionalDisconnect = true
    this.stopHeartbeat()
    this.stopReconnect()
    this.stopConnectionTimeout()
    if (this.ws) {
      this.ws.close(code, reason)
      this.ws = null
    }
    this.updateStatus('disconnected')
  }

  send(message: WebSocketOutgoingMessage): boolean {
    if (!this.isConnected) {
      return false
    }

    this.ws!.send(JSON.stringify(message))
    return true
  }

  sendRaw(message: string): boolean {
    if (!this.isConnected) {
      return false
    }

    this.ws!.send(message)
    return true
  }

  getStatus(): ConnectionStatus {
    return this.connectionStatus
  }

  getReconnectAttempt(): number {
    return this.reconnectAttempt
  }

  getReconnectCountdown(): number {
    return this.reconnectCountdown
  }

  getMaxRetries(): number {
    return this.reconnectionOptions.maxRetries
  }

  isIntentionalDisconnect(): boolean {
    return this.intentionalDisconnect
  }

  startHeartbeat(): void {
    this.stopHeartbeat()
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.sendRaw(this.heartbeatMessage)
        this.startHeartbeatTimeout()
      }
    }, this.heartbeatIntervalMs)
  }

  stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
    this.stopHeartbeatTimeout()
  }

  private handlePong(data: string): void {
    let isPong = false
    try {
      const parsed = JSON.parse(data)
      if (parsed.type === 'pong' || parsed.type === 'Pong') {
        isPong = true
      }
    } catch {
      if (data === 'pong' || data === 'Pong') {
        isPong = true
      }
    }

    if (isPong) {
      this.lastPongAt = Date.now()
      this.stopHeartbeatTimeout()
      this.callbacks.onPong?.()
    }
  }

  private startHeartbeatTimeout(): void {
    this.stopHeartbeatTimeout()
    this.heartbeatTimeoutTimer = setTimeout(() => {
      // No pong received in time; treat connection as dead.
      this.forceCloseSocket()
      if (!this.intentionalDisconnect) {
        this.handleConnectionFailure()
      }
    }, this.heartbeatTimeoutMs)
  }

  private stopHeartbeatTimeout(): void {
    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer)
      this.heartbeatTimeoutTimer = null
    }
  }

  private startConnectionTimeout(): void {
    this.stopConnectionTimeout()
    this.connectionTimeoutTimer = setTimeout(() => {
      // Socket did not open within the timeout; force close and reconnect.
      this.forceCloseSocket()
      if (!this.intentionalDisconnect) {
        this.handleConnectionFailure()
      }
    }, this.connectionTimeoutMs)
  }

  private stopConnectionTimeout(): void {
    if (this.connectionTimeoutTimer) {
      clearTimeout(this.connectionTimeoutTimer)
      this.connectionTimeoutTimer = null
    }
  }

  private forceCloseSocket(): void {
    if (!this.ws) return
    try {
      this.ws.onopen = null
      this.ws.onmessage = null
      this.ws.onclose = null
      this.ws.onerror = null
      this.ws.close(1000, 'Connection timeout or forced reconnect')
    } catch {
      // ignore
    }
    this.ws = null
  }

  private reconnect(): void {
    if (this.reconnectAttempt >= this.reconnectionOptions.maxRetries) {
      this.updateStatus('error')
      return
    }

    this.reconnectAttempt++
    this.updateStatus('reconnecting')
    this.startCountdown()
  }

  private startCountdown(): void {
    this.stopReconnect()
    const seconds = this.reconnectionOptions.countdownSeconds
    this.reconnectCountdown = seconds
    this.notifyReconnectAttempt()

    let elapsed = 0
    this.countdownTimer = setInterval(() => {
      elapsed++
      this.reconnectCountdown = Math.max(0, seconds - elapsed)
      this.notifyReconnectAttempt()

      if (this.reconnectCountdown <= 0) {
        this.stopCountdown()
        this.connect()
      }
    }, 1000)
  }

  private notifyReconnectAttempt(): void {
    this.callbacks.onReconnectAttempt?.(this.reconnectAttempt, this.reconnectCountdown)
  }

  private stopCountdown(): void {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer)
      this.countdownTimer = null
    }
  }

  private stopReconnect(): void {
    this.stopCountdown()
  }

  private handleConnectionFailure(): void {
    if (this.intentionalDisconnect) return
    
    if (this.reconnectAttempt >= this.reconnectionOptions.maxRetries) {
      this.updateStatus('error')
      return
    }

    this.updateStatus('reconnecting')
    this.reconnect()
  }

  private updateStatus(status: ConnectionStatus): void {
    if (this.connectionStatus === status) return
    this.connectionStatus = status
    this.callbacks.onStatusChange?.(status)
  }
}
