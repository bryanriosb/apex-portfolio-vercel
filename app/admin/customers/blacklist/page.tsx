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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  MoreHorizontal,
  Trash2,
  RefreshCw,
  MailWarning,
  AlertTriangle,
  Plus,
  Ban,
  Hand,
} from 'lucide-react'
import { BLACKLIST_COLUMNS } from '@/lib/models/blacklist/const/data-table/blacklist-columns'
import { useActiveBusinessStore } from '@/lib/store/active-business-store'
import { toast } from 'sonner'
import type {
  EmailBlacklist,
  BounceType,
} from '@/lib/models/collection/email-blacklist'
import EmailBlacklistService from '@/lib/services/blacklist/email-blacklist-service'
import { addToBlacklistAction } from '@/lib/actions/blacklist'
import { Badge } from '@/components/ui/badge'
import Loading from '@/components/ui/loading'

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
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [newBounceType, setNewBounceType] = useState<BounceType>('manual')
  const [newBounceReason, setNewBounceReason] = useState('')
  const [isAdding, setIsAdding] = useState(false)

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
        toast.success(
          `${result.deletedCount} email(s) removido(s) de la lista negra`
        )
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

  const handleAddToBlacklist = async () => {
    if (!activeBusinessId || !newEmail.trim()) return

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(newEmail.trim())) {
      toast.error('Por favor ingresa un email válido')
      return
    }

    setIsAdding(true)
    try {
      const result = await addToBlacklistAction(
        activeBusinessId,
        newEmail.trim(),
        newBounceType,
        newBounceReason.trim() || 'Agregado manualmente'
      )

      if (result.success) {
        toast.success('Email agregado a la lista negra')
        setNewEmail('')
        setNewBounceReason('')
        setNewBounceType('manual')
        setShowAddDialog(false)
        dataTableRef.current?.refreshData()
        fetchStats()
      } else {
        throw new Error(result.error)
      }
    } catch (error: any) {
      toast.error(error.message || 'No se pudo agregar el email')
    } finally {
      setIsAdding(false)
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
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowAddDialog(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Agregar Email
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              fetchStats()
              dataTableRef.current?.refreshData()
            }}
            disabled={statsLoading}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${statsLoading ? 'animate-spin' : ''}`}
            />
            Actualizar
          </Button>
        </div>
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
              <span className="text-sm text-destructive">
                {stats.hard_bounces} duros
              </span>
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
              <span className="text-sm text-amber-500">
                {stats.complaints} quejas
              </span>
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

      {/* Dialog para agregar email a lista negra */}
      {showAddDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background border w-full max-w-md mx-4">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <Ban className="h-5 w-5 text-destructive" />
                <h2 className="text-lg font-semibold">Agregar a Lista Negra</h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAddDialog(false)}
                className="h-8 w-8 p-0"
              >
                <span className="sr-only">Cerrar</span>
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </Button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="ejemplo@correo.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  disabled={isAdding}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bounceType">Tipo de Rechazo *</Label>
                <Select
                  value={newBounceType}
                  onValueChange={(value: BounceType) => setNewBounceType(value)}
                  disabled={isAdding}
                >
                  <SelectTrigger id="bounceType">
                    <SelectValue placeholder="Selecciona el tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hard">
                      <div className="flex items-center gap-2">
                        <MailWarning className="h-4 w-4 text-destructive" />
                        Rebote Duro
                      </div>
                    </SelectItem>
                    <SelectItem value="soft">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        Rebote Suave
                      </div>
                    </SelectItem>
                    <SelectItem value="complaint">
                      <div className="flex items-center gap-2">
                        <Ban className="h-4 w-4 text-orange-500" />
                        Queja
                      </div>
                    </SelectItem>
                    <SelectItem value="manual">
                      <div className="flex items-center gap-2">
                        <Hand className="h-4 w-4 text-blue-500" />
                        Manual
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Razón (opcional)</Label>
                <Input
                  id="reason"
                  placeholder="Motivo del rechazo..."
                  value={newBounceReason}
                  onChange={(e) => setNewBounceReason(e.target.value)}
                  disabled={isAdding}
                />
              </div>

              <div className="bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
                <p className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>
                    Este email será excluido de futuros envíos de cobros.
                    Asegúrate de que la dirección sea correcta.
                  </span>
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 p-4 border-t">
              <Button
                variant="outline"
                onClick={() => setShowAddDialog(false)}
                disabled={isAdding}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleAddToBlacklist}
                disabled={isAdding || !newEmail.trim()}
                className="gap-2"
              >
                {isAdding ? (
                  <>
                    <Loading className="text-white" />
                    Agregando...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Agregar a Lista Negra
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
