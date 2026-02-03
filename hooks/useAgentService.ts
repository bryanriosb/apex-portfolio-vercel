import { useState, useEffect, useRef } from 'react'
import { AgentService } from '@/lib/services/agent/agent-service'

interface UseAgentServiceOptions {
  url: string
  autoConnect?: boolean
}

interface UseAgentServiceReturn {
  service: AgentService | null
  isConnected: boolean
  isConnecting: boolean
  error: Error | null
  connect: () => Promise<void>
  disconnect: () => void
}

// Singleton global para evitar múltiples instancias
let globalServiceInstance: AgentService | null = null
let globalServiceUrl: string | null = null
let initializationPromise: Promise<void> | null = null
let connectionCount = 0

/**
 * Hook para gestionar el servicio centralizado de agentes
 * Usa un singleton global para evitar conexiones duplicadas
 */
export function useAgentService({
  url,
  autoConnect = true,
}: UseAgentServiceOptions): UseAgentServiceReturn {
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const isMountedRef = useRef(true)
  const hasConnectedRef = useRef(false)

  const connect = async () => {
    // Si ya hay una conexión válida con la misma URL, reutilizarla
    if (globalServiceInstance?.isConnected() && globalServiceUrl === url) {
      setIsConnected(true)
      return
    }

    // Si ya hay una inicialización en progreso, esperarla
    if (initializationPromise) {
      try {
        await initializationPromise
        if (isMountedRef.current) {
          setIsConnected(true)
        }
        return
      } catch (err) {
        console.error('Error en inicialización previa:', err)
      }
    }

    if (!isMountedRef.current) return

    setIsConnecting(true)
    setError(null)

    // Crear nueva promesa de inicialización
    initializationPromise = (async () => {
      try {
        connectionCount++

        // Si hay una instancia previa con diferente URL, desconectarla
        if (globalServiceInstance && globalServiceUrl !== url) {
          globalServiceInstance.disconnect()
          globalServiceInstance = null
        }

        // Crear nueva instancia solo si no existe
        if (!globalServiceInstance) {
          const service = new AgentService(url)
          await service.initialize()
          globalServiceInstance = service
          globalServiceUrl = url
        }

        if (isMountedRef.current) {
          setIsConnected(true)
        }
      } catch (err) {
        console.log('Error:', err)

        const error =
          err instanceof Error ? err : new Error('Connection failed')
        if (isMountedRef.current) {
          setError(error)
        }
        console.error('❌ Failed to connect agent service:', error)
        // Limpiar instancia fallida
        globalServiceInstance = null
        globalServiceUrl = null
        throw error
      } finally {
        if (isMountedRef.current) {
          setIsConnecting(false)
        }
        // Limpiar promesa de inicialización
        initializationPromise = null
      }
    })()

    await initializationPromise
  }

  const disconnect = () => {
    connectionCount--

    // Solo desconectar cuando no haya más componentes usando el servicio
    if (connectionCount <= 0 && globalServiceInstance) {
      globalServiceInstance.disconnect()
      globalServiceInstance = null
      globalServiceUrl = null
      connectionCount = 0
    }

    setIsConnected(false)
  }

  // Auto-conectar si está habilitado
  useEffect(() => {
    if (autoConnect && !hasConnectedRef.current) {
      hasConnectedRef.current = true
      connect()
    }

    // Cleanup al desmontar
    return () => {
      isMountedRef.current = false
      disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    service: globalServiceInstance,
    isConnected,
    isConnecting,
    error,
    connect,
    disconnect,
  }
}

/**
 * Función para resetear completamente el servicio (útil para testing o logout)
 */
export function resetAgentService(): void {
  if (globalServiceInstance) {
    globalServiceInstance.disconnect()
    globalServiceInstance = null
    globalServiceUrl = null
    connectionCount = 0
    initializationPromise = null
    console.log('🔄 Agent service reset completamente')
  }
}
