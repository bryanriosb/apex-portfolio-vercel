'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { DataTable, type FilterConfig } from '@/components/DataTable'
import Loading from '@/components/ui/loading'
import { toast } from 'sonner'
import {
  KeyRound,
  MoreHorizontal,
  Pencil,
  Plus,
  Power,
  PowerOff,
  Trash2,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useActiveBusinessStore } from '@/lib/store/active-business-store'
import { useModels } from '@/hooks/use-models'
import { LlmProvidersService } from '@/lib/services/agents/llm-providers-service'
import { notifyLlmProvidersChanged } from '@/hooks/use-configured-llm-providers'
import { getLlmProvidersColumns } from '@/components/agents/providers/LlmProvidersColumns'
import { LlmProviderForm } from '@/components/agents/providers/LlmProviderForm'
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog'
import {
  buildCreateLlmProviderRequest,
  buildLlmProviderOptions,
  buildUpdateLlmProviderRequest,
  getLlmProviderLabel,
  type LlmProvider,
  type LlmProviderFormValues,
} from '@/lib/models/agents/llm-provider'

export default function LlmProvidersPage() {
  const { activeBusiness, isLoading: businessLoading } = useActiveBusinessStore()
  const { allModels } = useModels()

  const service = useMemo(() => new LlmProvidersService(), [])

  const providerOptions = useMemo(
    () => buildLlmProviderOptions(allModels),
    [allModels]
  )

  const [providers, setProviders] = useState<LlmProvider[]>([])
  const [loading, setLoading] = useState(false)

  const [formOpen, setFormOpen] = useState(false)
  const [editingProvider, setEditingProvider] = useState<LlmProvider | null>(
    null
  )
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [providerToDelete, setProviderToDelete] = useState<LlmProvider | null>(
    null
  )
  const [isDeleting, setIsDeleting] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const data = await service.listProviders()
      setProviders(data)
    } catch (err) {
      toast.error('No se pudieron cargar los proveedores')
    } finally {
      setLoading(false)
    }
  }, [service])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleCreate = useCallback(() => {
    setEditingProvider(null)
    setFormOpen(true)
  }, [])

  const handleEdit = useCallback((provider: LlmProvider) => {
    setEditingProvider(provider)
    setFormOpen(true)
  }, [])

  const handleToggleActive = useCallback(
    async (provider: LlmProvider) => {
      try {
        await service.updateProvider(provider.id, {
          is_active: !provider.is_active,
        })
        toast.success(
          `Proveedor ${provider.is_active ? 'desactivado' : 'activado'} exitosamente`
        )
        loadData()
        // Señal global: GlobalChat y selectores refrescan disponibilidad
        notifyLlmProvidersChanged()
      } catch (err) {
        toast.error('No se pudo cambiar el estado del proveedor')
      }
    },
    [service, loadData]
  )

  const handleDeleteClick = useCallback((provider: LlmProvider) => {
    setProviderToDelete(provider)
    setDeleteDialogOpen(true)
  }, [])

  const handleDeleteConfirm = useCallback(async () => {
    if (!providerToDelete) return
    setIsDeleting(true)
    try {
      await service.deleteProvider(providerToDelete.id)
      toast.success('Proveedor eliminado')
      setDeleteDialogOpen(false)
      setProviderToDelete(null)
      loadData()
      notifyLlmProvidersChanged()
    } catch (err) {
      toast.error('Ocurrió un error al eliminar el proveedor')
    } finally {
      setIsDeleting(false)
    }
  }, [service, providerToDelete, loadData])

  const handleSubmit = useCallback(
    async (values: LlmProviderFormValues) => {
      setIsSubmitting(true)
      try {
        if (editingProvider) {
          await service.updateProvider(
            editingProvider.id,
            buildUpdateLlmProviderRequest(values)
          )
          toast.success('Proveedor actualizado')
        } else {
          await service.createProvider(buildCreateLlmProviderRequest(values))
          toast.success('Proveedor creado')
        }
        setFormOpen(false)
        setEditingProvider(null)
        loadData()
        // Señal global: habilita el PromptInput del GlobalChat y actualiza
        // los selectores de proveedor/modelo sin recargar la página.
        notifyLlmProvidersChanged()
      } catch (err) {
        toast.error(
          err instanceof Error
            ? err.message
            : 'Ocurrió un error al guardar el proveedor'
        )
      } finally {
        setIsSubmitting(false)
      }
    },
    [service, editingProvider, loadData]
  )

  const timezone = activeBusiness?.timezone || 'America/Bogota'

  const filterConfigs: FilterConfig[] = useMemo(
    () => [
      {
        column: 'is_active',
        title: 'Estado',
        options: [
          { label: 'Activo', value: 'true' },
          { label: 'Inactivo', value: 'false' },
        ],
      },
    ],
    []
  )

  const columns = useMemo(() => {
    const providerLabel = (provider: string) =>
      getLlmProviderLabel(providerOptions, provider)

    return getLlmProvidersColumns(timezone, providerLabel).map((col) => {
      if (col.id === 'actions') {
        return {
          ...col,
          cell: ({ row }: { row: any }) => {
            const provider = row.original as LlmProvider
            return (
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => handleEdit(provider)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => handleToggleActive(provider)}
                  >
                    {provider.is_active ? (
                      <>
                        <PowerOff className="mr-2 h-4 w-4" />
                        Desactivar
                      </>
                    ) : (
                      <>
                        <Power className="mr-2 h-4 w-4" />
                        Activar
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => handleDeleteClick(provider)}
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
  }, [
    timezone,
    providerOptions,
    handleEdit,
    handleToggleActive,
    handleDeleteClick,
  ])

  if (businessLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center py-24">
        <div className="flex flex-col items-center gap-4">
          <Loading className="h-8 w-8 text-primary" />
          <span className="text-sm text-muted-foreground">Cargando...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <KeyRound className="h-6 w-6 text-primary" />
            Proveedores IA
          </h1>
          <p className="text-sm text-muted-foreground">
            Define los proveedores LLM y sus claves API globales que usarán tus
            agentes.
          </p>
        </div>
        <Button onClick={handleCreate} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Proveedor
        </Button>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loading className="h-8 w-8 text-primary" />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={providers}
          filters={filterConfigs}
          searchConfig={{
            column: 'provider',
            placeholder: 'Buscar proveedor...',
          }}
          emptyState={
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <KeyRound className="h-10 w-10 text-muted-foreground/50" />
              <div className="text-center">
                <p className="font-medium">Sin proveedores</p>
                <p className="text-sm text-muted-foreground">
                  Registra tus proveedores LLM con sus claves API para el uso de los agentes.
                </p>
              </div>
              <Button onClick={handleCreate} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Crear Proveedor
              </Button>
            </div>
          }
        />
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProvider ? 'Editar Proveedor' : 'Nuevo Proveedor'}
            </DialogTitle>
            <DialogDescription>
              {editingProvider
                ? 'Actualiza la clave API o el base URL del proveedor.'
                : 'La clave API se encripta automáticamente al guardar.'}
            </DialogDescription>
          </DialogHeader>
          {formOpen && (
            <LlmProviderForm
              key={editingProvider ? editingProvider.id : 'new'}
              provider={editingProvider}
              providerOptions={providerOptions}
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
        itemName="proveedor"
        count={1}
      />
    </div>
  )
}
