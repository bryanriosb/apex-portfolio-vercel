'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/DataTable'
import Loading from '@/components/ui/loading'
import { toast } from 'sonner'
import {
  Plus,
  GitBranch,
  MoreHorizontal,
  Pencil,
  Trash2,
  Power,
  PowerOff,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useActiveBusinessStore } from '@/lib/store/active-business-store'
import { WorkflowsService } from '@/lib/services/workflows/workflow-service'
import { getWorkflowsColumns } from '@/components/workflows/WorkflowsColumns'
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog'
import type { WorkflowDefinition } from '@/lib/models/workflows/workflow'

export default function FlowsPage() {
  const router = useRouter()
  const { activeBusiness, isLoading: businessLoading } =
    useActiveBusinessStore()

  const service = useMemo(() => new WorkflowsService(), [])

  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>([])
  const [loading, setLoading] = useState(false)

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [workflowToDelete, setWorkflowToDelete] =
    useState<WorkflowDefinition | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const data = await service.listWorkflows()
      setWorkflows(data)
    } catch (err) {
      toast.error('No se pudieron cargar los flujos')
    } finally {
      setLoading(false)
    }
  }, [service])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleEdit = useCallback(
    (workflow: WorkflowDefinition) => {
      router.push(`/admin/agentic/flows/edit/${workflow.id}`)
    },
    [router]
  )

  const handleToggleActive = useCallback(
    async (workflow: WorkflowDefinition) => {
      try {
        await service.updateWorkflow(workflow.id, {
          is_active: !workflow.is_active,
        })
        toast.success(
          `Flujo ${workflow.is_active ? 'desactivado' : 'activado'} exitosamente`
        )
        loadData()
      } catch (err) {
        toast.error('No se pudo cambiar el estado del flujo')
      }
    },
    [service, loadData]
  )

  const handleDeleteClick = useCallback((workflow: WorkflowDefinition) => {
    setWorkflowToDelete(workflow)
    setDeleteDialogOpen(true)
  }, [])

  const handleDeleteConfirm = useCallback(async () => {
    if (!workflowToDelete) return
    setIsDeleting(true)
    try {
      await service.deleteWorkflow(workflowToDelete.id)
      toast.success('Flujo eliminado')
      setDeleteDialogOpen(false)
      setWorkflowToDelete(null)
      loadData()
    } catch (err) {
      toast.error('Ocurrió un error al eliminar el flujo')
    } finally {
      setIsDeleting(false)
    }
  }, [service, workflowToDelete, loadData])

  const timezone = activeBusiness?.timezone || 'America/Bogota'

  const columns = useMemo(() => {
    return getWorkflowsColumns(timezone).map((col) => {
      if (col.id === 'actions') {
        return {
          ...col,
          cell: ({ row }: { row: any }) => {
            const workflow = row.original as WorkflowDefinition
            return (
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => handleEdit(workflow)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => handleToggleActive(workflow)}
                  >
                    {workflow.is_active ? (
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
                    onSelect={() => handleDeleteClick(workflow)}
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
            <GitBranch className="h-6 w-6 text-primary" />
            Flujos
          </h1>
          <p className="text-sm text-muted-foreground">
            Gestiona los flujos de trabajo de agentes de IA.
          </p>
        </div>
        <Link href="/admin/agentic/flows/create">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Flujo
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loading className="h-8 w-8 text-primary" />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={workflows}
          emptyState={
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <GitBranch className="h-10 w-10 text-muted-foreground/50" />
              <div className="text-center">
                <p className="font-medium">Sin flujos</p>
                <p className="text-sm text-muted-foreground">
                  Crea tu primer flujo de trabajo para comenzar.
                </p>
              </div>
              <Link href="/admin/agentic/flows/create">
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Flujo
                </Button>
              </Link>
            </div>
          }
        />
      )}

      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        isLoading={isDeleting}
        itemName="flujo"
        count={1}
      />
    </div>
  )
}
