'use client'

import { useState, useCallback } from 'react'
import type {
  UseAgentToolsOptions,
  OAuthActionOptions,
  ToolListResponse,
  OAuthAuthorizeResponse,
  OAuthStatusResponse,
  OAuthRefreshResponse,
  OAuthDisconnectResponse,
  ToolWithAuthStatus,
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

export function useAgentTools() {
  const [tools, setTools] = useState<ToolWithAuthStatus[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchToolList = useCallback(
    async (
      options: UseAgentToolsOptions,
      extraParams?: Record<string, any>
    ): Promise<ToolListResponse> => {
      const params = new URLSearchParams({
        user_id: options.userId,
        business_account_id: options.businessAccountId,
      })

      if (extraParams) {
        Object.entries(extraParams).forEach(([key, value]) => {
          params.set(key, value)
        })
      }

      return fetchApi<ToolListResponse>(
        `${options.apiBaseUrl}/agents/${options.agentId}/tools?${params}`
      )
    },
    []
  )

  const fetchTools = useCallback(
    async (options: UseAgentToolsOptions) => {
      setIsLoading(true)
      setError(null)

      try {
        const baseData = await fetchToolList(options)
        const mergedTools = [...baseData.tools]
        const seenToolIds = new Set(baseData.tools.map((tool) => tool.id))

        const optionalQueries = [
          { include_inactive: 'true' },
          { is_active: 'false' },
        ]

        for (const query of optionalQueries) {
          try {
            const extraData = await fetchToolList(options, query)
            for (const tool of extraData.tools) {
              if (!seenToolIds.has(tool.id)) {
                seenToolIds.add(tool.id)
                mergedTools.push(tool)
              }
            }
          } catch {
            // Algunos backends no soportan estos filtros opcionales.
            // Ignoramos el error y usamos el resultado base.
          }
        }

        setTools(mergedTools)
        return mergedTools
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to fetch tools'
        setError(message)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [fetchToolList]
  )

  const updateToolStatus = useCallback(
    (toolId: string, updates: Partial<ToolWithAuthStatus>) => {
      setTools((prev) =>
        prev.map((tool) =>
          tool.id === toolId ? { ...tool, ...updates } : tool
        )
      )
    },
    []
  )

  const toggleToolActive = useCallback(
    async (toolId: string, isActive: boolean, apiBaseUrl?: string) => {
      setTools((prev) =>
        prev.map((tool) =>
          tool.id === toolId ? { ...tool, is_active: isActive } : tool
        )
      )

      if (apiBaseUrl) {
        try {
          await fetchApi<{ success: boolean }>(
            `${apiBaseUrl}/tools/${toolId}`,
            {
              method: 'PATCH',
              body: JSON.stringify({ is_active: isActive }),
            }
          )
        } catch (err) {
          setTools((prev) =>
            prev.map((tool) =>
              tool.id === toolId ? { ...tool, is_active: !isActive } : tool
            )
          )
          throw err
        }
      }
    },
    []
  )

  return {
    tools,
    isLoading,
    error,
    fetchTools,
    updateToolStatus,
    toggleToolActive,
  }
}

export function useOAuth2Authorize() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const authorize = useCallback(async (options: OAuthActionOptions) => {
    setIsLoading(true)
    setError(null)

    try {
      const data = await fetchApi<OAuthAuthorizeResponse>(
        `${options.apiBaseUrl}/tools/${options.toolId}/oauth2/authorize`,
        {
          method: 'POST',
          body: JSON.stringify({
            owner_type: options.ownerType,
            owner_id: options.ownerId,
          }),
        }
      )

      return data
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to authorize'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { authorize, isLoading, error }
}

export function useOAuth2Status() {
  const [status, setStatus] = useState<OAuthStatusResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchStatus = useCallback(async (options: OAuthActionOptions) => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        owner_type: options.ownerType,
        owner_id: options.ownerId,
      })

      const data = await fetchApi<OAuthStatusResponse>(
        `${options.apiBaseUrl}/tools/${options.toolId}/oauth2/status?${params}`
      )

      setStatus(data)
      return data
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to get status'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { status, isLoading, error, fetchStatus }
}

export function useOAuth2Disconnect() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const disconnect = useCallback(async (options: OAuthActionOptions) => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        owner_type: options.ownerType,
        owner_id: options.ownerId,
      })

      const data = await fetchApi<OAuthDisconnectResponse>(
        `${options.apiBaseUrl}/tools/${options.toolId}/oauth2?${params}`,
        { method: 'DELETE' }
      )

      return data
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to disconnect'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { disconnect, isLoading, error }
}

export function useOAuth2Refresh() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async (options: OAuthActionOptions) => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        owner_type: options.ownerType,
        owner_id: options.ownerId,
      })

      const data = await fetchApi<OAuthRefreshResponse>(
        `${options.apiBaseUrl}/tools/${options.toolId}/oauth2/refresh?${params}`,
        { method: 'POST' }
      )

      return data
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to refresh'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { refresh, isLoading, error }
}

export interface DiscoverResponse {
  discovered: boolean
  authorize_url?: string
  token_url?: string
  client_id?: string
  scopes?: string[]
  resource?: string
}

export function useOAuth2Discover() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const discover = useCallback(async (toolId: string, apiBaseUrl: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const data = await fetchApi<DiscoverResponse>(
        `${apiBaseUrl}/tools/${toolId}/oauth2/discover`,
        { method: 'POST' }
      )

      return data
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to discover'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { discover, isLoading, error }
}

export function openOAuthPopup(authorizationUrl: string): Promise<boolean> {
  return new Promise((resolve) => {
    const width = 520
    const height = 640
    const left = window.screenX + (window.outerWidth - width) / 2
    const top = window.screenY + (window.outerHeight - height) / 2

    const popup = window.open(
      authorizationUrl,
      'oauth-popup',
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
    )

    if (!popup) {
      resolve(false)
      return
    }

    const interval = setInterval(() => {
      if (popup.closed) {
        clearInterval(interval)
        resolve(true)
      }
    }, 500)
  })
}

export function useOAuth2Tools() {
  const authorize = useOAuth2Authorize()
  const disconnect = useOAuth2Disconnect()
  const refresh = useOAuth2Refresh()

  const startOAuthFlow = useCallback(
    async (options: OAuthActionOptions) => {
      const response = await authorize.authorize(options)
      if (response.authorization_url) {
        window.location.href = response.authorization_url
      }
      return response
    },
    [authorize]
  )

  const startOAuthFlowPopup = useCallback(
    async (options: OAuthActionOptions) => {
      const response = await authorize.authorize(options)
      if (response.authorization_url) {
        await openOAuthPopup(response.authorization_url)
      }
      return response
    },
    [authorize]
  )

  return {
    authorize: authorize.authorize,
    disconnect: disconnect.disconnect,
    refresh: refresh.refresh,
    startOAuthFlow,
    startOAuthFlowPopup,
  }
}
