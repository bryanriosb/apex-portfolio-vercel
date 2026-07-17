'use client'

import { useEffect, useState } from 'react'
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
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Loader2 } from 'lucide-react'
import type { RbacRole } from '@/lib/models/access-control/access-control'

export interface RoleFormValues {
  name: string
  description: string
  isGlobal: boolean
}

interface RoleModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Rol a editar; null para crear. */
  role?: RbacRole | null
  /** Muestra el switch "Rol global" (solo company_admin al crear). */
  showGlobalSwitch?: boolean
  onSave: (values: RoleFormValues) => Promise<void>
}

export function RoleModal({
  open,
  onOpenChange,
  role,
  showGlobalSwitch = false,
  onSave,
}: RoleModalProps) {
  const isEdit = !!role
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isGlobal, setIsGlobal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setName(role?.name ?? '')
      setDescription(role?.description ?? '')
      setIsGlobal(false)
      setNameError(null)
    }
  }, [open, role])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!name.trim()) {
      setNameError('El nombre es requerido')
      return
    }

    setIsSubmitting(true)
    try {
      await onSave({ name: name.trim(), description: description.trim(), isGlobal })
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
          <DialogTitle>{isEdit ? 'Editar rol' : 'Nuevo rol'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Actualiza el nombre y la descripción del rol'
              : 'Define un rol para agrupar permisos y asignarlo a usuarios'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="role-name">
              Nombre <span className="text-destructive">*</span>
            </Label>
            <Input
              id="role-name"
              placeholder="Ej: Supervisor de cobranza"
              value={name}
              disabled={isSubmitting}
              onChange={(e) => {
                setName(e.target.value)
                if (nameError) setNameError(null)
              }}
            />
            {nameError && (
              <p className="text-sm text-destructive">{nameError}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="role-description">Descripción</Label>
            <Textarea
              id="role-description"
              placeholder="Qué puede hacer este rol..."
              rows={3}
              value={description}
              disabled={isSubmitting}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {showGlobalSwitch && !isEdit && (
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="role-global">Rol global</Label>
                <p className="text-xs text-muted-foreground">
                  Disponible para todas las cuentas de la plataforma
                </p>
              </div>
              <Switch
                id="role-global"
                checked={isGlobal}
                disabled={isSubmitting}
                onCheckedChange={setIsGlobal}
              />
            </div>
          )}

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
              {isEdit ? 'Actualizar' : 'Crear'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
