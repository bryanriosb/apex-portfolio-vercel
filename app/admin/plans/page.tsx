'use client'

import {
  DataTable,
  DataTableRef,
  SearchConfig,
  FilterConfig,
} from '@/components/DataTable'
import { Button } from '@/components/ui/button'
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  Plus,
  CheckCircle,
  XCircle,
  Settings2,
  Eye,
} from 'lucide-react'
import PlanService from '@/lib/services/plan/plan-service'
import { PLANS_COLUMNS } from '@/lib/models/plan/const/data-table/plans-columns'
import { PlanModal } from '@/components/plans/PlanModal'
import { PlanModulesModal } from '@/components/plans/PlanModulesModal'
import { PlanDetailModal } from '@/components/plans/PlanDetailModal'
import { PlanImportExportButtons } from '@/components/plans/PlanImportExportButtons'
import { useRef, useMemo, useState, useCallback } from 'react'
import type { Plan, PlanInsert, PlanUpdate } from '@/lib/models/plan/plan'
import { useCurrentUser } from '@/hooks/use-current-user'
import { toast } from 'sonner'
import { USER_ROLES } from '@/const/roles'
import { redirect } from 'next/navigation'

export default function PlansPage() {
  const planService = useMemo(() => new PlanService(), [])
  const dataTableRef = useRef<DataTableRef>(null)
  const { role } = useCurrentUser()

  const [modalOpen, setModalOpen] = useState(false)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [modulesModalOpen, setModulesModalOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [planToDelete, setPlanToDelete] = useState<string | null>(null)
  const [plansToDelete, setPlansToDelete] = useState<string[]>([])

  if (role !== USER_ROLES.COMPANY_ADMIN) {
    redirect('/admin')
  }

  const searchConfig: SearchConfig = useMemo(
    () => ({
      column: 'name',
      placeholder: 'Buscar por nombre...',
      serverField: 'name',
    }),
    []
  )

  const filterConfigs: FilterConfig[] = useMemo(
    () => [
      {
        column: 'status',
        title: 'Estado',
        options: [
          { label: 'Activo', value: 'active', icon: CheckCircle },
          { label: 'Inactivo', value: 'inactive', icon: XCircle },
          { label: 'Descontinuado', value: 'deprecated', icon: XCircle },
        ],
      },
    ],
    []
  )

  const handleCreatePlan = () => {
    setSelectedPlan(null)
    setModalOpen(true)
  }

  const handleViewPlan = (plan: Plan) => {
    setSelectedPlan(plan)
    setDetailModalOpen(true)
  }

  const handleEditPlan = (plan: Plan) => {
    setSelectedPlan(plan)
    setModalOpen(true)
  }

  const handleConfigureModules = (plan: Plan) => {
    setSelectedPlan(plan)
    setModulesModalOpen(true)
  }

  const handleDeletePlan = (planId: string) => {
    setPlanToDelete(planId)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!planToDelete) return

    try {
      await planService.destroyItem(planToDelete)
      toast.success('Plan eliminado correctamente')
      dataTableRef.current?.refreshData()
    } catch (error: any) {
      toast.error(error.message || 'No se pudo eliminar el plan')
    } finally {
      setDeleteDialogOpen(false)
      setPlanToDelete(null)
    }
  }

  const handleBatchDelete = async (ids: string[]) => {
    setPlansToDelete(ids)
    setBatchDeleteDialogOpen(true)
  }

  const confirmBatchDelete = async () => {
    if (!plansToDelete.length) return

    try {
      const result = await planService.destroyMany(plansToDelete)
      if (result.success) {
        toast.success(`${result.deletedCount} plan(es) eliminado(s)`)
        dataTableRef.current?.refreshData()
        dataTableRef.current?.clearSelection()
      } else {
        throw new Error(result.error)
      }
    } catch (error: any) {
      toast.error(error.message || 'No se pudieron eliminar los planes')
    } finally {
      setBatchDeleteDialogOpen(false)
      setPlansToDelete([])
    }
  }

  const handleSavePlan = async (data: PlanInsert | PlanUpdate) => {
    try {
      if (selectedPlan) {
        const result = await planService.updateItem({
          id: selectedPlan.id,
          ...data,
        })
        if (result.success) {
          toast.success('Plan actualizado correctamente')
        } else {
          throw new Error(result.error)
        }
      } else {
        const result = await planService.createItem(data as PlanInsert)
        if (result.success) {
          toast.success('Plan creado correctamente')
        } else {
          throw new Error(result.error)
        }
      }
      dataTableRef.current?.refreshData()
    } catch (error: any) {
      toast.error(error.message || 'No se pudo guardar el plan')
      throw error
    }
  }

  const columnsWithActions = useMemo(() => {
    return PLANS_COLUMNS.map((col) => {
      if (col.id === 'actions') {
        return {
          ...col,
          cell: ({ row }: any) => {
            const plan = row.original

            return (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Abrir menú</span>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleViewPlan(plan)}>
                    <Eye className="mr-2 h-4 w-4" />
                    Ver detalle
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleEditPlan(plan)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleConfigureModules(plan)}
                  >
                    <Settings2 className="mr-2 h-4 w-4" />
                    Configurar módulos
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => handleDeletePlan(plan.id)}
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
  }, [])

  return (
    <div className="flex flex-col gap-6 w-full overflow-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Planes
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Gestiona los planes de suscripción
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button
            onClick={handleCreatePlan}
            className="w-full sm:w-auto"
            size="sm"
          >
            <Plus className="mr-2 h-4 w-4" />
            Crear Plan
          </Button>
          <PlanImportExportButtons
            onImportComplete={() => dataTableRef.current?.refreshData()}
          />
        </div>
      </div>

      <DataTable
        ref={dataTableRef}
        columns={columnsWithActions}
        service={planService}
        searchConfig={searchConfig}
        filters={filterConfigs}
        enableRowSelection
        onDeleteSelected={handleBatchDelete}
      />

      <PlanModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        plan={selectedPlan}
        onSave={handleSavePlan}
      />

      <PlanModulesModal
        open={modulesModalOpen}
        onOpenChange={setModulesModalOpen}
        plan={selectedPlan}
      />

      <PlanDetailModal
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        plan={selectedPlan}
      />

      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        itemName="plan"
      />

      <ConfirmDeleteDialog
        open={batchDeleteDialogOpen}
        onOpenChange={setBatchDeleteDialogOpen}
        onConfirm={confirmBatchDelete}
        itemName="plan"
        count={plansToDelete.length}
        variant="outline"
      />
    </div>
  )
}
