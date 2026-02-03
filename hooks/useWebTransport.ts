import { useState, useEffect, useCallback, useRef } from 'react'

interface UseWebTransportOptions {
  url: string
  autoConnect?: boolean
  onConnect?: () => void
  onDisconnect?: () => void
  onError?: (error: Error) => void
}

interface UseWebTransportReturn {
  transport: WebTransport | null
  isConnected: boolean
  isConnecting: boolean
  error: Error | null
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  sendDatagram: (data: Uint8Array) => void
  createBidirectionalStream: () => Promise<WebTransportBidirectionalStream>
  createUnidirectionalStream: () => Promise<WritableStream>
}

export function useWebTransport({
  url,
  autoConnect = false,
  onConnect,
  onDisconnect,
  onError,
}: UseWebTransportOptions): UseWebTransportReturn {
  const [transport, setTransport] = useState<WebTransport | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const transportRef = useRef<WebTransport | null>(null)

  const disconnect = useCallback(async () => {
    if (transportRef.current) {
      try {
        transportRef.current.close()
        transportRef.current = null
        setTransport(null)
        setIsConnected(false)
        onDisconnect?.()
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error('Failed to disconnect')
        setError(error)
        onError?.(error)
      }
    }
  }, [onDisconnect, onError])

  const connect = useCallback(async () => {
    if (isConnecting || isConnected) return

    setIsConnecting(true)
    setError(null)

    const certHash = new Uint8Array([
      0xcb, 0xe2, 0x01, 0x2e, 0x29, 0x1a, 0x4f, 0x15, 0xe9, 0xaf, 0xfa, 0x0d,
      0x58, 0xe7, 0xa4, 0x4a, 0xd0, 0x9b, 0x75, 0x8f, 0x18, 0x62, 0x90, 0xa3,
      0x8f, 0x31, 0x00, 0x23, 0x42, 0x0f, 0xe0, 0x1e,
    ])

    try {
      const wt = new WebTransport(url, {
        serverCertificateHashes: [
          {
            algorithm: 'sha-256',
            value: certHash,
          },
        ],
      })
      await wt.ready

      transportRef.current = wt
      setTransport(wt)
      setIsConnected(true)
      setIsConnecting(false)
      onConnect?.()

      // Handle connection close
      wt.closed
        .then(() => {
          setIsConnected(false)
          setTransport(null)
          transportRef.current = null
          onDisconnect?.()
        })
        .catch((err) => {
          const error =
            err instanceof Error
              ? err
              : new Error('Connection closed with error')
          setError(error)
          setIsConnected(false)
          setTransport(null)
          transportRef.current = null
          onError?.(error)
        })
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to connect')
      setError(error)
      setIsConnecting(false)
      onError?.(error)
    }
  }, [url, isConnecting, isConnected, onConnect, onDisconnect, onError])

  const sendDatagram = useCallback((data: Uint8Array) => {
    if (!transportRef.current) {
      throw new Error('WebTransport is not connected')
    }

    const writer = transportRef.current.datagrams.writable.getWriter()
    writer.write(data).finally(() => writer.releaseLock())
  }, [])

  const createBidirectionalStream = useCallback(async () => {
    if (!transportRef.current) {
      throw new Error('WebTransport is not connected')
    }
    return transportRef.current.createBidirectionalStream()
  }, [])

  const createUnidirectionalStream = useCallback(async () => {
    if (!transportRef.current) {
      throw new Error('WebTransport is not connected')
    }
    return transportRef.current.createUnidirectionalStream()
  }, [])

  useEffect(() => {
    if (autoConnect) {
      connect()
    }

    return () => {
      if (transportRef.current) {
        transportRef.current.close()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoConnect])

  return {
    transport,
    isConnected,
    isConnecting,
    error,
    connect,
    disconnect,
    sendDatagram,
    createBidirectionalStream,
    createUnidirectionalStream,
  }
}
