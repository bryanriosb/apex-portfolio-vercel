'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  PlugIcon,
  SettingsIcon,
  Loader2Icon,
  ChevronRightIcon,
} from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover'
import {
  useAgentTools,
  useOAuth2Tools,
  useOAuth2Discover,
} from '@/hooks/use-oauth2-tools'
import {
  AuthStatus,
  isMcpTool,
  ToolWithAuthStatus,
} from '@/lib/types/oauth2-types'
import { toast } from 'sonner'
import {
  getConnectorAuthTypeLabel,
  isConnectedAuthStatus,
} from '@/components/oauth2/connector-display'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface PromptInputConnectorMenuProps {
  agentId: string
  userId: string
  businessAccountId: string
  apiBaseUrl: string
  isOpen: boolean
  handleConnectors: (value: boolean) => void
}

const AUTH_STATUS_ICONS: Record<AuthStatus, React.ElementType> = {
  connected: PlugIcon,
  expired: PlugIcon,
  disconnected: PlugIcon,
  not_required: PlugIcon,
}

export function PromptInputConnectorMenu({
  agentId,
  userId,
  businessAccountId,
  apiBaseUrl,
  isOpen,
  handleConnectors,
}: PromptInputConnectorMenuProps) {
  const [tools, setTools] = useState<ToolWithAuthStatus[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [connectingToolId, setConnectingToolId] = useState<string | null>(null)
  const { fetchTools, toggleToolActive } = useAgentTools()
  const { startOAuthFlowPopup, refresh } = useOAuth2Tools()
  const { discover: discoverTool } = useOAuth2Discover()
  const router = useRouter()

  const getOwner = useCallback(
    (tool: ToolWithAuthStatus) => {
      const isShared = tool.token_scope === 'shared'
      return {
        ownerType: (isShared ? 'admin' : 'user') as 'admin' | 'user',
        ownerId: isShared ? businessAccountId : userId,
      }
    },
    [businessAccountId, userId]
  )

  const syncTools = useCallback(async () => {
    const data = await fetchTools({
      agentId,
      userId,
      businessAccountId,
      apiBaseUrl,
    })

    setTools((data || []).filter(isMcpTool))
  }, [agentId, userId, businessAccountId, apiBaseUrl, fetchTools])

  const loadTools = useCallback(() => {
    setIsLoading(true)
    fetchTools({ agentId, userId, businessAccountId, apiBaseUrl })
      .then((data) => {
        setTools((data || []).filter(isMcpTool))
      })
      .catch((err) => console.error('Failed to fetch tools:', err))
      .finally(() => setIsLoading(false))
  }, [agentId, userId, businessAccountId, apiBaseUrl, fetchTools])

  useEffect(() => {
    loadTools()
  }, [loadTools])

  const handleToggle = async (toolId: string, isActive: boolean) => {
    try {
      await toggleToolActive(toolId, isActive, apiBaseUrl)
      setTools((prev) =>
        prev.map((t) => (t.id === toolId ? { ...t, is_active: isActive } : t))
      )
    } catch (err) {
      console.error('Failed to toggle tool:', err)
    }
  }

  const handleConnect = async (tool: ToolWithAuthStatus) => {
    const { ownerType, ownerId } = getOwner(tool)
    setConnectingToolId(tool.id)

    try {
      await startOAuthFlowPopup({
        toolId: tool.id,
        ownerType,
        ownerId,
        apiBaseUrl,
      })

      await syncTools()
    } catch (err) {
      console.error('Failed to start OAuth flow:', err)
      toast.error('No se pudo autenticar el conector', {
        description:
          err instanceof Error
            ? err.message
            : 'Intenta nuevamente desde el menú de conectores',
      })
    } finally {
      setConnectingToolId(null)
    }
  }

  const handleReconnect = async (tool: ToolWithAuthStatus) => {
    const { ownerType, ownerId } = getOwner(tool)
    setConnectingToolId(tool.id)

    try {
      await refresh({
        toolId: tool.id,
        ownerType,
        ownerId,
        apiBaseUrl,
      })
      await syncTools()
    } catch (refreshError) {
      console.warn(
        'Refresh failed, falling back to OAuth popup re-auth:',
        refreshError
      )

      try {
        await startOAuthFlowPopup({
          toolId: tool.id,
          ownerType,
          ownerId,
          apiBaseUrl,
        })
        await syncTools()
      } catch (authError) {
        console.error('Failed to reconnect tool:', authError)
        toast.error('No se pudo reconectar desde el chat', {
          description:
            authError instanceof Error
              ? authError.message
              : 'Intenta nuevamente o revisa el conector en la sección de Conectores.',
        })
      }
    } finally {
      setConnectingToolId(null)
    }
  }

  const handleDiscover = async (toolId: string) => {
    setConnectingToolId(toolId)
    try {
      await discoverTool(toolId, apiBaseUrl)
      await syncTools()
    } catch (err) {
      console.error('Failed to discover tool:', err)
      toast.error('No se pudo ejecutar Discover', {
        description:
          err instanceof Error
            ? err.message
            : 'Revisa la configuración del conector',
      })
    } finally {
      setConnectingToolId(null)
    }
  }

  const handleNavigateToConnectors = () => {
    router.push('/connectors')
  }

  const connectedCount = tools.filter((t) =>
    isConnectedAuthStatus(t.auth_status)
  ).length

  const statusColor = connectedCount > 0 ? 'text-primary' : 'text-red-500'

  return (
    <Popover open={isOpen} onOpenChange={handleConnectors}>
      <PopoverTrigger>
        <div
          role="button"
          className={cn('flex items-center justify-center', statusColor)}
        >
          {isLoading ? (
            <Loader2Icon className="h-4 w-4 animate-spin" />
          ) : (
            <PlugIcon className="h-4 w-4" />
          )}
        </div>
      </PopoverTrigger>

      <PopoverContent
        sideOffset={8}
        className="w-72 p-0 z-[100]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <span className="text-sm font-medium">Conectores</span>
          <span className="text-xs text-muted-foreground">
            {connectedCount}/{tools.length}
          </span>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-6">
            <Loader2Icon className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Empty */}
        {!isLoading && tools.length === 0 && (
          <div className="px-3 py-4 text-center">
            <p className="text-xs text-muted-foreground">
              No hay conectores disponibles
            </p>
          </div>
        )}

        {/* List */}
        {!isLoading && tools.length > 0 && (
          <ScrollArea className="max-h-64">
            <div className="flex flex-col">
              {tools.map((tool) => {
                const ToolStatusIcon = AUTH_STATUS_ICONS[tool.auth_status]
                const isConnecting = connectingToolId === tool.id
                const iconColor = isConnecting
                  ? 'text-muted-foreground animate-spin'
                  : isConnectedAuthStatus(tool.auth_status)
                    ? 'text-primary'
                    : tool.auth_status === 'expired'
                      ? 'text-orange-500'
                      : 'text-red-500'
                const StatusIcon = isConnecting ? Loader2Icon : ToolStatusIcon

                const needsDiscovery =
                  tool.auth_status === 'disconnected' &&
                  tool.discovery_required &&
                  !tool.discovered
                const canAuth =
                  tool.auth_status === 'disconnected' && !needsDiscovery
                const canReconnect = tool.auth_status === 'expired'

                return (
                  <div
                    key={tool.id}
                    className="flex items-center justify-between px-3 py-2 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <StatusIcon className={`h-4 w-4 shrink-0 ${iconColor}`} />
                      <div className="min-w-0">
                        <span className="text-sm truncate block">
                          {tool.name}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {getConnectorAuthTypeLabel(tool.auth_type)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {needsDiscovery && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-xs"
                          disabled={isConnecting}
                          onClick={() => handleDiscover(tool.id)}
                        >
                          {isConnecting ? (
                            <Loader2Icon className="h-3 w-3 animate-spin" />
                          ) : (
                            'Discover'
                          )}
                        </Button>
                      )}
                      {canAuth && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-xs"
                          disabled={isConnecting}
                          onClick={() => handleConnect(tool)}
                        >
                          {isConnecting ? (
                            <Loader2Icon className="h-3 w-3 animate-spin" />
                          ) : (
                            'Autenticar'
                          )}
                        </Button>
                      )}
                      {canReconnect && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-xs"
                          disabled={isConnecting}
                          onClick={() => handleReconnect(tool)}
                        >
                          {isConnecting ? (
                            <Loader2Icon className="h-3 w-3 animate-spin" />
                          ) : (
                            'Reconectar'
                          )}
                        </Button>
                      )}
                      <Switch
                        checked={tool.is_active}
                        onCheckedChange={(checked) =>
                          handleToggle(tool.id, checked)
                        }
                        disabled={isConnecting}
                        size="sm"
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        )}

        {/* Footer */}
        <Separator />
        <button
          className="flex items-center gap-2 w-full px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
          onClick={handleNavigateToConnectors}
        >
          <SettingsIcon className="h-3 w-3" />
          Administrar conectores
          <ChevronRightIcon className="h-3 w-3 ml-auto" />
        </button>
      </PopoverContent>
    </Popover>
  )
}
