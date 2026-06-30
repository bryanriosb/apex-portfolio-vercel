'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type {
  EventBridgeEvent,
  UseEventBridgeWebSocketReturn,
} from '../types/eventbridge'
import { getEnv } from '@/lib/actions/getenv'
import { WebSocketService, type ConnectionStatus } from '@/lib/services/websocket'

export function useEventBridgeWebSocket(): UseEventBridgeWebSocketReturn {
  const [events, setEvents] = useState<EventBridgeEvent[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected')
  const [reconnectAttempt, setReconnectAttempt] = useState(0)
  const [reconnectCountdown, setReconnectCountdown] = useState(0)
  const [maxRetries, setMaxRetries] = useState(10)
  const serviceRef = useRef<WebSocketService | null>(null)

  const connect = useCallback(() => {
    if (serviceRef.current) {
      return
    }

    const service = new WebSocketService({
      urlBuilder: async () => {
        const url = await getEnv('WEBSOCKET_URL')
        const apiKey = await getEnv('WEBSOCKET_API_KEY')
        if (!url) {
          throw new Error('WEBSOCKET_URL no está configurado')
        }
        return `${url}?x-api-key=${apiKey}`
      },
      heartbeatInterval: 25000,
      reconnection: { maxRetries: 10, countdownSeconds: 10 },
      callbacks: {
        onMessage: (data) => {
          try {
            const eventData: EventBridgeEvent = JSON.parse(data)

            if (eventData.type === 'pong') {
              return
            }

            setEvents((prev) => [eventData, ...prev.slice(0, 99)])
          } catch {
            // Ignore parsing errors
          }
        },
        onStatusChange: (status) => {
          setConnectionStatus(status)
          setIsConnected(status === 'connected')
        },
        onReconnectAttempt: (attempt, countdown) => {
          setReconnectAttempt(attempt)
          setReconnectCountdown(countdown)
          if (serviceRef.current) {
            setMaxRetries(serviceRef.current.getMaxRetries())
          }
        },
      },
    })

    serviceRef.current = service
    service.connect()
  }, [])

  const disconnect = useCallback(() => {
    if (serviceRef.current) {
      serviceRef.current.disconnect()
      serviceRef.current = null
    }
  }, [])

  useEffect(() => {
    connect()

    return () => {
      disconnect()
    }
  }, [connect, disconnect])

  return {
    events,
    isConnected,
    connectionStatus,
    reconnectAttempt,
    reconnectCountdown,
    maxRetries,
    reconnect: connect,
    disconnect,
    setEvents,
  }
}
