'use client'

import { DataTable, DataTableRef, SearchConfig } from '@/components/DataTable'
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
import { MoreHorizontal, Pencil, Trash2, Users, Eye, Clock } from 'lucide-react'
import BusinessAccountService from '@/lib/services/business-account/business-account-service'
import { BUSINESS_ACCOUNTS_COLUMNS } from '@/lib/models/business-account/const/data-table/business-accounts-columns'
import { BusinessAccountModal } from '@/components/business-accounts/BusinessAccountModal'
import { BusinessAccountDetailModal } from '@/components/business-accounts/BusinessAccountDetailModal'
import { TrialAssignmentModal } from '@/components/trial'
import { useRef, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import type {
  BusinessAccount,
  BusinessAccountInsert,
  BusinessAccountUpdate,
} from '@/lib/models/business-account/business-account'
import { useCurrentUser } from '@/hooks/use-current-user'
import { toast } from 'sonner'
import { hasPermission } from '@/const/roles'

export default function BusinessAccountsPage() {
  const businessAccountService = useMemo(() => new BusinessAccountService(), [])
  const dataTableRef = useRef<DataTableRef>(null)
  const { user, role } = useCurrentUser()

  const [modalOpen, setModalOpen] = useState(false)
  const [membersModalOpen, setMembersModalOpen] = useState(false)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false)
  const [selectedAccount, setSelectedAccount] =
    useState<BusinessAccount | null>(null)
  const [selectedAccountForDetail, setSelectedAccountForDetail] =
    useState<BusinessAccount | null>(null)
  const [accountToDelete, setAccountToDelete] = useState<string | null>(null)
  const [accountsToDelete, setAccountsToDelete] = useState<string[]>([])
  const [selectedAccountForMembers, setSelectedAccountForMembers] = useState<{
    id: string
    name: string
    contactName?: string
    contactEmail?: string
  } | null>(null)
  const [trialModalOpen, setTrialModalOpen] = useState(false)
  const [selectedAccountForTrial, setSelectedAccountForTrial] = useState<{
    id: string
    name: string
  } | null>(null)

  const searchConfig: SearchConfig = useMemo(
    () => ({
      column: 'company_name',
      placeholder: 'Buscar por nombre de empresa...',
      serverField: 'company_name',
    }),
    []
  )

  const handleCreateAccount = () => {
    setSelectedAccount(null)
    setModalOpen(true)
  }

  const handleEditAccount = (account: BusinessAccount) => {
    setSelectedAccount(account)
    setModalOpen(true)
  }

  const handleViewDetail = (account: BusinessAccount) => {
    setSelectedAccountForDetail(account)
    setDetailModalOpen(true)
  }

  const handleManageMembers = (account: BusinessAccount) => {
    setSelectedAccountForMembers({
      id: account.id,
      name: account.company_name,
      contactName: account.contact_name,
      contactEmail: account.contact_email,
    })
    setMembersModalOpen(true)
  }

  const handleManageTrial = (account: BusinessAccount) => {
    setSelectedAccountForTrial({
      id: account.id,
      name: account.company_name,
    })
    setTrialModalOpen(true)
  }

  const handleDeleteAccount = (accountId: string) => {
    setAccountToDelete(accountId)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!accountToDelete) return

    try {
      const result = await businessAccountService.deleteAccount(accountToDelete)
      if (result.success) {
        toast.success('Cuenta eliminada correctamente')
        dataTableRef.current?.refreshData()
      } else {
        throw new Error(result.error)
      }
    } catch (error: any) {
      toast.error(error.message || 'No se pudo eliminar la cuenta')
    } finally {
      setDeleteDialogOpen(false)
      setAccountToDelete(null)
    }
  }

  const handleBatchDelete = async (ids: string[]) => {
    setAccountsToDelete(ids)
    setBatchDeleteDialogOpen(true)
  }

  const confirmBatchDelete = async () => {
    if (!accountsToDelete.length) return

    try {
      const result =
        await businessAccountService.deleteAccounts(accountsToDelete)
      if (result.success) {
        toast.success(`${result.deletedCount} cuenta(s) eliminada(s)`)
        dataTableRef.current?.refreshData()
        dataTableRef.current?.clearSelection()
      } else {
        throw new Error(result.error)
      }
    } catch (error: any) {
      toast.error(error.message || 'No se pudieron eliminar las cuentas')
    } finally {
      setBatchDeleteDialogOpen(false)
      setAccountsToDelete([])
    }
  }

  const handleSaveAccount = async (
    data: BusinessAccountInsert | BusinessAccountUpdate
  ) => {
    try {
      if (selectedAccount) {
        await businessAccountService.updateAccount(
          selectedAccount.id,
          data as BusinessAccountUpdate
        )
        toast.success('Cuenta actualizada correctamente')
      } else {
        if (!user?.id) {
          throw new Error('Usuario no autenticado')
        }

        const accountData: BusinessAccountInsert = {
          ...(data as BusinessAccountInsert),
          created_by: user.id,
        }
        const result =
          await businessAccountService.createAccountWithOwner(accountData)

        if (result.success) {
          toast.success('Cuenta creada correctamente')
        } else {
          throw new Error(result.error)
        }
      }
      dataTableRef.current?.refreshData()
    } catch (error: any) {
      toast.error(error.message || 'No se pudo guardar la cuenta')
      throw error
    }
  }

  // Crear columnas con acciones
  const columnsWithActions = useMemo(() => {
    return BUSINESS_ACCOUNTS_COLUMNS.map((col) => {
      if (col.id === 'actions') {
        return {
          ...col,
          cell: ({ row }: any) => {
            const account = row.original
            const canEditFull =
              role && hasPermission(role, 'canEditBusinessAccount')
            const canEditContact =
              role && hasPermission(role, 'canEditAccountContactInfo')
            const canEdit = canEditFull || canEditContact
            const canDelete =
              role && hasPermission(role, 'canDeleteBusinessAccount')

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
                  <DropdownMenuItem onClick={() => handleViewDetail(account)}>
                    <Eye className="mr-2 h-4 w-4" />
                    Ver detalle
                  </DropdownMenuItem>
                  {canEdit && (
                    <DropdownMenuItem
                      onClick={() => handleEditAccount(account)}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Editar
                    </DropdownMenuItem>
                  )}
                  {canEditFull && (
                    <DropdownMenuItem
                      onClick={() => handleManageTrial(account)}
                    >
                      <Clock className="mr-2 h-4 w-4" />
                      Período de Prueba
                    </DropdownMenuItem>
                  )}
                  {canDelete && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => handleDeleteAccount(account.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Eliminar
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )
          },
        }
      }
      return col
    })
  }, [role])

  const canCreateAccount =
    role && hasPermission(role, 'canCreateBusinessAccount')
  const canDeleteAccount =
    role && hasPermission(role, 'canDeleteBusinessAccount')

  return (
    <div className="flex flex-col gap-6 w-full overflow-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Cuentas
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Gestiona las cuentas registradas
          </p>
        </div>
        {canCreateAccount && (
          <Button onClick={handleCreateAccount} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Crear Cuenta
          </Button>
        )}
      </div>

      <DataTable
        ref={dataTableRef}
        columns={columnsWithActions}
        service={businessAccountService}
        searchConfig={searchConfig}
        enableRowSelection={!!canDeleteAccount}
        onDeleteSelected={handleBatchDelete}
      />

      <BusinessAccountModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        account={selectedAccount}
        onSave={handleSaveAccount}
      />

      <BusinessAccountDetailModal
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        account={selectedAccountForDetail}
      />

      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        itemName="cuenta"
      />

      <ConfirmDeleteDialog
        open={batchDeleteDialogOpen}
        onOpenChange={setBatchDeleteDialogOpen}
        onConfirm={confirmBatchDelete}
        itemName="cuenta"
        count={accountsToDelete.length}
        variant="outline"
      />

      {selectedAccountForTrial && (
        <TrialAssignmentModal
          open={trialModalOpen}
          onOpenChange={setTrialModalOpen}
          accountId={selectedAccountForTrial.id}
          accountName={selectedAccountForTrial.name}
          onSuccess={() => dataTableRef.current?.refreshData()}
        />
      )}
    </div>
  )
}
