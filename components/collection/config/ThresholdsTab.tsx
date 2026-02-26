'use client'

import { useState, useEffect, useCallback } from 'react'
import { useActiveBusinessStore } from '@/lib/store/active-business-store'
import { NotificationThresholdService } from '@/lib/services/collection'
import type { NotificationThreshold } from '@/lib/models/collection/notification-threshold'
import { Button } from '@/components/ui/button'
import { Plus, RefreshCw, Pencil, Trash2, MoreHorizontal } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ThresholdFormDialog } from './ThresholdFormDialog'
import { toast } from 'sonner'

export function ThresholdsTab() {
  const { activeBusiness } = useActiveBusinessStore()
  const [thresholds, setThresholds] = useState<NotificationThreshold[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingThreshold, setEditingThreshold] =
    useState<NotificationThreshold | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const loadThresholds = useCallback(async () => {
    if (!activeBusiness?.id) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const result = await NotificationThresholdService.fetchThresholds(
        activeBusiness.id
      )
      setThresholds(result.data)
    } catch (error) {
      console.error('Error loading thresholds:', error)
      toast.error('Error al cargar los umbrales')
    } finally {
      setLoading(false)
    }
  }, [activeBusiness?.id])

  useEffect(() => {
    loadThresholds()
  }, [loadThresholds, refreshKey])

  const handleCreate = () => {
    setEditingThreshold(null)
    setDialogOpen(true)
  }

  const handleEdit = (threshold: NotificationThreshold) => {
    setEditingThreshold(threshold)
    setDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!activeBusiness?.business_account_id) return

    try {
      await NotificationThresholdService.deleteThreshold(id)
      toast.success('Umbral eliminado correctamente')
      setRefreshKey((prev) => prev + 1)
    } catch (error) {
      console.error('Error deleting threshold:', error)
      toast.error('Error al eliminar el umbral')
    }
  }

  const handleSuccess = () => {
    setDialogOpen(false)
    setEditingThreshold(null)
    setRefreshKey((prev) => prev + 1)
  }

  if (!activeBusiness?.business_account_id) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center">
        <p className="text-muted-foreground">
          Selecciona una sucursal para gestionar los umbrales
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Umbrales de Días de Mora</h3>
          <p className="text-sm text-muted-foreground">
            Define rangos de días de mora y sus plantillas asociadas
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRefreshKey((prev) => prev + 1)}
            disabled={loading}
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`}
            />
            Actualizar
          </Button>
          <Button onClick={handleCreate} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Umbral
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Rango (días)</TableHead>
              <TableHead>Plantilla</TableHead>
              <TableHead className="w-[100px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : thresholds.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center py-8 text-muted-foreground"
                >
                  No hay umbrales configurados
                </TableCell>
              </TableRow>
            ) : (
              thresholds.map((threshold) => (
                <TableRow key={threshold.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{threshold.name}</span>
                      {threshold.description && (
                        <span className="text-xs text-muted-foreground">
                          {threshold.description}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {threshold.days_from} -{' '}
                    {threshold.days_to !== null &&
                    threshold.days_to !== undefined
                      ? threshold.days_to
                      : '∞'}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{threshold.email_template?.name}</span>
                      {threshold.email_template?.subject && (
                        <span className="text-xs text-muted-foreground truncate max-w-[250px]">
                          {threshold.email_template.subject}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
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
                        <DropdownMenuItem onClick={() => handleEdit(threshold)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(threshold.id)}
                          className="text-red-600 focus:text-red-600 focus:bg-red-50"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ThresholdFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        threshold={editingThreshold}
        businessId={activeBusiness.id}
        businessAccountId={activeBusiness.business_account_id}
        onSuccess={handleSuccess}
      />
    </div>
  )
}
