'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { KeyRound, Pencil, Plus, ShieldCheck, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog'
import { RoleModal, type RoleFormValues } from '@/components/access-control/RoleModal'
import { RolePermissionsModal } from '@/components/access-control/RolePermissionsModal'
import {
  createRoleAction,
  deleteRoleAction,
  fetchRolesAction,
  updateRoleAction,
} from '@/lib/actions/access-control/roles'
import { formatDate } from '@/components/access-control/format'
import { useCurrentUser } from '@/hooks/use-current-user'
import { useActiveBusinessStore } from '@/lib/store/active-business-store'
import { USER_ROLES } from '@/const/roles'
import type { RbacRole } from '@/lib/models/access-control/access-control'

export default function RolesPage() {
  const { role: userRole } = useCurrentUser()
  const { activeBusiness } = useActiveBusinessStore()

  const isCompanyAdmin = userRole === USER_ROLES.COMPANY_ADMIN
  // Para company_admin el alcance sale del negocio activo; para
  // business_admin el servidor lo deriva SIEMPRE de la sesión.
  const accountId = isCompanyAdmin
    ? activeBusiness?.business_account_id ?? undefined
    : undefined

  const [roles, setRoles] = useState<RbacRole[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [roleModalOpen, setRoleModalOpen] = useState(false)
  const [permissionsModalOpen, setPermissionsModalOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState<RbacRole | null>(null)
  const [roleToDelete, setRoleToDelete] = useState<RbacRole | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const loadRoles = useCallback(async () => {
    setIsLoading(true)
    const result = await fetchRolesAction(
      accountId ? { businessAccountId: accountId } : undefined
    )
    setIsLoading(false)

    if (result.error) {
      toast.error(result.error)
      return
    }
    setRoles(result.data)
  }, [accountId])

  useEffect(() => {
    loadRoles()
  }, [loadRoles])

  /** Un rol es gestionable si no es de sistema y (si es global) la sesión es de plataforma. */
  const canManageRole = useCallback(
    (role: RbacRole) =>
      !role.is_system && (isCompanyAdmin || role.business_account_id !== null),
    [isCompanyAdmin]
  )

  const readOnlyReason = (role: RbacRole) =>
    role.is_system
      ? 'Rol del sistema, solo lectura'
      : 'Rol global, solo administrable por la plataforma'

  const scopeBadge = (role: RbacRole) => {
    if (role.is_system) {
      return (
        <Badge variant="secondary" className="gap-1">
          <ShieldCheck className="h-3 w-3" />
          Sistema
        </Badge>
      )
    }
    if (role.business_account_id === null) {
      return <Badge variant="outline">Global</Badge>
    }
    return <Badge>Cuenta</Badge>
  }

  const handleCreate = () => {
    setSelectedRole(null)
    setRoleModalOpen(true)
  }

  const handleEdit = (role: RbacRole) => {
    setSelectedRole(role)
    setRoleModalOpen(true)
  }

  const handleManagePermissions = (role: RbacRole) => {
    setSelectedRole(role)
    setPermissionsModalOpen(true)
  }

  const handleDelete = (role: RbacRole) => {
    setRoleToDelete(role)
    setDeleteDialogOpen(true)
  }

  const handleSaveRole = async (values: RoleFormValues) => {
    if (selectedRole) {
      const result = await updateRoleAction(selectedRole.id, {
        name: values.name,
        description: values.description || null,
      })
      if (result.error) {
        toast.error(result.error)
        throw new Error(result.error)
      }
      toast.success('Rol actualizado correctamente')
    } else {
      let businessAccountId: string | null | undefined
      if (isCompanyAdmin) {
        if (values.isGlobal) {
          businessAccountId = null
        } else if (accountId) {
          businessAccountId = accountId
        } else {
          const message =
            'Selecciona un negocio activo para crear un rol de cuenta, o marca el rol como global'
          toast.error(message)
          throw new Error(message)
        }
      }

      const result = await createRoleAction({
        name: values.name,
        description: values.description || null,
        ...(isCompanyAdmin ? { business_account_id: businessAccountId } : {}),
      })
      if (result.error) {
        toast.error(result.error)
        throw new Error(result.error)
      }
      toast.success('Rol creado correctamente')
    }

    await loadRoles()
  }

  const confirmDelete = async () => {
    if (!roleToDelete) return

    setIsDeleting(true)
    const result = await deleteRoleAction(roleToDelete.id)
    setIsDeleting(false)
    setDeleteDialogOpen(false)
    setRoleToDelete(null)

    if (!result.success) {
      toast.error(result.error || 'No se pudo eliminar el rol')
      return
    }
    toast.success('Rol eliminado correctamente')
    await loadRoles()
  }

  const permissionsReadOnly = useMemo(
    () => (selectedRole ? !canManageRole(selectedRole) : true),
    [selectedRole, canManageRole]
  )

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6 w-full overflow-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Roles
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Define roles y los permisos que otorgan
            </p>
          </div>
          <Button onClick={handleCreate} size="sm" className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Nuevo rol
          </Button>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead className="hidden md:table-cell">
                  Descripción
                </TableHead>
                <TableHead>Alcance</TableHead>
                <TableHead className="text-center">Permisos</TableHead>
                <TableHead className="hidden sm:table-cell">Creado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : roles.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No hay roles registrados
                  </TableCell>
                </TableRow>
              ) : (
                roles.map((role) => {
                  const manageable = canManageRole(role)
                  return (
                    <TableRow key={role.id}>
                      <TableCell className="font-medium">{role.name}</TableCell>
                      <TableCell className="hidden md:table-cell max-w-[280px] truncate text-muted-foreground">
                        {role.description || '—'}
                      </TableCell>
                      <TableCell>{scopeBadge(role)}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">
                          {role.permissions_count ?? 0}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">
                        {formatDate(role.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleManagePermissions(role)}
                              >
                                <KeyRound className="h-4 w-4" />
                                <span className="sr-only">
                                  Gestionar permisos
                                </span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {manageable
                                ? 'Gestionar permisos'
                                : 'Ver permisos'}
                            </TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span tabIndex={manageable ? -1 : 0}>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  disabled={!manageable}
                                  onClick={() => handleEdit(role)}
                                >
                                  <Pencil className="h-4 w-4" />
                                  <span className="sr-only">Editar</span>
                                </Button>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              {manageable ? 'Editar' : readOnlyReason(role)}
                            </TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span tabIndex={manageable ? -1 : 0}>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  disabled={!manageable}
                                  onClick={() => handleDelete(role)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                  <span className="sr-only">Eliminar</span>
                                </Button>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              {manageable ? 'Eliminar' : readOnlyReason(role)}
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        <RoleModal
          open={roleModalOpen}
          onOpenChange={setRoleModalOpen}
          role={selectedRole}
          showGlobalSwitch={isCompanyAdmin}
          onSave={handleSaveRole}
        />

        <RolePermissionsModal
          open={permissionsModalOpen}
          onOpenChange={setPermissionsModalOpen}
          role={selectedRole}
          readOnly={permissionsReadOnly}
          onSaved={loadRoles}
        />

        <ConfirmDeleteDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onConfirm={confirmDelete}
          itemName="rol"
          isLoading={isDeleting}
          description={
            roleToDelete
              ? `Esta acción no se puede deshacer. Se eliminará el rol "${roleToDelete.name}" y sus permisos asociados.`
              : undefined
          }
        />
      </div>
    </TooltipProvider>
  )
}
