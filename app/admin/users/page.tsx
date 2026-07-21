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
import { MoreHorizontal, Pencil, Trash2, Plus } from 'lucide-react'
import AccountUserService from '@/lib/services/account-user/account-user-service'
import {
  ACCOUNT_USERS_COLUMNS,
  USER_ROLE_LABELS,
} from '@/lib/models/account-user/const/data-table/account-users-columns'
import { AccountUserModal } from '@/components/account-users/AccountUserModal'
import { useRef, useMemo, useState } from 'react'
import type {
  AccountUser,
  AccountUserInsert,
  AccountUserUpdate,
} from '@/lib/models/account-user/account-user'
import { useCurrentUser } from '@/hooks/use-current-user'
import { USER_ROLES } from '@/const/roles'
import { toast } from 'sonner'

export default function UsersPage() {
  const accountUserService = useMemo(() => new AccountUserService(), [])
  const dataTableRef = useRef<DataTableRef>(null)
  const { user, role } = useCurrentUser()

  const [modalOpen, setModalOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<AccountUser | null>(null)
  const [userToDelete, setUserToDelete] = useState<string | null>(null)
  const [usersToDelete, setUsersToDelete] = useState<string[]>([])

  const isCompanyAdmin = role === USER_ROLES.COMPANY_ADMIN
  // Solo company_admin y business_admin gestionan usuarios
  const canManageUsers =
    role === USER_ROLES.COMPANY_ADMIN || role === USER_ROLES.BUSINESS_ADMIN

  const searchConfig: SearchConfig = useMemo(
    () => ({
      column: 'name',
      placeholder: 'Buscar por nombre o email...',
      serverField: 'search',
    }),
    []
  )

  const filters: FilterConfig[] = useMemo(
    () => [
      {
        column: 'role',
        title: 'Rol',
        options: (isCompanyAdmin
          ? [
              USER_ROLES.COMPANY_ADMIN,
              USER_ROLES.BUSINESS_ADMIN,
              USER_ROLES.PROFESSIONAL,
              USER_ROLES.EMPLOYEE,
            ]
          : [
              USER_ROLES.BUSINESS_ADMIN,
              USER_ROLES.PROFESSIONAL,
              USER_ROLES.EMPLOYEE,
            ]
        ).map((r) => ({
          label: USER_ROLE_LABELS[r] || r,
          value: r,
        })),
      },
    ],
    [isCompanyAdmin]
  )

  const handleCreateUser = () => {
    setSelectedUser(null)
    setModalOpen(true)
  }

  const handleEditUser = (accountUser: AccountUser) => {
    setSelectedUser(accountUser)
    setModalOpen(true)
  }

  const handleDeleteUser = (userId: string) => {
    setUserToDelete(userId)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!userToDelete) return

    try {
      const result = await accountUserService.deleteUser(userToDelete)
      if (result.success) {
        toast.success('Usuario eliminado correctamente')
        dataTableRef.current?.refreshData()
      } else {
        throw new Error(result.error || undefined)
      }
    } catch (error: any) {
      toast.error(error.message || 'No se pudo eliminar el usuario')
    } finally {
      setDeleteDialogOpen(false)
      setUserToDelete(null)
    }
  }

  const handleBatchDelete = async (ids: string[]) => {
    setUsersToDelete(ids)
    setBatchDeleteDialogOpen(true)
  }

  const confirmBatchDelete = async () => {
    if (!usersToDelete.length) return

    try {
      const result = await accountUserService.deleteUsers(usersToDelete)
      if (result.success) {
        toast.success(`${result.deletedCount} usuario(s) eliminado(s)`)
        dataTableRef.current?.refreshData()
        dataTableRef.current?.clearSelection()
      } else {
        throw new Error(result.error || undefined)
      }
    } catch (error: any) {
      toast.error(error.message || 'No se pudieron eliminar los usuarios')
    } finally {
      setBatchDeleteDialogOpen(false)
      setUsersToDelete([])
    }
  }

  const handleSaveUser = async (
    data: AccountUserInsert | AccountUserUpdate
  ) => {
    try {
      if (selectedUser) {
        const result = await accountUserService.updateUser(
          selectedUser.id,
          data as AccountUserUpdate
        )
        if (!result.success) {
          throw new Error(result.error || undefined)
        }
        toast.success('Usuario actualizado correctamente')
      } else {
        const result = await accountUserService.createUser(
          data as AccountUserInsert
        )
        if (!result.success) {
          throw new Error(result.error || undefined)
        }
        toast.success('Usuario creado correctamente')
      }
      dataTableRef.current?.refreshData()
    } catch (error: any) {
      toast.error(error.message || 'No se pudo guardar el usuario')
      throw error
    }
  }

  // Crear columnas con acciones
  const columnsWithActions = useMemo(() => {
    return ACCOUNT_USERS_COLUMNS.map((col) => {
      if (col.id === 'actions') {
        return {
          ...col,
          cell: ({ row }: any) => {
            const accountUser: AccountUser = row.original
            const isSelf = accountUser.id === user?.id
            // Un business_admin no puede tocar company_admins
            const canTouch =
              canManageUsers &&
              (isCompanyAdmin ||
                accountUser.role !== USER_ROLES.COMPANY_ADMIN)

            if (!canTouch) return null

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
                  <DropdownMenuItem onClick={() => handleEditUser(accountUser)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar
                  </DropdownMenuItem>
                  {!isSelf && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => handleDeleteUser(accountUser.id)}
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
      // Ocultar la columna Cuenta para business_admin (siempre es la suya)
      return col
    }).filter(
      (col) =>
        isCompanyAdmin ||
        !('accessorKey' in col && col.accessorKey === 'business_account_name')
    )
  }, [user?.id, canManageUsers, isCompanyAdmin])

  return (
    <div className="flex flex-col gap-6 w-full overflow-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Usuarios
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Gestiona los usuarios y su acceso a las sucursales
          </p>
        </div>
        {canManageUsers && (
          <Button onClick={handleCreateUser} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Crear Usuario
          </Button>
        )}
      </div>

      <DataTable
        ref={dataTableRef}
        columns={columnsWithActions}
        service={accountUserService}
        searchConfig={searchConfig}
        filters={filters}
        enableRowSelection={!!canManageUsers}
        onDeleteSelected={handleBatchDelete}
      />

      <AccountUserModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        user={selectedUser}
        onSave={handleSaveUser}
      />

      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        itemName="usuario"
      />

      <ConfirmDeleteDialog
        open={batchDeleteDialogOpen}
        onOpenChange={setBatchDeleteDialogOpen}
        onConfirm={confirmBatchDelete}
        itemName="usuario"
        count={usersToDelete.length}
        variant="outline"
      />
    </div>
  )
}
