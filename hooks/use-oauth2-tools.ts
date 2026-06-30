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
import {
  listTools,
  toggleToolActive as toggleToolActiveAction,
  authorizeOAuth2,
  refreshOAuth2,
  disconnectOAuth2,
  discoverOAuth2,
} from '@/lib/actions/api/tools'

export function useAgentTools() {
  const [tools, setTools] = useState<ToolWithAuthStatus[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchToolList = useCallback(
    async (
      options: UseAgentToolsOptions,
      extraParams?: Record<string, any>
    ): Promise<ToolListResponse> => {
      const response = await listTools({
        agentId: options.agentId,
        userId: options.userId,
        businessAccountId: options.businessAccountId,
        ...extraParams,
      })

      return { tools: response.tools as any }
    },
    []
  )

  const fetchTools = useCallback(
    async (options: UseAgentToolsOptions) => {
      setIsLoading(true)
      setError(null)

      try {
        const timeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout fetching tools')), 5000)
        )

        const [baseData, extraData1, extraData2] = await Promise.all([
          Promise.race([fetchToolList(options), timeout]),
          Promise.race([fetchToolList(options, { includeInactive: true }), timeout]),
          Promise.race([fetchToolList(options, { isActive: false }), timeout]),
        ])

        const mergedTools = [...baseData.tools]
        const seenToolIds = new Set(baseData.tools.map((tool) => tool.id))

        for (const extraData of [extraData1, extraData2]) {
          for (const tool of extraData.tools) {
            if (!seenToolIds.has(tool.id)) {
              seenToolIds.add(tool.id)
              mergedTools.push(tool)
            }
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
    async (toolId: string, isActive: boolean, _apiBaseUrl?: string) => {
      setTools((prev) =>
        prev.map((tool) =>
          tool.id === toolId ? { ...tool, is_active: isActive } : tool
        )
      )

      try {
        await toggleToolActiveAction({ toolId, isActive })
      } catch (err) {
        setTools((prev) =>
          prev.map((tool) =>
            tool.id === toolId ? { ...tool, is_active: !isActive } : tool
          )
        )
        throw err
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
      const data = await authorizeOAuth2({
        toolId: options.toolId,
        ownerType: options.ownerType,
        ownerId: options.ownerId,
      })

      return data as OAuthAuthorizeResponse
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
      // TODO: Implement getStatus server action if needed
      throw new Error('OAuth2 status not implemented as server action yet')
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
      const data = await disconnectOAuth2({
        toolId: options.toolId,
        ownerType: options.ownerType,
        ownerId: options.ownerId,
      })

      return data as OAuthDisconnectResponse
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
      const data = await refreshOAuth2({
        toolId: options.toolId,
        ownerType: options.ownerType,
        ownerId: options.ownerId,
      })

      return data as OAuthRefreshResponse
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

  const discover = useCallback(async (toolId: string, _apiBaseUrl: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const data = await discoverOAuth2({ toolId })

      return data as DiscoverResponse
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
