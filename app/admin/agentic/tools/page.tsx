'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { DataTable, type FilterConfig } from '@/components/DataTable'
import Loading from '@/components/ui/loading'
import { toast } from 'sonner'
import {
  Plus,
  Wrench,
  MoreHorizontal,
  Pencil,
  Trash2,
  Power,
  PowerOff,
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
import { ToolsService } from '@/lib/services/agents/tools-service'
import { getToolsColumns } from '@/components/agents/tools/ToolsColumns'
import { ToolForm } from '@/components/agents/tools/ToolForm'
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog'
import {
  buildExecutionConfig,
  parseSchemaJson,
  MANAGEABLE_TOOL_TYPES,
  type ToolDefinition,
  type ToolFormValues,
} from '@/lib/models/agents/tool'
import { toolTypes } from '@/lib/i18n/es-automation'
import { isMcpTool } from '@/lib/types/oauth2-types'

export default function ToolsPage() {
  const { activeBusiness, isLoading: businessLoading } = useActiveBusinessStore()

  const service = useMemo(() => new ToolsService(), [])

  const [tools, setTools] = useState<ToolDefinition[]>([])
  const [loading, setLoading] = useState(false)

  const [formOpen, setFormOpen] = useState(false)
  const [editingTool, setEditingTool] = useState<ToolDefinition | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [toolToDelete, setToolToDelete] = useState<ToolDefinition | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const data = await service.listTools()
      // McpLocal/McpRemote se gestionan en Conectores
      setTools(data.filter((tool) => !isMcpTool(tool)))
    } catch (err) {
      toast.error('No se pudieron cargar las herramientas')
    } finally {
      setLoading(false)
    }
  }, [service])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleCreate = useCallback(() => {
    setEditingTool(null)
    setFormOpen(true)
  }, [])

  const handleEdit = useCallback((tool: ToolDefinition) => {
    setEditingTool(tool)
    setFormOpen(true)
  }, [])

  const handleToggleActive = useCallback(
    async (tool: ToolDefinition) => {
      try {
        await service.patchTool(tool.id, { is_active: !tool.is_active })
        toast.success(
          `Herramienta ${tool.is_active ? 'desactivada' : 'activada'} exitosamente`
        )
        loadData()
      } catch (err) {
        toast.error('No se pudo cambiar el estado de la herramienta')
      }
    },
    [service, loadData]
  )

  const handleDeleteClick = useCallback((tool: ToolDefinition) => {
    setToolToDelete(tool)
    setDeleteDialogOpen(true)
  }, [])

  const handleDeleteConfirm = useCallback(async () => {
    if (!toolToDelete) return
    setIsDeleting(true)
    try {
      await service.deleteTool(toolToDelete.id)
      toast.success('Herramienta eliminada')
      setDeleteDialogOpen(false)
      setToolToDelete(null)
      loadData()
    } catch (err) {
      toast.error('Ocurrió un error al eliminar la herramienta')
    } finally {
      setIsDeleting(false)
    }
  }, [service, toolToDelete, loadData])

  const handleSubmit = useCallback(
    async (values: ToolFormValues) => {
      setIsSubmitting(true)
      try {
        const executionConfig = buildExecutionConfig(values)
        const schemaJson = parseSchemaJson(values)

        if (editingTool) {
          await service.patchTool(editingTool.id, {
            name: values.name,
            description: values.description || '',
            tool_type: values.tool_type,
            execution_config: executionConfig,
            schema_json: schemaJson,
            is_active: values.is_active,
          })
          toast.success('Herramienta actualizada')
        } else {
          await service.createTool({
            name: values.name,
            tool_type: values.tool_type,
            execution_config: executionConfig,
            description: values.description || '',
            schema_json: schemaJson,
            is_active: values.is_active,
          })
          toast.success('Herramienta creada')
        }
        setFormOpen(false)
        setEditingTool(null)
        loadData()
      } catch (err) {
        toast.error(
          err instanceof Error
            ? err.message
            : 'Ocurrió un error al guardar la herramienta'
        )
      } finally {
        setIsSubmitting(false)
      }
    },
    [service, editingTool, loadData]
  )

  const timezone = activeBusiness?.timezone || 'America/Bogota'

  const filterConfigs: FilterConfig[] = useMemo(
    () => [
      {
        column: 'tool_type',
        title: 'Tipo',
        options: MANAGEABLE_TOOL_TYPES.map((type) => ({
          label: toolTypes[type] || type,
          value: type,
        })),
      },
      {
        column: 'is_active',
        title: 'Estado',
        options: [
          { label: 'Activa', value: 'true' },
          { label: 'Inactiva', value: 'false' },
        ],
      },
    ],
    []
  )

  const columns = useMemo(() => {
    return getToolsColumns(timezone).map((col) => {
      if (col.id === 'actions') {
        return {
          ...col,
          cell: ({ row }: { row: any }) => {
            const tool = row.original as ToolDefinition
            return (
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => handleEdit(tool)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => handleToggleActive(tool)}>
                    {tool.is_active ? (
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
                    onSelect={() => handleDeleteClick(tool)}
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
  }, [timezone, handleEdit, handleToggleActive, handleDeleteClick])

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
            <Wrench className="h-6 w-6 text-primary" />
            Herramientas
          </h1>
          <p className="text-sm text-muted-foreground">
            Gestiona las herramientas disponibles para tus agentes de IA.
          </p>
        </div>
        <Button onClick={handleCreate} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Nueva Herramienta
        </Button>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loading className="h-8 w-8 text-primary" />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={tools}
          filters={filterConfigs}
          searchConfig={{
            column: 'name',
            placeholder: 'Buscar herramienta...',
          }}
          emptyState={
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Wrench className="h-10 w-10 text-muted-foreground/50" />
              <div className="text-center">
                <p className="font-medium">Sin herramientas</p>
                <p className="text-sm text-muted-foreground">
                  Crea tu primera herramienta para tus agentes.
                </p>
              </div>
              <Button onClick={handleCreate} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Crear Herramienta
              </Button>
            </div>
          }
        />
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTool ? 'Editar Herramienta' : 'Nueva Herramienta'}
            </DialogTitle>
            <DialogDescription>
              {editingTool
                ? 'Modifica la configuración de la herramienta.'
                : 'Configura una nueva herramienta para tus agentes.'}
            </DialogDescription>
          </DialogHeader>
          {formOpen && (
            <ToolForm
              key={editingTool ? editingTool.id : 'new'}
              tool={editingTool}
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
        itemName="herramienta"
        count={1}
      />
    </div>
  )
}
