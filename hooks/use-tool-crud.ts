'use client'

import { useState, useCallback } from 'react'
import type {
  ToolDefinitionPayload,
  ToolDefinitionResponse,
} from '../lib/types/oauth2-types'
import {
  deleteTool as deleteToolAction,
  getTool as getToolAction,
  createTool as createToolAction,
  updateTool as updateToolAction,
} from '@/lib/actions/api/tools'

export function useGetTool() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async (toolId: string, _apiBaseUrl: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const data = await getToolAction({ toolId })
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
      _apiBaseUrl: string
    ) => {
      setIsLoading(true)
      setError(null)

      try {
        const data = await createToolAction({ agentId, payload })
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
      _apiBaseUrl: string
    ) => {
      setIsLoading(true)
      setError(null)

      try {
        const data = await updateToolAction({ toolId, payload })
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

  const mutate = useCallback(async (toolId: string, _apiBaseUrl: string) => {
    setIsLoading(true)
    setError(null)

    try {
      await deleteToolAction({ toolId })
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
