'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Pencil, Plus, Trash2 } from 'lucide-react'
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
import {
  PermissionModal,
  type PermissionFormValues,
} from '@/components/access-control/PermissionModal'
import {
  createPermissionAction,
  deletePermissionAction,
  fetchPermissionsAction,
  updatePermissionAction,
} from '@/lib/actions/access-control/permissions'
import { groupPermissionsByEntity } from '@/components/access-control/format'
import { useCurrentUser } from '@/hooks/use-current-user'
import { USER_ROLES } from '@/const/roles'
import type { RbacPermission } from '@/lib/models/access-control/access-control'

export default function PermissionsPage() {
  const { role: userRole } = useCurrentUser()
  const isCompanyAdmin = userRole === USER_ROLES.COMPANY_ADMIN

  const [permissions, setPermissions] = useState<RbacPermission[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedPermission, setSelectedPermission] =
    useState<RbacPermission | null>(null)
  const [permissionToDelete, setPermissionToDelete] =
    useState<RbacPermission | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const loadPermissions = useCallback(async () => {
    setIsLoading(true)
    const result = await fetchPermissionsAction()
    setIsLoading(false)

    if (result.error) {
      toast.error(result.error)
      return
    }
    setPermissions(result.data)
  }, [])

  useEffect(() => {
    loadPermissions()
  }, [loadPermissions])

  // Los permisos reservados a plataforma solo se listan para company_admin:
  // un tenant no puede otorgarlos y pertenecen a otro nivel de gestión.
  const visiblePermissions = useMemo(
    () =>
      isCompanyAdmin
        ? permissions
        : permissions.filter((p) => !isPlatformReservedPermission(p.code)),
    [permissions, isCompanyAdmin]
  )

  const groups = useMemo(
    () => groupPermissionsByEntity(visiblePermissions),
    [visiblePermissions]
  )

  const columnCount = isCompanyAdmin ? 4 : 3

  const handleCreate = () => {
    setSelectedPermission(null)
    setModalOpen(true)
  }

  const handleEdit = (permission: RbacPermission) => {
    setSelectedPermission(permission)
    setModalOpen(true)
  }

  const handleDelete = (permission: RbacPermission) => {
    setPermissionToDelete(permission)
    setDeleteDialogOpen(true)
  }

  const handleSave = async (values: PermissionFormValues) => {
    if (selectedPermission) {
      const result = await updatePermissionAction(selectedPermission.id, {
        description: values.description || null,
      })
      if (result.error) {
        toast.error(result.error)
        throw new Error(result.error)
      }
      toast.success('Permiso actualizado correctamente')
    } else {
      const result = await createPermissionAction({
        code: values.code,
        description: values.description || null,
      })
      if (result.error) {
        toast.error(result.error)
        throw new Error(result.error)
      }
      toast.success('Permiso creado correctamente')
    }

    await loadPermissions()
  }

  const confirmDelete = async () => {
    if (!permissionToDelete) return

    setIsDeleting(true)
    const result = await deletePermissionAction(permissionToDelete.id)
    setIsDeleting(false)
    setDeleteDialogOpen(false)
    setPermissionToDelete(null)

    if (!result.success) {
      toast.error(result.error || 'No se pudo eliminar el permiso')
      return
    }
    toast.success('Permiso eliminado correctamente')
    await loadPermissions()
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6 w-full overflow-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Permisos
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              {isCompanyAdmin
                ? 'Catálogo de permisos de la plataforma'
                : 'Catálogo de permisos de la plataforma (solo lectura)'}
            </p>
          </div>
          {isCompanyAdmin && (
            <Button
              onClick={handleCreate}
              size="sm"
              className="w-full sm:w-auto"
            >
              <Plus className="mr-2 h-4 w-4" />
              Nuevo permiso
            </Button>
          )}
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Acción</TableHead>
                <TableHead className="hidden md:table-cell">
                  Descripción
                </TableHead>
                {isCompanyAdmin && (
                  <TableHead className="text-right">Acciones</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: columnCount }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : visiblePermissions.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columnCount}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No hay permisos en el catálogo
                  </TableCell>
                </TableRow>
              ) : (
                groups.map(({ entity, permissions: entityPermissions }) => (
                  <PermissionGroupRows
                    key={entity}
                    entity={entity}
                    permissions={entityPermissions}
                    columnCount={columnCount}
                    isCompanyAdmin={isCompanyAdmin}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <PermissionModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          permission={selectedPermission}
          onSave={handleSave}
        />

        <ConfirmDeleteDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onConfirm={confirmDelete}
          itemName="permiso"
          isLoading={isDeleting}
          description={
            permissionToDelete
              ? `Esta acción no se puede deshacer. Se eliminará el permiso "${permissionToDelete.code}" del catálogo.`
              : undefined
          }
        />
      </div>
    </TooltipProvider>
  )
}

function PermissionGroupRows({
  entity,
  permissions,
  columnCount,
  isCompanyAdmin,
  onEdit,
  onDelete,
}: {
  entity: string
  permissions: RbacPermission[]
  columnCount: number
  isCompanyAdmin: boolean
  onEdit: (permission: RbacPermission) => void
  onDelete: (permission: RbacPermission) => void
}) {
  return (
    <>
      <TableRow className="bg-muted/50 hover:bg-muted/50">
        <TableCell colSpan={columnCount} className="py-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold capitalize">{entity}</span>
            <Badge variant="outline">{permissions.length}</Badge>
          </div>
        </TableCell>
      </TableRow>
      {permissions.map((permission) => (
        <TableRow key={permission.id}>
          <TableCell>
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
              {permission.code}
            </code>
          </TableCell>
          <TableCell>
            <Badge variant="secondary">{permission.action}</Badge>
          </TableCell>
          <TableCell className="hidden md:table-cell max-w-[320px] truncate text-muted-foreground">
            {permission.description || '—'}
          </TableCell>
          {isCompanyAdmin && (
            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onEdit(permission)}
                    >
                      <Pencil className="h-4 w-4" />
                      <span className="sr-only">Editar</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Editar descripción</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => onDelete(permission)}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Eliminar</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Eliminar</TooltipContent>
                </Tooltip>
              </div>
            </TableCell>
          )}
        </TableRow>
      ))}
    </>
  )
}
