'use client'

import { useMemo, useState } from 'react'
import { DataTable } from '@/components/DataTable'
import { getExecutionColumns } from './execution-columns'
import { ExecutionService } from '@/lib/services/collection'
import { useActiveBusinessStore } from '@/lib/store/active-business-store'
import { useCurrentUser } from '@/hooks/use-current-user'
import type { FilterConfig } from '@/components/DataTable'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Eye, RefreshCw, Trash2, CheckCircle2, Clock, AlertCircle, Pause, PlayCircle } from 'lucide-react'
import Link from 'next/link'
import { CollectionExecution, ExecutionStatus } from '@/lib/models/collection'
import { updateExecutionStatusAction } from '@/lib/actions/collection'
import { toast } from 'sonner'

const statusOptions = [
  { label: 'Pendiente', value: 'pending', icon: PlayCircle, color: 'text-yellow-600' },
  { label: 'Procesando', value: 'processing', icon: RefreshCw, color: 'text-blue-600' },
  { label: 'Completado', value: 'completed', icon: CheckCircle2, color: 'text-green-600' },
  { label: 'Error', value: 'failed', icon: AlertCircle, color: 'text-red-600' },
  { label: 'Pausado', value: 'paused', icon: Pause, color: 'text-gray-600' },
]

const statusFilters: FilterConfig = {
  column: 'status',
  title: 'Estado',
  options: statusOptions.map(({ label, value }) => ({ label, value })),
}

export function ExecutionsList() {
  const { activeBusiness } = useActiveBusinessStore()
  const { user } = useCurrentUser()
  const timezone = user?.timezone || 'America/Bogota'
  const [refreshKey, setRefreshKey] = useState(0)

  const serviceParams = useMemo(() => {
    if (!activeBusiness?.id) return null
    return { business_id: activeBusiness.id }
  }, [activeBusiness?.id])

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1)
  }

  const handleDelete = async (ids: string[]) => {
    if (ids.length === 1) {
      // Single delete
      const response = await fetch(`/api/collection/executions/${ids[0]}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error(await response.text())
    } else {
      // Bulk delete
      const response = await fetch('/api/collection/executions/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      })
      if (!response.ok) throw new Error(await response.text())
    }
  }

  const handleStatusChange = async (id: string, status: ExecutionStatus) => {
    try {
      const result = await updateExecutionStatusAction(id, status)
      if (result.success) {
        toast.success(`Estado actualizado a ${status}`)
        handleRefresh()
      } else {
        toast.error(result.error || 'Error al actualizar el estado')
      }
    } catch (error) {
      toast.error('Ocurrió un error inesperado')
    }
  }

  if (!activeBusiness?.id || !serviceParams) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center">
        <p className="text-muted-foreground">
          Selecciona una sucursal para ver las ejecuciones
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <DataTable
        key={`${activeBusiness.id}-${refreshKey}`}
        columns={getExecutionColumns(timezone).map((col) => {
          if (col.id === 'actions') {
            return {
              ...col,
              cell: ({ row, table }) => {
                const execution = row.original

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
                      <DropdownMenuItem asChild>
                        <Link
                          href={`/admin/collection/executions/${execution.id}`}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          Ver Detalle
                        </Link>
                      </DropdownMenuItem>
                      {execution.status === 'failed' && (
                        <DropdownMenuItem onClick={() => handleStatusChange(execution.id, 'pending')}>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Reintentar
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Cambiar Estado
                        </DropdownMenuSubTrigger>
                        <DropdownMenuPortal>
                          <DropdownMenuSubContent>
                            {statusOptions.map((opt) => (
                              <DropdownMenuItem
                                key={opt.value}
                                onClick={() => handleStatusChange(execution.id, opt.value as ExecutionStatus)}
                                className={execution.status === opt.value ? 'bg-accent' : ''}
                              >
                                <opt.icon className={`mr-2 h-4 w-4 ${opt.color}`} />
                                {opt.label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuSubContent>
                        </DropdownMenuPortal>
                      </DropdownMenuSub>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => {
                          const meta = table.options.meta as any;
                          if (meta?.openDeleteDialog) {
                            meta.openDeleteDialog([execution.id]);
                          }
                        }}
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
        })}
        service={ExecutionService}
        defaultQueryParams={serviceParams}
        filters={[statusFilters]}
        searchConfig={{
          column: 'name',
          placeholder: 'Buscar por nombre...',
          serverField: 'search',
        }}
        exportConfig={{
          enabled: true,
          tableName: 'ejecuciones-cobros',
          businessId: activeBusiness.id,
        }}
        deleteConfig={{
          enabled: true,
          itemName: 'ejecución',
          onDelete: handleDelete
        }}
        enableRowSelection={true}
        refreshKey={`collection-executions-${activeBusiness.id}-${refreshKey}`}
      />
    </div>
  )
}
