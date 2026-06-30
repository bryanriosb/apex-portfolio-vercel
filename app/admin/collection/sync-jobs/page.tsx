'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { DataTable, DataTableRef } from '@/components/DataTable'
import Loading from '@/components/ui/loading'
import { toast } from 'sonner'
import { Plus, RefreshCw, MoreHorizontal, StopCircle, LayoutList, CheckCircle2, XCircle, Activity, Clock, RotateCw } from 'lucide-react'
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
import { SyncJobsService } from '@/lib/services/collection/sync-jobs-service'
import { IntegrationsService } from '@/lib/services/integrations/integrations-service'
import type { IntegrationConfig } from '@/lib/models/integrations/integration-config'
import { getSyncJobsColumns } from '@/components/collection/sync-jobs/SyncJobsColumns'
import { JobRecord, SyncJobFormValues } from '@/lib/models/collection/sync-jobs'
import { SyncJobFormDialog } from '@/components/collection/sync-jobs/SyncJobFormDialog'
import { Edit, PlayCircle, PauseCircle } from 'lucide-react'

export default function SyncJobsPage() {
  const { isLoading: userLoading } = useCurrentUser()
  const { data: session } = useSession()
  const { activeBusiness, isLoading: businessLoading } = useActiveBusinessStore()

  const accessToken = (session?.user as any)?.accessToken || ''
  const businessId = activeBusiness?.id || ''
  const businessAccountId = activeBusiness?.business_account_id || ''

  const service = useMemo(
    () =>
      accessToken && businessId && businessAccountId
        ? new SyncJobsService(accessToken, businessId, businessAccountId)
        : null,
    [accessToken, businessId, businessAccountId]
  )

  const tableRef = useRef<DataTableRef>(null)
  const [hasActiveJobs, setHasActiveJobs] = useState(false)

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [selectedJob, setSelectedJob] = useState<JobRecord | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [connectors, setConnectors] = useState<IntegrationConfig[]>([])
  const [loadingConnectors, setLoadingConnectors] = useState(false)

  const integrationsService = useMemo(
    () =>
      accessToken && businessAccountId
        ? new IntegrationsService(accessToken, businessAccountId)
        : null,
    [accessToken, businessAccountId]
  )

  useEffect(() => {
    if (integrationsService) {
      setLoadingConnectors(true)
      integrationsService.listConfigs()
        .then(setConnectors)
        .catch(() => toast.error('Error cargando conectores'))
        .finally(() => setLoadingConnectors(false))
    }
  }, [integrationsService])

  // Polling logic for jobs that are in progress or pending
  useEffect(() => {
    if (!hasActiveJobs) return

    const intervalId = setInterval(() => {
      tableRef.current?.refreshData()
    }, 10000)

    return () => clearInterval(intervalId)
  }, [hasActiveJobs])

  const handleCancelJob = useCallback(async (job: JobRecord) => {
    if (!service) return
    try {
      await service.cancelSyncJob(job.id)
      toast.success('Trabajo de sincronización cancelado')
      tableRef.current?.refreshData()
    } catch (err) {
      toast.error('Error al cancelar el trabajo')
    }
  }, [service])

  const handleCreateSync = () => {
    setFormMode('create')
    setSelectedJob(null)
    setIsFormOpen(true)
  }

  const handleEditSync = useCallback((job: JobRecord) => {
    setFormMode('edit')
    setSelectedJob(job)
    setIsFormOpen(true)
  }, [])

  const handleTogglePause = useCallback(async (job: JobRecord) => {
    if (!service) return
    try {
      const newStatus = job.status?.toLowerCase() === 'paused' ? 'Recurring' : 'Paused'
      await service.updateJobStatus(job.id, newStatus)
      toast.success(`Trabajo de sincronización ${newStatus === 'Paused' ? 'pausado' : 'reanudado'}`)
      tableRef.current?.refreshData()
    } catch (err) {
      toast.error('Error al actualizar el estado del trabajo')
    }
  }, [service])

  const timezone = activeBusiness?.timezone || 'America/Bogota'

  const handleSubmitForm = async (values: SyncJobFormValues) => {
    if (!service) return
    setIsSubmitting(true)
    try {
      if (formMode === 'edit' && selectedJob) {
        // To edit a cron or scheduled job, we must delete it first and recreate it
        await service.cancelSyncJob(selectedJob.id)
      }

      const payload = {
        name: values.name,
        category: values.category,
        operation: values.operation,
        batch_size: values.batch_size,
      }

      if (values.executionType === 'immediate') {
        await service.createImmediateSync(payload, values.connector_id)
      } else {
        const scheduleParams = values.executionType === 'scheduled'
          ? { datetime: values.datetime, timezone: timezone }
          : { cron: values.cron, timezone: timezone }

        await service.createScheduledSync({
          ...scheduleParams,
          job: {
            CollectionSync: {
              business_id: businessId,
              business_account_id: values.connector_id,
              operation: values.operation,
              batch_size: values.batch_size,
              sync_id: crypto.randomUUID()
            }
          },
          business_id: businessId,
          module: 'collection',
          name: values.name,
          category: values.category
        })
      }
      toast.success(`Sincronización ${formMode === 'edit' ? 'actualizada' : 'creada'} correctamente`)
      setIsFormOpen(false)
      tableRef.current?.refreshData()
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar la sincronización')
    } finally {
      setIsSubmitting(false)
    }
  }

  const columns = useMemo(() => {
    return getSyncJobsColumns(timezone).map((col) => {
      if (col.id === 'actions') {
        return {
          ...col,
          cell: ({ row }: { row: any }) => {
            const job = row.original as JobRecord
            const status = job.status?.toLowerCase() || ''
            const isCompleted = ['completed', 'success'].includes(status)

            if (isCompleted) {
              return null
            }

            const canCancel = ['in_progress', 'pending', 'recurring', 'paused'].includes(status)
            const canPause = ['recurring', 'paused'].includes(status)
            const canEdit = ['recurring', 'pending', 'scheduled'].includes(status) || job.kind?.toLowerCase() === 'scheduled' || job.kind?.toLowerCase() === 'recurring'
            const isPaused = status === 'paused'

            return (
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-none">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-none">
                  {canEdit && (
                    <DropdownMenuItem onSelect={() => handleEditSync(job)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Editar Programación
                    </DropdownMenuItem>
                  )}
                  {canPause && (
                    <DropdownMenuItem onSelect={() => handleTogglePause(job)}>
                      {isPaused ? (
                        <PlayCircle className="mr-2 h-4 w-4 text-green-600" />
                      ) : (
                        <PauseCircle className="mr-2 h-4 w-4 text-orange-600" />
                      )}
                      {isPaused ? 'Reanudar' : 'Pausar'}
                    </DropdownMenuItem>
                  )}
                  {canCancel ? (
                    <DropdownMenuItem
                      onSelect={() => handleCancelJob(job)}
                      className="text-destructive focus:text-destructive"
                    >
                      <StopCircle className="mr-2 h-4 w-4" />
                      Cancelar / Eliminar
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onSelect={() => toast.info('No hay acciones disponibles para este estado')}>
                      <LayoutList className="mr-2 h-4 w-4" />
                      Ver Detalles
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )
          },
        }
      }
      return col
    })
  }, [timezone, handleCancelJob, handleEditSync, handleTogglePause])

  // Configuración de características de DataTable
  const searchConfig = {
    column: 'name',
    placeholder: 'Buscar por nombre o categoría...',
  }

  const filters = [
    {
      column: 'status',
      title: 'Estado',
      options: [
        { label: 'Completado', value: 'Completed', icon: CheckCircle2 },
        { label: 'Fallido', value: 'Failed', icon: XCircle },
        { label: 'En Progreso', value: 'in_progress', icon: Activity },
        { label: 'Pendiente', value: 'Pending', icon: Clock },
        { label: 'Recurrente', value: 'Recurring', icon: RotateCw },
      ],
    },
    {
      column: 'kind',
      title: 'Tipo',
      options: [
        { label: 'Única', value: 'Single' },
        { label: 'Programada', value: 'Scheduled' },
        { label: 'Recurrente', value: 'Recurring' },
      ],
    }
  ]

  const exportConfig = {
    enabled: true,
    tableName: 'sincronizaciones_cartera',
    businessId: businessId,
  }

  const deleteConfig = {
    enabled: true,
    itemName: 'sincronización',
    onDelete: async (ids: string[]) => {
      if (!service) return
      await Promise.all(ids.map(id => service.cancelSyncJob(id)))
    }
  }

  const tableService = useMemo(() => {
    if (!service) return undefined
    return {
      fetchItems: async (params: any) => {
        try {
          const allData = await service.listJobs()
          let filteredJobs = allData.filter((j) => j.job_type === 'CollectionSync')

          // Aplicar búsqueda manual local
          if (params.search) {
            const searchLower = params.search.toLowerCase()
            filteredJobs = filteredJobs.filter(j =>
              j.name?.toLowerCase().includes(searchLower) ||
              j.category?.toLowerCase().includes(searchLower)
            )
          }

          // Aplicar filtros locales
          if (params.status) {
            const statuses = Array.isArray(params.status) ? params.status : [params.status]
            filteredJobs = filteredJobs.filter(j => statuses.some((s: string) => s.toLowerCase() === j.status?.toLowerCase()))
          }
          if (params.kind) {
            const kinds = Array.isArray(params.kind) ? params.kind : [params.kind]
            filteredJobs = filteredJobs.filter(j => kinds.some((k: string) => k.toLowerCase() === j.kind?.toLowerCase()))
          }

          // Detectar si hay jobs activos para habilitar polling
          const activeCount = filteredJobs.filter(
            (j) => j.status?.toLowerCase() === 'in_progress' || j.status?.toLowerCase() === 'pending'
          ).length
          setHasActiveJobs(activeCount > 0)

          // Aplicar paginación local
          const page = params.page || 1
          const pageSize = params.page_size || 10
          const total = filteredJobs.length
          const totalPages = Math.ceil(total / pageSize)

          const paginatedData = filteredJobs.slice((page - 1) * pageSize, page * pageSize)

          return {
            data: paginatedData,
            total: total,
            total_pages: totalPages,
          }
        } catch (error) {
          toast.error('No se pudo cargar la información de las sincronizaciones')
          return { data: [], total: 0, total_pages: 0 }
        }
      }
    }
  }, [service])

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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sincronizaciones</h1>
          <p className="text-muted-foreground">
            Programa o ejecuta la sincronización de facturas desde integraciones conectadas
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleCreateSync} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Nueva Sincronización
          </Button>
        </div>
      </div>

      <Tabs defaultValue="pending_invoices" className="w-full">
        <TabsList>
          <TabsTrigger value="pending_invoices">Facturas Pendientes</TabsTrigger>
        </TabsList>

        <TabsContent value="pending_invoices" className="space-y-4">
          <DataTable
            key={`sync-jobs-${activeBusiness?.id}`}
            refreshKey={`collection-sync-jobs-${activeBusiness?.id}`}
            ref={tableRef}
            columns={columns}
            service={tableService}
            filters={filters}
            searchConfig={searchConfig}
            exportConfig={exportConfig}
            deleteConfig={deleteConfig}
            enableRowSelection={true}
            emptyState={
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <RefreshCw className="h-10 w-10 text-muted-foreground/50" />
                <div className="text-center">
                  <p className="font-medium">Sin trabajos de sincronización</p>
                  <p className="text-sm text-muted-foreground">
                    No hay registros de sincronización de facturas pendientes.
                  </p>
                </div>
                <Button onClick={handleCreateSync} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Iniciar Sincronización
                </Button>
              </div>
            }
          />
        </TabsContent>
      </Tabs>

      {isFormOpen && (
        <SyncJobFormDialog
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          onSubmit={handleSubmitForm}
          isSubmitting={isSubmitting}
          mode={formMode}
          defaultValues={
            selectedJob
              ? {
                name: selectedJob.name,
                category: selectedJob.category,
                operation: selectedJob.payload?.CollectionSync?.operation || 'full_sync',
                executionType: selectedJob.cron ? 'cron' : selectedJob.scheduled_at ? 'scheduled' : 'immediate',
                cron: selectedJob.cron || '',
                datetime: selectedJob.scheduled_at ? selectedJob.scheduled_at.slice(0, 16) : '',
                batch_size: selectedJob.payload?.CollectionSync?.batch_size || 100,
                connector_id: selectedJob.payload?.CollectionSync?.business_account_id || '',
              }
              : undefined
          }
          timezone={timezone}
          connectors={connectors}
          isLoadingConnectors={loadingConnectors}
        />
      )}
    </div>
  )
}
