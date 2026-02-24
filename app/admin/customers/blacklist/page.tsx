'use client'

import { useRef, useMemo, useState, useCallback, useEffect } from 'react'
import {
  DataTable,
  DataTableRef,
  SearchConfig,
  FilterConfig,
  ExportConfig,
} from '@/components/DataTable'
import { Button } from '@/components/ui/button'
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Trash2, RefreshCw, MailWarning, AlertTriangle } from 'lucide-react'
import { BLACKLIST_COLUMNS } from '@/lib/models/blacklist/const/data-table/blacklist-columns'
import { useActiveBusinessStore } from '@/lib/store/active-business-store'
import { toast } from 'sonner'
import type { EmailBlacklist, BounceType } from '@/lib/models/collection/email-blacklist'
import EmailBlacklistService from '@/lib/services/blacklist/email-blacklist-service'
import { Badge } from '@/components/ui/badge'

interface BlacklistStats {
  total: number
  hard_bounces: number
  soft_bounces: number
  complaints: number
  last_30_days: number
}

export default function BlacklistPage() {
  const { activeBusiness } = useActiveBusinessStore()
  const dataTableRef = useRef<DataTableRef>(null)
  const blacklistService = useMemo(() => new EmailBlacklistService(), [])

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false)
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null)
  const [entriesToDelete, setEntriesToDelete] = useState<string[]>([])
  const [stats, setStats] = useState<BlacklistStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)

  const activeBusinessId = activeBusiness?.id

  const fetchStats = useCallback(async () => {
    if (!activeBusinessId) return

    setStatsLoading(true)
    try {
      const data = await blacklistService.getStats(activeBusinessId)
      setStats(data)
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setStatsLoading(false)
    }
  }, [activeBusinessId, blacklistService])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  const serviceParams = useMemo(() => {
    if (!activeBusinessId) return null
    return { business_id: activeBusinessId }
  }, [activeBusinessId])

  const searchConfig: SearchConfig = useMemo(
    () => ({
      column: 'email',
      placeholder: 'Buscar email...',
      serverField: 'search',
    }),
    []
  )

  const filterConfigs: FilterConfig[] = useMemo(
    () => [
      {
        column: 'bounce_type',
        title: 'Tipo de Rebotado',
        options: [
          { label: 'Rebote Duro', value: 'hard', icon: MailWarning },
          { label: 'Rebote Suave', value: 'soft' },
          { label: 'Queja', value: 'complaint', icon: AlertTriangle },
        ],
      },
    ],
    []
  )

  const exportConfig: ExportConfig | null = useMemo(() => {
    if (!activeBusinessId) return null

    return {
      enabled: true,
      tableName: 'lista-negra-emails',
      businessId: activeBusinessId,
      excludedColumns: ['actions'],
      columnFormatters: {
        bounce_type: (value: string) => {
          const typeLabels: Record<string, string> = {
            hard: 'Rebote Duro',
            soft: 'Rebote Suave',
            complaint: 'Queja',
          }
          return typeLabels[value] || value
        },
        bounced_at: (value: string) => {
          if (!value) return '-'
          return new Date(value).toLocaleDateString('es-CO')
        },
        created_at: (value: string) => {
          if (!value) return '-'
          return new Date(value).toLocaleDateString('es-CO')
        },
      },
    }
  }, [activeBusinessId])

  const handleRemoveEntry = (entryId: string) => {
    setEntryToDelete(entryId)
    setDeleteDialogOpen(true)
  }

  const confirmRemove = async () => {
    if (!entryToDelete) return

    try {
      const result = await blacklistService.destroyItem(entryToDelete)
      if (result.success) {
        toast.success('Email removido de la lista negra')
        dataTableRef.current?.refreshData()
        fetchStats()
      } else {
        throw new Error(result.error)
      }
    } catch (error: any) {
      toast.error(error.message || 'No se pudo remover el email')
    } finally {
      setDeleteDialogOpen(false)
      setEntryToDelete(null)
    }
  }

  const handleBatchRemove = async (ids: string[]) => {
    setEntriesToDelete(ids)
    setBatchDeleteDialogOpen(true)
  }

  const confirmBatchRemove = async () => {
    if (!entriesToDelete.length) return

    try {
      const result = await blacklistService.destroyMany(entriesToDelete)
      if (result.success) {
        toast.success(`${result.deletedCount} email(s) removido(s) de la lista negra`)
        dataTableRef.current?.refreshData()
        dataTableRef.current?.clearSelection()
        fetchStats()
      } else {
        throw new Error(result.error)
      }
    } catch (error: any) {
      toast.error(error.message || 'No se pudieron remover los emails')
    } finally {
      setBatchDeleteDialogOpen(false)
      setEntriesToDelete([])
    }
  }

  const columnsWithActions = useMemo(() => {
    return BLACKLIST_COLUMNS.map((col) => {
      if (col.id === 'actions') {
        return {
          ...col,
          cell: ({ row }: { row: { original: EmailBlacklist } }) => {
            const entry = row.original

            return (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Abrir menú</span>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => handleRemoveEntry(entry.id)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remover de lista negra
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

  if (!activeBusinessId) {
    return (
      <div className="flex flex-col gap-6 w-full overflow-auto">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Lista Negra de Emails
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Selecciona una sucursal para ver los emails rebotados
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 w-full overflow-auto">
      {/* Header with stats banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Lista Negra de Emails
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Emails que han rebotado o generado quejas
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            fetchStats()
            dataTableRef.current?.refreshData()
          }}
          disabled={statsLoading}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${statsLoading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* Simple stats banner */}
      {stats && stats.total > 0 && (
        <div className="flex items-center gap-4 p-4 bg-muted/50 border border-border">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Total:</span>
            <Badge variant="secondary" className="text-lg font-bold">
              {stats.total}
            </Badge>
          </div>
          {stats.hard_bounces > 0 && (
            <div className="flex items-center gap-2">
              <MailWarning className="h-4 w-4 text-destructive" />
              <span className="text-sm text-destructive">{stats.hard_bounces} duros</span>
            </div>
          )}
          {stats.soft_bounces > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm">{stats.soft_bounces} suaves</span>
            </div>
          )}
          {stats.complaints > 0 && (
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="text-sm text-amber-500">{stats.complaints} quejas</span>
            </div>
          )}
        </div>
      )}

      {/* DataTable with filters and export */}
      {serviceParams && (
        <DataTable
          key={activeBusinessId}
          ref={dataTableRef}
          columns={columnsWithActions}
          service={blacklistService}
          searchConfig={searchConfig}
          filters={filterConfigs}
          exportConfig={exportConfig || undefined}
          defaultQueryParams={serviceParams}
          enableRowSelection={true}
          onDeleteSelected={handleBatchRemove}
        />
      )}

      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmRemove}
        itemName="email de la lista negra"
        description="Este email podrá recibir correos nuevamente. ¿Estás seguro?"
      />

      <ConfirmDeleteDialog
        open={batchDeleteDialogOpen}
        onOpenChange={setBatchDeleteDialogOpen}
        onConfirm={confirmBatchRemove}
        itemName="email"
        count={entriesToDelete.length}
        variant="outline"
        description="Estos emails podrán recibir correos nuevamente. ¿Estás seguro?"
      />
    </div>
  )
}
