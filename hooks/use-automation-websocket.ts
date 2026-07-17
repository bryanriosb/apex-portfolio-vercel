'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { type AutomationServerEvent } from '@/lib/services/automation/automation-types'
import { getAuthTicket } from '@/lib/actions/api/auth-ticket'
import { getSelectedEnvironment } from '@/lib/actions/api/index'
import { WebSocketService, type ConnectionStatus } from '@/lib/services/websocket'
import { useWebSocketReconnectionStore } from '@/lib/store/websocket-reconnection-store'
import { normalizeToolType } from '@/lib/utils/tool-type'

export function useAutomationWebSocket(onEvent: (event: AutomationServerEvent) => void) {
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected')
  const [reconnectAttempt, setReconnectAttempt] = useState(0)
  const [reconnectCountdown, setReconnectCountdown] = useState(0)
  const [maxRetries, setMaxRetries] = useState(10)

  const onEventRef = useRef(onEvent)
  const serviceRef = useRef<WebSocketService | null>(null)

  useEffect(() => {
    onEventRef.current = onEvent
  }, [onEvent])

  const reconnect = useCallback(() => {
    if (serviceRef.current && !serviceRef.current.isIntentionalDisconnect()) {
      serviceRef.current.disconnect()
      serviceRef.current.connect()
    }
  }, [])

  useEffect(() => {
    useWebSocketReconnectionStore.getState().registerChannel('automation', reconnect)
    return () => {
      useWebSocketReconnectionStore.getState().unregisterChannel('automation')
    }
  }, [reconnect])

  useEffect(() => {
    const service = new WebSocketService({
      urlBuilder: async () => {
        const timeoutMs = 10000
        const ticketPromise = getAuthTicket()
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Auth ticket timeout')), timeoutMs)
        )
        const { ticket } = await Promise.race([ticketPromise, timeoutPromise])

        const url = new URL(`${getSelectedEnvironment().APEX_WS_URL}/automation`)
        if (ticket) {
          url.searchParams.set('token', ticket)
        }
        return url.toString()
      },
      heartbeatInterval: 30000,
      heartbeatMessage: JSON.stringify({ type: 'Ping' }),
      reconnection: { maxRetries: 10, countdownSeconds: 10, urlBuilderRetries: 3, urlBuilderRetryDelayMs: 1000 },
      callbacks: {
        onOpen: () => {
          setIsConnected(true)
          setConnectionStatus('connected')
          setReconnectAttempt(0)
          setReconnectCountdown(0)
          service.sendRaw(JSON.stringify({ type: 'Subscribe', filters: null }))
        },
        onClose: () => {
          setIsConnected(false)
        },
        onMessage: (data) => {
          try {
            const parsed = JSON.parse(data)

            if (parsed.type === 'Pong') {
              return
            }

            if (parsed && typeof parsed === 'object' && parsed.type) {
              if (parsed.tool_type && typeof parsed.tool_type === 'string') {
                parsed.tool_type = normalizeToolType(parsed.tool_type)
              }
              onEventRef.current(parsed as AutomationServerEvent)
            }
          } catch {
            // Ignore parsing errors
          }
        },
        onStatusChange: (status) => {
          setConnectionStatus(status)
          if (status === 'connected') {
            setIsConnected(true)
            setReconnectAttempt(0)
            setReconnectCountdown(0)
          } else if (status === 'disconnected') {
            setIsConnected(false)
            setReconnectAttempt(0)
            setReconnectCountdown(0)
          } else {
            setIsConnected(false)
          }
        },
        onReconnectAttempt: (attempt, countdown) => {
          setReconnectAttempt(attempt)
          setReconnectCountdown(countdown)
          setMaxRetries(service.getMaxRetries())
        },
      },
    })

    serviceRef.current = service
    service.connect()

    return () => {
      service.disconnect()
      serviceRef.current = null
    }
  }, [])

  return { isConnected, connectionStatus, reconnectAttempt, reconnectCountdown, maxRetries, reconnect }
}
