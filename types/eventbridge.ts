export interface EventBridgeEvent {
  type: string
  timestamp: string
  source: string
  detail_type: string
  detail: Record<string, any>
  event_id: string
}

export type ConnectionStatus =
  | 'connected'
  | 'disconnected'
  | 'connecting'
  | 'reconnecting'
  | 'error'

export interface UseEventBridgeWebSocketReturn {
  events: EventBridgeEvent[]
  isConnected: boolean
  connectionStatus: ConnectionStatus
  reconnectAttempt: number
  reconnectCountdown: number
  maxRetries: number
  reconnect: () => void
  disconnect: () => void
  setEvents: Function
}
