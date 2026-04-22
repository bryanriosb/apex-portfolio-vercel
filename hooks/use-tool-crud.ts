'use client'

import { useState, useCallback } from 'react'
import type {
  ToolDefinitionPayload,
  ToolDefinitionResponse,
} from '../lib/types/oauth2-types'

async function fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: `Request failed (${response.status} ${response.statusText})`,
    }))
    throw new Error(
      error.error || error.message || `API error: ${response.status}`
    )
  }

  return response.json()
}

export function useGetTool() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async (toolId: string, apiBaseUrl: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const data = await fetchApi<ToolDefinitionResponse>(
        `${apiBaseUrl}/tools/${toolId}`
      )
      return data
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to fetch tool'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { fetch, isLoading, error }
}

export function useCreateTool() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mutate = useCallback(
    async (
      agentId: string,
      payload: ToolDefinitionPayload,
      apiBaseUrl: string
    ) => {
      setIsLoading(true)
      setError(null)

      try {
        const data = await fetchApi<ToolDefinitionResponse>(
          `${apiBaseUrl}/agents/${agentId}/tools`,
          {
            method: 'POST',
            body: JSON.stringify(payload),
          }
        )
        return data
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to create tool'
        setError(message)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  return { mutate, isLoading, error }
}

export function useUpdateTool() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mutate = useCallback(
    async (
      toolId: string,
      payload: Partial<ToolDefinitionPayload>,
      apiBaseUrl: string
    ) => {
      setIsLoading(true)
      setError(null)

      try {
        const data = await fetchApi<ToolDefinitionResponse>(
          `${apiBaseUrl}/tools/${toolId}`,
          {
            method: 'PUT',
            body: JSON.stringify(payload),
          }
        )
        return data
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to update tool'
        setError(message)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  return { mutate, isLoading, error }
}

export function useDeleteTool() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mutate = useCallback(async (toolId: string, apiBaseUrl: string) => {
    setIsLoading(true)
    setError(null)

    try {
      await fetchApi<{ success: boolean }>(`${apiBaseUrl}/tools/${toolId}`, {
        method: 'DELETE',
      })
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to delete tool'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { mutate, isLoading, error }
}
