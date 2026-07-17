'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Loader2, KeyRound } from 'lucide-react'
import { fetchPermissionsAction } from '@/lib/actions/access-control/permissions'
import {
  getRolePermissionsAction,
  setRolePermissionsAction,
} from '@/lib/actions/access-control/roles'
import { groupPermissionsByEntity } from '@/components/access-control/format'
import {
  isPlatformReservedPermission,
  type RbacRole,
  type RbacPermission,
} from '@/lib/models/access-control/access-control'
import { useCurrentUser } from '@/hooks/use-current-user'
import { USER_ROLES } from '@/const/roles'

interface RolePermissionsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  role: RbacRole | null
  /** Solo lectura (roles del sistema o globales sin permiso de gestión). */
  readOnly?: boolean
  /** Se invoca tras guardar para refrescar el listado de roles. */
  onSaved?: () => void
}

export function RolePermissionsModal({
  open,
  onOpenChange,
  role,
  readOnly = false,
  onSaved,
}: RolePermissionsModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [catalog, setCatalog] = useState<RbacPermission[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())

  // business_admin es super-usuario de su cuenta, pero los permisos de
  // plataforma no son otorgables por un tenant (el servidor lo revalida).
  const { role: currentUserRole } = useCurrentUser()
  const canGrantPlatform = currentUserRole === USER_ROLES.COMPANY_ADMIN
  const isReservedForSession = (permission: RbacPermission) =>
    !canGrantPlatform && isPlatformReservedPermission(permission.code)

  const loadData = useCallback(async () => {
    if (!role) return

    setIsLoading(true)
    const [catalogResult, currentResult] = await Promise.all([
      fetchPermissionsAction(),
      getRolePermissionsAction(role.id),
    ])
    setIsLoading(false)

    if (catalogResult.error) {
      toast.error(catalogResult.error)
      return
    }
    if (currentResult.error) {
      toast.error(currentResult.error)
      return
    }

    setCatalog(catalogResult.data)
    setSelected(new Set(currentResult.data.map((p) => p.id)))
  }, [role])

  useEffect(() => {
    if (open && role) {
      loadData()
    }
  }, [open, role, loadData])

  const groups = useMemo(() => groupPermissionsByEntity(catalog), [catalog])

  const togglePermission = (permissionId: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) next.add(permissionId)
      else next.delete(permissionId)
      return next
    })
  }

  const toggleGroup = (permissions: RbacPermission[], checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev)
      for (const permission of permissions) {
        if (checked) next.add(permission.id)
        else next.delete(permission.id)
      }
      return next
    })
  }

  const groupState = (
    permissions: RbacPermission[]
  ): boolean | 'indeterminate' => {
    const selectedCount = permissions.filter((p) => selected.has(p.id)).length
    if (selectedCount === 0) return false
    if (selectedCount === permissions.length) return true
    return 'indeterminate'
  }

  const handleSave = async () => {
    if (!role) return

    setIsSaving(true)
    const result = await setRolePermissionsAction(role.id, Array.from(selected))
    setIsSaving(false)

    if (result.error) {
      toast.error(result.error)
      return
    }

    toast.success('Permisos del rol actualizados correctamente')
    onSaved?.()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-4 w-4" />
            Permisos del rol
          </DialogTitle>
          <DialogDescription>
            {role
              ? readOnly
                ? `Permisos de "${role.name}" (solo lectura)`
                : `Selecciona los permisos que otorga el rol "${role.name}"`
              : 'Cargando...'}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : catalog.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No hay permisos en el catálogo
          </p>
        ) : (
          <>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {selected.size} de {catalog.length} permiso(s) seleccionado(s)
              </span>
            </div>
            <ScrollArea className="max-h-[50vh] pr-4">
              <div className="space-y-4">
                {groups.map(({ entity, permissions }, index) => (
                  <div key={entity} className="space-y-2">
                    {index > 0 && <Separator />}
                    <div className="flex items-center gap-2 pt-1">
                      <Checkbox
                        id={`entity-${entity}`}
                        checked={groupState(permissions)}
                        disabled={
                          readOnly ||
                          permissions.every((p) => isReservedForSession(p))
                        }
                        onCheckedChange={(checked) =>
                          toggleGroup(
                            permissions.filter((p) => !isReservedForSession(p)),
                            checked === true
                          )
                        }
                      />
                      <Label
                        htmlFor={`entity-${entity}`}
                        className="text-sm font-semibold capitalize cursor-pointer"
                      >
                        {entity}
                      </Label>
                      <Badge variant="outline" className="ml-auto">
                        {permissions.filter((p) => selected.has(p.id)).length}/
                        {permissions.length}
                      </Badge>
                    </div>
                    <div className="space-y-2 pl-6">
                      {permissions.map((permission) => (
                        <div
                          key={permission.id}
                          className="flex items-start gap-2"
                        >
                          <Checkbox
                            id={`perm-${permission.id}`}
                            checked={selected.has(permission.id)}
                            disabled={readOnly || isReservedForSession(permission)}
                            onCheckedChange={(checked) =>
                              togglePermission(permission.id, checked === true)
                            }
                          />
                          <div className="grid gap-0.5 leading-none">
                            <Label
                              htmlFor={`perm-${permission.id}`}
                              className="cursor-pointer"
                            >
                              <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                                {permission.code}
                              </code>
                              {isReservedForSession(permission) && (
                                <Badge
                                  variant="secondary"
                                  className="ml-2 text-[10px] align-middle"
                                >
                                  Plataforma
                                </Badge>
                              )}
                            </Label>
                            {permission.description && (
                              <p className="text-xs text-muted-foreground">
                                {permission.description}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            {readOnly ? 'Cerrar' : 'Cancelar'}
          </Button>
          {!readOnly && (
            <Button onClick={handleSave} disabled={isSaving || isLoading}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
