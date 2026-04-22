'use client'

import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import {
  PlugIcon,
  UnplugIcon,
  RefreshCwIcon,
  TrashIcon,
  SettingsIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  XCircleIcon,
  Loader2Icon,
  CompassIcon,
} from 'lucide-react'
import { parseISO, format } from 'date-fns'
import type { ToolWithAuthStatus, AuthStatus } from '@/lib/types/oauth2-types'
import {
  getConnectorAuthTypeLabel,
  isConnectedAuthStatus,
} from '@/components/oauth2/connector-display'
import { cn } from '@/lib/utils'
import { Spinner } from '../ui/spinner'

interface ToolConnectorItemProps {
  tool: ToolWithAuthStatus
  onConnect?: (toolId: string) => void
  onDisconnect?: (toolId: string) => void
  onRefresh?: (toolId: string) => void
  onToggle?: (toolId: string, isActive: boolean) => void
  onDelete?: (toolId: string) => void
  onEdit?: (toolId: string) => void
  onDiscover?: (toolId: string) => void
  loadingAction?: string | null
}

const AUTH_STATUS_CONFIG: Record<
  AuthStatus,
  {
    label: string
    variant: 'default' | 'secondary' | 'destructive' | 'outline'
    icon?: React.ElementType
    className?: string
  }
> = {
  connected: { label: 'Conectado', icon: CheckCircleIcon, variant: 'default' },
  expired: { label: 'Expirado', icon: AlertCircleIcon, variant: 'destructive' },
  disconnected: {
    label: 'Desconectado',
    icon: XCircleIcon,
    variant: 'destructive',
  },
  not_required: {
    label: 'Conectado',
    icon: CheckCircleIcon,
    variant: 'default',
    className: '',
  },
}

function getProviderIcon(provider: string | null): React.ElementType {
  const icons: Record<string, React.ElementType> = {
    github: PlugIcon,
    google: PlugIcon,
    slack: PlugIcon,
    notion: PlugIcon,
    default: PlugIcon,
  }
  return icons[provider || 'default'] || PlugIcon
}

export function ToolConnectorItem({
  tool,
  onConnect,
  onDisconnect,
  onRefresh,
  onToggle,
  onDelete,
  onEdit,
  onDiscover,
  loadingAction = null,
}: ToolConnectorItemProps) {
  const isBusy = loadingAction !== null
  const statusConfig = AUTH_STATUS_CONFIG[tool.auth_status]
  const StatusIcon = statusConfig.icon
  const ProviderIcon = getProviderIcon(tool.auth_meta?.provider || null)
  const authTypeLabel = getConnectorAuthTypeLabel(tool.auth_type)

  const needsDiscovery =
    tool.auth_status === 'disconnected' &&
    tool.discovery_required &&
    !tool.discovered
  const canConnect =
    tool.auth_status === 'disconnected' &&
    (!tool.discovery_required || tool.discovered)

  const handleConnect = () => onConnect?.(tool.id)
  const handleDisconnect = () => onDisconnect?.(tool.id)
  const handleRefresh = () => onRefresh?.(tool.id)
  const handleToggle = (checked: boolean) => onToggle?.(tool.id, checked)
  const handleDelete = () => onDelete?.(tool.id)
  const handleEdit = () => onEdit?.(tool.id)
  const handleDiscover = () => onDiscover?.(tool.id)

  const parseExpiresAt = (raw: string): Date | null => {
    try {
      const normalized = raw
        .replace(' ', 'T')
        .replace(/(\+\d{2}:\d{2}):\d{2}$/, '$1')
        .replace(' ', '')
      const date = parseISO(normalized)
      // Verificar que la fecha es válida
      if (isNaN(date.getTime())) return null
      return date
    } catch {
      return null
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-3 hover:shadow-sm transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
            <ProviderIcon className="h-4 w-4" />
          </div>
          <div>
            <p className="font-medium text-sm">{tool.name}</p>
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground">{tool.tool_type}</p>
              <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                {authTypeLabel}
              </Badge>
            </div>
          </div>
        </div>

        <Badge
          variant={statusConfig.variant}
          className={cn('gap-1', statusConfig.className)}
        >
          {StatusIcon && <StatusIcon className="h-3 w-3" />}
          {statusConfig.label}
        </Badge>
      </div>

      {tool.auth_meta && (
        <div className="flex flex-col gap-1">
          {tool.auth_meta.scopes.map((scope: string) => (
            <Badge key={scope} variant="outline" className="text-xs">
              {scope}
            </Badge>
          ))}
          {tool.auth_meta.expires_at &&
            (() => {
              const date = parseExpiresAt(tool.auth_meta.expires_at)
              return date ? (
                <span className="text-xs text-muted-foreground">
                  {`Expira: ${format(date, "d, MMMM, yyyy 'at' h:mm a")}`}
                </span>
              ) : null
            })()}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Activo</span>
            <Switch
              checked={tool.is_active}
              onCheckedChange={handleToggle}
              size="sm"
              disabled={isBusy}
            />
          </div>
        </div>

        <div className="flex items-center gap-1">
          {needsDiscovery && (
            <Button
              size="sm"
              variant="secondary"
              onClick={handleDiscover}
              disabled={isBusy}
            >
              {loadingAction === 'discover' ? (
                <Loader2Icon className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <CompassIcon className="h-3 w-3 mr-1" />
              )}
              Descubrir
            </Button>
          )}

          {canConnect && (
            <Button
              size="sm"
              variant="default"
              onClick={handleConnect}
              disabled={isBusy}
            >
              {loadingAction === 'connect' ? (
                <Loader2Icon className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <PlugIcon className="h-3 w-3 mr-1" />
              )}
              Conectar
            </Button>
          )}

          {isConnectedAuthStatus(tool.auth_status) &&
            tool.auth_status !== 'not_required' && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRefresh}
                  disabled={isBusy}
                >
                  {loadingAction === 'refresh' ? (
                    <Spinner />
                  ) : (
                    <RefreshCwIcon className="h-3 w-3" />
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDisconnect}
                  disabled={isBusy}
                >
                  {loadingAction === 'disconnect' ? (
                    <Spinner />
                  ) : (
                    <UnplugIcon className="h-3 w-3" />
                  )}
                </Button>
              </>
            )}

          {tool.auth_status === 'expired' && (
            <Button
              size="xs"
              variant="outline"
              onClick={handleConnect}
              disabled={isBusy}
            >
              {loadingAction === 'connect' ? (
                <Spinner />
              ) : (
                <RefreshCwIcon className="h-3 w-3 mr-1" />
              )}
              Re-autenticar
            </Button>
          )}

          <Button size="sm" variant="ghost" onClick={handleEdit}>
            <SettingsIcon className="h-3 w-3" />
          </Button>

          <Button size="sm" variant="ghost" onClick={handleDelete}>
            <TrashIcon className="h-3 w-3 text-destructive" />
          </Button>
        </div>
      </div>
    </div>
  )
}
