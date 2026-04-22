'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  PlugIcon,
  PlusIcon,
  SearchIcon,
  Loader2Icon,
  RefreshCwIcon,
  CheckCircleIcon,
  XCircleIcon,
} from 'lucide-react'
import { ToolConnectorItem } from '@/components/oauth2/ToolConnectorItem'
import { ToolConnectorItemSkeleton } from '@/components/oauth2/ToolConnectorItemSkeleton'
import { ConnectorForm } from '@/components/oauth2/ConnectorForm'
import { useDeleteTool } from '@/hooks/use-tool-crud'
import {
  useAgentTools,
  useOAuth2Tools,
  useOAuth2Discover,
} from '@/hooks/use-oauth2-tools'
import { isMcpTool, ToolWithAuthStatus } from '@/lib/types/oauth2-types'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export function ConnectorsPage() {
  const {
    tools,
    isLoading,
    error,
    fetchTools,
    updateToolStatus,
    toggleToolActive,
  } = useAgentTools()
  const { startOAuthFlow, refresh, disconnect } = useOAuth2Tools()
  const { discover: discoverTool } = useOAuth2Discover()
  const deleteTool = useDeleteTool()
  const apiBaseUrl =
    process.env.PUBLIC_APEX_API_URL || 'http://localhost:3000/api'
  const agentId =
    process.env.PUBLIC_AGENT_ID || 'e10c503d-00fc-4282-9d2e-3f8c4be7b0a0'
  const userId = 'usr_123456'
  const businessAccountId = 'ba-12345678-1234-1234-1234-123456789012'

  const [searchQuery, setSearchQuery] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editingTool, setEditingTool] = useState<
    ToolWithAuthStatus | undefined
  >(undefined)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [toolToDelete, setToolToDelete] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [pendingAction, setPendingAction] = useState<{
    toolId: string
    action: string
  } | null>(null)
  const [oauthNotification, setOauthNotification] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  // Detect OAuth callback query params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const oauthStatus = params.get('oauth')
    if (oauthStatus === 'success') {
      setOauthNotification({
        type: 'success',
        message: 'Autenticación completada exitosamente.',
      })
      window.history.replaceState({}, '', window.location.pathname)
    } else if (oauthStatus === 'error') {
      const errorMsg = params.get('message') || 'Error en la autenticación.'
      setOauthNotification({ type: 'error', message: errorMsg })
      window.history.replaceState({}, '', window.location.pathname)
    }
    if (oauthStatus) {
      const timer = setTimeout(() => setOauthNotification(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [])

  const mcpTools = tools.filter(isMcpTool)
  const filteredTools = searchQuery
    ? mcpTools.filter((t) =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : mcpTools

  const loadTools = () => {
    fetchTools({ agentId, userId, businessAccountId, apiBaseUrl })
  }

  useEffect(() => {
    loadTools()
  }, [agentId, userId, businessAccountId, apiBaseUrl, fetchTools])

  const getOwner = (toolId: string) => {
    const tool = mcpTools.find((t) => t.id === toolId)
    const isShared = tool?.token_scope === 'shared'
    return {
      ownerType: (isShared ? 'admin' : 'user') as 'admin' | 'user',
      ownerId: isShared ? businessAccountId : userId,
    }
  }

  const handleConnect = async (toolId: string) => {
    setPendingAction({ toolId, action: 'connect' })
    const { ownerType, ownerId } = getOwner(toolId)
    try {
      await startOAuthFlow({
        toolId,
        ownerType,
        ownerId,
        apiBaseUrl,
      })
    } catch (err) {
      toast.error('Error al conectar', {
        description:
          err instanceof Error
            ? err.message
            : 'No se pudo iniciar el flujo de autenticación',
      })
    } finally {
      setPendingAction(null)
    }
  }

  const handleDisconnect = async (toolId: string) => {
    setPendingAction({ toolId, action: 'disconnect' })
    const { ownerType, ownerId } = getOwner(toolId)
    try {
      await disconnect({
        toolId,
        ownerType,
        ownerId,
        apiBaseUrl,
      })
      updateToolStatus(toolId, {
        auth_status: 'disconnected',
        auth_meta: null,
      })
    } catch (err) {
      toast.error('Error al desconectar', {
        description:
          err instanceof Error
            ? err.message
            : 'No se pudo desconectar el conector',
      })
    } finally {
      setPendingAction(null)
    }
  }

  const handleRefresh = async (toolId: string) => {
    setPendingAction({ toolId, action: 'refresh' })
    const { ownerType, ownerId } = getOwner(toolId)
    try {
      await refresh({
        toolId,
        ownerType,
        ownerId,
        apiBaseUrl,
      })
      loadTools()
    } catch (err) {
      toast.error('Error al refrescar', {
        description:
          err instanceof Error ? err.message : 'No se pudo refrescar el token',
      })
    } finally {
      setPendingAction(null)
    }
  }

  const handleDiscover = async (toolId: string) => {
    setPendingAction({ toolId, action: 'discover' })
    try {
      await discoverTool(toolId, apiBaseUrl)
      loadTools()
    } catch (err) {
      toast.error('Error en Discover', {
        description:
          err instanceof Error
            ? err.message
            : 'No se pudo ejecutar el discovery del conector',
      })
    } finally {
      setPendingAction(null)
    }
  }

  const handleToggle = async (toolId: string, isActive: boolean) => {
    try {
      await toggleToolActive(toolId, isActive, apiBaseUrl)
    } catch (err) {
      toast.error('Error al cambiar estado', {
        description:
          err instanceof Error
            ? err.message
            : 'No se pudo actualizar el estado del conector',
      })
    }
  }

  const handleAddNew = () => {
    setEditingTool(undefined)
    setFormOpen(true)
  }

  const handleEdit = (toolId: string) => {
    const tool = mcpTools.find((t) => t.id === toolId)
    setEditingTool(tool)
    setFormOpen(true)
  }

  const handleDeleteClick = (toolId: string) => {
    setToolToDelete(toolId)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!toolToDelete) return
    setDeleteLoading(true)
    try {
      await deleteTool.mutate(toolToDelete, apiBaseUrl)
      setDeleteDialogOpen(false)
      setToolToDelete(null)
      loadTools()
    } catch (err) {
      toast.error('Error al eliminar', {
        description:
          err instanceof Error
            ? err.message
            : 'No se pudo eliminar el conector',
      })
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Conectores</h1>
          <p className="text-sm text-muted-foreground">
            Administra tus conectores MCP y configuraciones de OAuth.
          </p>
        </div>
        <Button onClick={handleAddNew}>
          <PlusIcon className="h-4 w-4 mr-2" />
          Agregar Conector
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar conectores..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* OAuth notification */}
      {oauthNotification && (
        <div
          className={cn(
            'flex items-center gap-2 rounded-md p-3 text-sm',
            oauthNotification.type === 'success'
              ? 'bg-green-500/10 text-green-600'
              : 'bg-destructive/10 text-destructive'
          )}
        >
          {oauthNotification.type === 'success' ? (
            <CheckCircleIcon className="h-4 w-4 shrink-0" />
          ) : (
            <XCircleIcon className="h-4 w-4 shrink-0" />
          )}
          <span>{oauthNotification.message}</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center justify-between text-sm text-destructive p-3 bg-destructive/10 rounded-md">
          <span>{error}</span>
          <Button
            size="xs"
            variant="outline"
            onClick={loadTools}
            disabled={isLoading}
          >
            <RefreshCwIcon className="h-3 w-3 mr-1" />
            Reintentar
          </Button>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <ToolConnectorItemSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && mcpTools.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <PlugIcon className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="font-medium">Sin conectores</p>
            <p className="text-sm text-muted-foreground">
              Agrega un conector MCP para comenzar a usar herramientas externas.
            </p>
          </div>
          <Button onClick={handleAddNew}>
            <PlusIcon className="h-4 w-4 mr-2" />
            Agregar Primer Conector
          </Button>
        </div>
      )}

      {/* No search results */}
      {!isLoading && mcpTools.length > 0 && filteredTools.length === 0 && (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">
            No se encontraron conectores para &quot;{searchQuery}&quot;
          </p>
        </div>
      )}

      {/* Grid */}
      {!isLoading && filteredTools.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredTools.map((tool) => (
            <ToolConnectorItem
              key={tool.id}
              tool={tool}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
              onRefresh={handleRefresh}
              onToggle={handleToggle}
              onDelete={handleDeleteClick}
              onEdit={handleEdit}
              onDiscover={handleDiscover}
              loadingAction={
                pendingAction?.toolId === tool.id ? pendingAction.action : null
              }
            />
          ))}
        </div>
      )}

      {/* Connector Form Sheet */}
      <ConnectorForm
        agentId={agentId}
        apiBaseUrl={apiBaseUrl}
        mode={editingTool ? 'edit' : 'create'}
        tool={editingTool}
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={loadTools}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Conector</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar este conector? Esta acción no
              se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleteLoading}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={handleDeleteConfirm}
              disabled={deleteLoading}
            >
              {deleteLoading ? (
                <>
                  <Loader2Icon className="h-4 w-4 animate-spin mr-2" />
                  Eliminando...
                </>
              ) : (
                'Eliminar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ConnectorsPage
