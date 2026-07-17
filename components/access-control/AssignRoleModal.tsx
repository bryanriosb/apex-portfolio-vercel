'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { Loader2 } from 'lucide-react'
import type {
  AccountMember,
  RbacRole,
} from '@/lib/models/access-control/access-control'

export interface AssignRoleValues {
  roleId: string
  /** ISO string o null si no expira. */
  expiresAt: string | null
}

interface AssignRoleModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  member: AccountMember | null
  roles: RbacRole[]
  onAssign: (values: AssignRoleValues) => Promise<void>
}

export function AssignRoleModal({
  open,
  onOpenChange,
  member,
  roles,
  onAssign,
}: AssignRoleModalProps) {
  const [roleId, setRoleId] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [roleError, setRoleError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setRoleId('')
      setExpiresAt('')
      setRoleError(null)
    }
  }, [open])

  const assignedRoleIds = useMemo(
    () => new Set((member?.roles ?? []).map((r) => r.role_id)),
    [member]
  )

  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!roleId) {
      setRoleError('Selecciona un rol')
      return
    }

    setIsSubmitting(true)
    try {
      await onAssign({
        roleId,
        // La expiración aplica hasta el final del día seleccionado.
        expiresAt: expiresAt
          ? new Date(`${expiresAt}T23:59:59`).toISOString()
          : null,
      })
      onOpenChange(false)
    } catch {
      // El error ya se notificó con toast; el modal permanece abierto.
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Asignar rol</DialogTitle>
          <DialogDescription>
            {member
              ? `Otorga un rol RBAC a ${member.name || member.email}`
              : 'Selecciona un miembro'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="assign-role">
              Rol <span className="text-destructive">*</span>
            </Label>
            <Select
              value={roleId}
              disabled={isSubmitting}
              onValueChange={(value) => {
                setRoleId(value)
                if (roleError) setRoleError(null)
              }}
            >
              <SelectTrigger id="assign-role" className="w-full">
                <SelectValue placeholder="Selecciona un rol" />
              </SelectTrigger>
              <SelectContent>
                {roles.length === 0 ? (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    No hay roles disponibles
                  </div>
                ) : (
                  roles.map((role) => (
                    <SelectItem
                      key={role.id}
                      value={role.id}
                      disabled={assignedRoleIds.has(role.id)}
                    >
                      {role.name}
                      {assignedRoleIds.has(role.id) ? ' (ya asignado)' : ''}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {roleError && <p className="text-sm text-destructive">{roleError}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="assign-expires">Fecha de expiración (opcional)</Label>
            <Input
              id="assign-expires"
              type="date"
              min={today}
              value={expiresAt}
              disabled={isSubmitting}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Si se define, el rol se otorga hasta el final de ese día
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Asignar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
