'use client'

import { useCallback, useMemo } from 'react'
import { useModels } from '@/hooks/use-models'
import { useConfiguredLlmProviders } from '@/hooks/use-configured-llm-providers'
import { useLlmProviderPolicy } from '@/hooks/use-llm-provider-policy'
import {
  buildLlmProviderOptions,
  getLlmProviderLabel,
} from '@/lib/models/agents/llm-provider'
import { LLM_PROVIDERS_ROUTE } from '@/lib/models/agents/llm-provider-policy'

/**
 * Ids internos que difieren del id de models.dev (fuente de modelos/logos).
 * Mismo criterio que `LOGO_ALIASES` en ProviderLogo.
 */
const CATALOG_ALIASES: Record<string, string> = {
  gemini: 'google',
  meta: 'llama',
}

export interface AvailableProviderOption {
  value: string
  label: string
}

/**
 * Fuente única para los selectores de proveedor/modelo, honrando la política
 * `block_apex_llm_providers`:
 *
 * - No restringido → comportamiento actual: cada selector usa su propia lista
 *   completa (defaults de plataforma + catálogo).
 * - Restringido → solo los proveedores globales configurados y activos de la
 *   cuenta (`configuredOptions`); si no hay ninguno, `hasConfiguredProviders`
 *   es `false` y el selector debe mostrar el acceso directo a configurarlos.
 *
 * `getModelsForProvider` resuelve alias de catálogo, y `allowedProviderValues`
 * permite filtrar cualquier lista existente sin duplicar la lógica.
 */
export function useAvailableLlmProviders() {
  const {
    allModels,
    isLoading: modelsLoading,
    getModelsForProvider,
  } = useModels()
  const { blockApexProviders, isLoading: policyLoading } =
    useLlmProviderPolicy()
  const { providers: configured, isLoading: configuredLoading } =
    useConfiguredLlmProviders(blockApexProviders)

  const isRestricted = blockApexProviders

  // Cargando la validación de disponibilidad (política + proveedores
  // configurados). Distinto del catálogo de modelos: los consumidores deben
  // mostrar un estado de "validando" y solo declarar que NO hay proveedores
  // cuando esta bandera sea false.
  const availabilityLoading =
    policyLoading || (isRestricted && configuredLoading)

  const labelOptions = useMemo(
    () => buildLlmProviderOptions(allModels),
    [allModels]
  )

  const resolveCatalogId = useCallback(
    (value: string): string => {
      if (!value) return value
      if (allModels[value]) return value
      const alias = CATALOG_ALIASES[value]
      if (alias && allModels[alias]) return alias
      return value
    },
    [allModels]
  )

  const configuredOptions = useMemo<AvailableProviderOption[]>(() => {
    return configured
      .filter((p) => p.is_active)
      .map((p) => ({
        value: p.provider,
        label: getLlmProviderLabel(labelOptions, p.provider),
      }))
  }, [configured, labelOptions])

  const allowedProviderValues = useMemo(
    () => new Set(configuredOptions.map((o) => o.value)),
    [configuredOptions]
  )

  const getModels = useCallback(
    (value: string) => getModelsForProvider(resolveCatalogId(value)),
    [getModelsForProvider, resolveCatalogId]
  )

  return {
    isRestricted,
    isLoading: modelsLoading || availabilityLoading,
    availabilityLoading,
    configuredOptions,
    hasConfiguredProviders: configuredOptions.length > 0,
    allowedProviderValues,
    getModelsForProvider: getModels,
    resolveCatalogId,
    configureHref: LLM_PROVIDERS_ROUTE,
  }
}
