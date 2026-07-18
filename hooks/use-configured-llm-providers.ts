'use client'

import { useState, useEffect, useCallback } from 'react'
import { LlmProvidersService } from '@/lib/services/agents/llm-providers-service'
import type { LlmProvider } from '@/lib/models/agents/llm-provider'
import { useActiveBusinessStore } from '@/lib/store/active-business-store'
import { useDataRefreshStore } from '@/lib/store/data-refresh-store'

/** Clave del trigger compartido de refresco para proveedores LLM globales. */
export const LLM_PROVIDERS_REFRESH_KEY = 'llm-providers'

/**
 * Señal global de cambio de proveedores: al crear/editar/activar/eliminar un
 * proveedor, notifica a todos los consumidores montados (GlobalChat, selector
 * del form de agentes, etc.) para que refresquen su copia sin recargar la
 * página. Invocable fuera de React (usa el store directamente).
 */
export function notifyLlmProvidersChanged() {
  useDataRefreshStore.getState().triggerRefresh(LLM_PROVIDERS_REFRESH_KEY)
}

/**
 * Carga los proveedores LLM globales configurados por la cuenta activa
 * (`GET /agents/llm-providers`, tenant resuelto server-side por cookie).
 *
 * @param enabled cuando es `false` no dispara la petición (evita llamadas
 * innecesarias mientras la política no esté activa).
 */
export function useConfiguredLlmProviders(enabled = true) {
  const businessAccountId = useActiveBusinessStore(
    (s) => s.activeBusiness?.business_account_id
  )
  // Timestamp de la última señal de cambio de proveedores: al incrementarse
  // (notifyLlmProvidersChanged) el efecto de carga vuelve a ejecutarse.
  const refreshStamp = useDataRefreshStore(
    (s) => s.refreshTriggers[LLM_PROVIDERS_REFRESH_KEY] ?? 0
  )
  const [providers, setProviders] = useState<LlmProvider[]>([])
  const [isLoading, setIsLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const service = new LlmProvidersService()
      const data = await service.listProviders()
      setProviders(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar proveedores')
      setProviders([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!enabled) {
      setProviders([])
      setIsLoading(false)
      return
    }
    load()
    // businessAccountId en deps: recargar al cambiar de cuenta activa.
    // refreshStamp en deps: recargar cuando otro componente guarda/borra un
    // proveedor y emite notifyLlmProvidersChanged().
  }, [enabled, load, businessAccountId, refreshStamp])

  return { providers, isLoading, error, refetch: load }
}
