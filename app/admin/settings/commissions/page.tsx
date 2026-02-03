'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Settings2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCurrentUser } from '@/hooks/use-current-user'
import { useActiveBusinessStore } from '@/lib/store/active-business-store'
import { USER_ROLES } from '@/const/roles'
import CommissionService from '@/lib/services/commission/commission-service'
import { CommissionConfigList } from '@/components/commissions/CommissionConfigList'
import { CommissionConfigModal } from '@/components/commissions/CommissionConfigModal'
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog'
import { toast } from 'sonner'
import type {
  CommissionConfigWithSpecialist,
  CommissionConfigInsert,
  CommissionConfigUpdate,
} from '@/lib/models/commission'

export default function CommissionSettingsPage() {
  const { role, isLoading: userLoading } = useCurrentUser()
  const { activeBusiness } = useActiveBusinessStore()
  const commissionService = useMemo(() => new CommissionService(), [])

  const [configs, setConfigs] = useState<CommissionConfigWithSpecialist[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedConfig, setSelectedConfig] = useState<CommissionConfigWithSpecialist | null>(null)
  const [configToDelete, setConfigToDelete] = useState<string | null>(null)

  const activeBusinessId = activeBusiness?.id
  const isAdmin = role === USER_ROLES.COMPANY_ADMIN || role === USER_ROLES.BUSINESS_ADMIN

  const loadConfigs = useCallback(async () => {
    if (!activeBusinessId) return

    setIsLoading(true)
    try {
      const result = await commissionService.fetchConfigs({
        business_id: activeBusinessId,
        page_size: 100,
      })
      setConfigs(result.data)
    } catch (error) {
      console.error('Error loading configs:', error)
      toast.error('Error al cargar configuraciones')
    } finally {
      setIsLoading(false)
    }
  }, [commissionService, activeBusinessId])

  useEffect(() => {
    if (activeBusinessId) {
      loadConfigs()
    }
  }, [loadConfigs, activeBusinessId])

  const handleCreate = () => {
    setSelectedConfig(null)
    setModalOpen(true)
  }

  const handleEdit = (config: CommissionConfigWithSpecialist) => {
    setSelectedConfig(config)
    setModalOpen(true)
  }

  const handleDelete = (id: string) => {
    setConfigToDelete(id)
    setDeleteDialogOpen(true)
  }

  const handleSave = async (data: CommissionConfigInsert | CommissionConfigUpdate, isEdit: boolean) => {
    try {
      if (isEdit && selectedConfig) {
        const result = await commissionService.updateConfig(selectedConfig.id, data)
        if (!result.success) throw new Error(result.error)
        toast.success('Configuración actualizada')
      } else {
        const result = await commissionService.createConfig(data as CommissionConfigInsert)
        if (!result.success) throw new Error(result.error)
        toast.success('Configuración creada')
      }
      loadConfigs()
      setModalOpen(false)
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar')
      throw error
    }
  }

  const confirmDelete = async () => {
    if (!configToDelete) return

    try {
      const result = await commissionService.deleteConfig(configToDelete)
      if (!result.success) throw new Error(result.error)
      toast.success('Configuración eliminada')
      loadConfigs()
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar')
    } finally {
      setDeleteDialogOpen(false)
      setConfigToDelete(null)
    }
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">No tienes permisos para ver esta página</p>
      </div>
    )
  }

  if (!activeBusinessId) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Settings2 className="h-7 w-7" />
            Configuración de Comisiones
          </h1>
          <p className="text-muted-foreground">
            Selecciona una sucursal para configurar las comisiones
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Settings2 className="h-7 w-7" />
            Configuración de Comisiones
          </h1>
          <p className="text-muted-foreground">
            Define las reglas de comisión para tus especialistas
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Configuración
        </Button>
      </div>

      <CommissionConfigList
        configs={configs}
        isLoading={isLoading || userLoading}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <CommissionConfigModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        config={selectedConfig}
        businessId={activeBusinessId}
        onSave={handleSave}
      />

      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        itemName="configuración de comisión"
      />
    </div>
  )
}
