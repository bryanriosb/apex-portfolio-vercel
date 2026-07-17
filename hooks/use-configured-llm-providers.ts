'use client'

import { useState, useEffect, useCallback } from 'react'
import { LlmProvidersService } from '@/lib/services/agents/llm-providers-service'
import type { LlmProvider } from '@/lib/models/agents/llm-provider'
import { useActiveBusinessStore } from '@/lib/store/active-business-store'

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
  }, [enabled, load, businessAccountId])

  return { providers, isLoading, error, refetch: load }
}
