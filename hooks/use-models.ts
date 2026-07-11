'use client'

import { useState, useEffect, useCallback } from 'react'

interface ModelInfo {
  id: string
  name: string
}

interface ProviderModels {
  [modelId: string]: ModelInfo
}

export interface ModelsApiResponse {
  [providerId: string]: {
    id: string
    name: string
    // Paquete npm del SDK; '@ai-sdk/openai-compatible' indica API OpenAI standard
    npm?: string
    // Base URL del API para providers OpenAI-compatible
    api?: string
    models: ProviderModels
  }
}

const MODELS_CACHE_KEY = 'models_dev_cache'
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000 // 24 hours

interface CacheEntry {
  data: ModelsApiResponse
  timestamp: number
}

function getCachedData(): ModelsApiResponse | null {
  if (typeof window === 'undefined') return null
  try {
    const cached = localStorage.getItem(MODELS_CACHE_KEY)
    if (!cached) return null
    const entry: CacheEntry = JSON.parse(cached)
    if (Date.now() - entry.timestamp > CACHE_DURATION_MS) {
      localStorage.removeItem(MODELS_CACHE_KEY)
      return null
    }
    return entry.data
  } catch {
    return null
  }
}

function setCachedData(data: ModelsApiResponse): void {
  if (typeof window === 'undefined') return
  try {
    const entry: CacheEntry = { data, timestamp: Date.now() }
    localStorage.setItem(MODELS_CACHE_KEY, JSON.stringify(entry))
  } catch {
    // ignore cache errors
  }
}

export function useModels(provider?: string) {
  const [allModels, setAllModels] = useState<ModelsApiResponse>({})
  const [models, setModels] = useState<ModelInfo[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchModels = useCallback(async () => {
    const cached = getCachedData()
    if (cached) {
      setAllModels(cached)
      return cached
    }

    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('https://models.dev/api.json')
      if (!response.ok) {
        throw new Error('Error al cargar modelos')
      }
      const data: ModelsApiResponse = await response.json()
      setAllModels(data)
      setCachedData(data)
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchModels()
  }, [fetchModels])

  useEffect(() => {
    if (!provider || !allModels[provider]) {
      setModels([])
      return
    }

    const providerData = allModels[provider]
    const modelList: ModelInfo[] = Object.values(providerData.models).map(
      (model) => ({
        id: model.id,
        name: model.name || model.id,
      })
    )
    setModels(modelList)
  }, [provider, allModels])

  const getModelsForProvider = useCallback(
    (providerId: string): ModelInfo[] => {
      if (!allModels[providerId]) return []
      return Object.values(allModels[providerId].models).map((model) => ({
        id: model.id,
        name: model.name || model.id,
      }))
    },
    [allModels]
  )

  return {
    models,
    allModels,
    isLoading,
    error,
    getModelsForProvider,
    refetch: fetchModels,
  }
}
