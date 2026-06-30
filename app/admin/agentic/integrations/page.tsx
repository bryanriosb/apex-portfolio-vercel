'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/DataTable'
import Loading from '@/components/ui/loading'
import { toast } from 'sonner'
import { Plus, Puzzle, AlertCircle, RefreshCw, MoreHorizontal, Pencil, Trash2, Activity } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useCurrentUser } from '@/hooks/use-current-user'
import { useSession } from 'next-auth/react'
import { useActiveBusinessStore } from '@/lib/store/active-business-store'
import { IntegrationsService } from '@/lib/services/integrations/integrations-service'
import { getIntegrationsColumns } from '@/components/integrations/IntegrationsColumns'
import { IntegrationConfigForm } from '@/components/integrations/IntegrationConfigForm'
import { ConnectorOperationsPanel } from '@/components/integrations/ConnectorOperationsPanel'
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog'
import type { IntegrationConfig, IntegrationConfigFormValues } from '@/lib/models/integrations/integration-config'

export default function IntegrationsPage() {
  const { isLoading: userLoading } = useCurrentUser()
  const { data: session } = useSession()
  const { activeBusiness, isLoading: businessLoading } = useActiveBusinessStore()

  const accessToken = (session?.user as any)?.accessToken || ''
  const businessAccountId = activeBusiness?.business_account_id || ''

  const service = useMemo(
    () =>
      accessToken && businessAccountId
        ? new IntegrationsService(accessToken, businessAccountId)
        : null,
    [accessToken, businessAccountId]
  )

  const [configs, setConfigs] = useState<IntegrationConfig[]>([])
  const [connectors, setConnectors] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [connectorsLoading, setConnectorsLoading] = useState(false)

  const [formOpen, setFormOpen] = useState(false)
  const [editingConfig, setEditingConfig] = useState<IntegrationConfig | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [configToDelete, setConfigToDelete] = useState<IntegrationConfig | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const loadData = useCallback(async () => {
    if (!service) return
    setLoading(true)
    try {
      const [configsData, connectorsData] = await Promise.all([
        service.listConfigs(),
        service.listConnectors(),
      ])
      setConfigs(configsData)
      setConnectors(connectorsData.connectors || [])
    } catch (err) {
      toast.error('No se pudo cargar la información de las integraciones')
    } finally {
      setLoading(false)
    }
  }, [service])

  const loadConnectors = useCallback(async () => {
    if (!service) return
    setConnectorsLoading(true)
    try {
      const data = await service.listConnectors()
      setConnectors(data.connectors || [])
    } catch (err) {
      toast.error('No se pudieron cargar los conectores disponibles')
    } finally {
      setConnectorsLoading(false)
    }
  }, [service])

  useEffect(() => {
    if (service) {
      loadData()
    }
  }, [service, loadData])

  const handleCreate = useCallback(() => {
    setEditingConfig(null)
    loadConnectors()
    setFormOpen(true)
  }, [loadConnectors])

  const handleEdit = useCallback((config: IntegrationConfig) => {
    setEditingConfig(config)
    loadConnectors()
    setFormOpen(true)
  }, [loadConnectors])

  const handleHealthCheck = useCallback(async (config: IntegrationConfig) => {
    if (!service) return
    toast.info(`Verificando ${config.connector_id}...`)
    try {
      const result = await service.checkHealth(config.connector_id)
      if (result.healthy) {
        toast.success(`${config.connector_id}: ${result.message}`)
      } else {
        toast.error(`${config.connector_id}: ${result.message}`)
      }
    } catch (err) {
      toast.error('No se pudo verificar la conexión con el conector')
    }
  }, [service])

  const handleDeleteClick = useCallback((config: IntegrationConfig) => {
    setConfigToDelete(config)
    setDeleteDialogOpen(true)
  }, [])

  const handleDeleteConfirm = useCallback(async () => {
    if (!service || !configToDelete) return
    setIsDeleting(true)
    try {
      await service.deleteConfig(configToDelete.id)
      toast.success('Configuración eliminada')
      setDeleteDialogOpen(false)
      setConfigToDelete(null)
      loadData()
    } catch (err) {
      toast.error('Ocurrió un error al eliminar la configuración')
    } finally {
      setIsDeleting(false)
    }
  }, [service, configToDelete, loadData])

  const handleSubmit = useCallback(async (values: IntegrationConfigFormValues) => {
    if (!service) return
    setIsSubmitting(true)
    try {
      const payload = {
        ...values,
        description: values.description || null,
      }
      if (editingConfig) {
        await service.updateConfig(editingConfig.id, payload)
        toast.success('Configuración actualizada')
      } else {
        await service.createConfig(payload)
        toast.success('Configuración creada')
      }
      setFormOpen(false)
      setEditingConfig(null)
      loadData()
    } catch (err) {
      toast.error('Ocurrió un error al guardar la configuración')
    } finally {
      setIsSubmitting(false)
    }
  }, [service, editingConfig, loadData])

  const timezone = activeBusiness?.timezone || 'America/Bogota'

  const columns = useMemo(() => {
    return getIntegrationsColumns(timezone).map((col) => {
      if (col.id === 'actions') {
        return {
          ...col,
          cell: ({ row }: { row: any }) => {
            const config = row.original
            return (
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => handleHealthCheck(config)}>
                    <Activity className="mr-2 h-4 w-4" />
                    Verificar conexión
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => handleEdit(config)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => handleDeleteClick(config)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Eliminar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )
          },
        }
      }
      return col
    })
  }, [timezone, handleHealthCheck, handleEdit, handleDeleteClick])

  if (userLoading || businessLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center py-24">
        <div className="flex flex-col items-center gap-4">
          <Loading className="h-8 w-8 text-primary" />
          <span className="text-sm text-muted-foreground">Cargando...</span>
        </div>
      </div>
    )
  }

  if (!accessToken || !businessAccountId) {
    return (
      <div className="flex h-full w-full items-center justify-center py-24">
        <div className="flex flex-col items-center gap-4 text-center">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <span className="text-sm text-muted-foreground">
            No se encontró sesión activa o cuenta de negocio.
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Puzzle className="h-6 w-6 text-primary" />
            Integraciones
          </h1>
          <p className="text-sm text-muted-foreground">
            Gestiona conectores y ejecuta operaciones con sistemas externos.
          </p>
        </div>
        <Button onClick={handleCreate} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Nueva Configuración
        </Button>
      </div>



      <Tabs defaultValue="configs" className="w-full">
        <TabsList>
          <TabsTrigger value="configs">Configuraciones</TabsTrigger>
          <TabsTrigger value="operations">Operaciones</TabsTrigger>
        </TabsList>

        <TabsContent value="configs" className="space-y-4">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loading className="h-8 w-8 text-primary" />
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={configs}
              emptyState={
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Puzzle className="h-10 w-10 text-muted-foreground/50" />
                  <div className="text-center">
                    <p className="font-medium">Sin configuraciones</p>
                    <p className="text-sm text-muted-foreground">
                      Crea tu primera integración para conectar un sistema externo.
                    </p>
                  </div>
                  <Button onClick={handleCreate} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Crear Integración
                  </Button>
                </div>
              }
            />
          )}
        </TabsContent>

        <TabsContent value="operations">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loading className="h-8 w-8" />
            </div>
          ) : (
            <ConnectorOperationsPanel
              service={service}
              configs={configs}
              connectors={connectors}
            />
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingConfig ? 'Editar Configuración' : 'Nueva Configuración'}
            </DialogTitle>
            <DialogDescription>
              {editingConfig
                ? 'Modifica los datos de conexión del sistema externo.'
                : 'Registra una nueva conexión con un sistema externo.'}
            </DialogDescription>
          </DialogHeader>
          {formOpen && (
            <IntegrationConfigForm
              key={editingConfig ? editingConfig.id : 'new'}
              config={editingConfig}
              connectors={connectors}
              isLoadingConnectors={connectorsLoading}
              onSubmit={handleSubmit}
              onCancel={() => setFormOpen(false)}
              isSubmitting={isSubmitting}
            />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        isLoading={isDeleting}
        itemName="configuración"
        count={1}
      />
    </div>
  )
}
