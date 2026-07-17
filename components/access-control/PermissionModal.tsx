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
import { Loader2 } from 'lucide-react'
import type { RbacPermission } from '@/lib/models/access-control/access-control'

export interface PermissionFormValues {
  code: string
  description: string
}

interface PermissionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Permiso a editar; null para crear. Al editar solo cambia la descripción. */
  permission?: RbacPermission | null
  onSave: (values: PermissionFormValues) => Promise<void>
}

export function PermissionModal({
  open,
  onOpenChange,
  permission,
  onSave,
}: PermissionModalProps) {
  const isEdit = !!permission
  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [codeError, setCodeError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setCode(permission?.code ?? '')
      setDescription(permission?.description ?? '')
      setCodeError(null)
    }
  }, [open, permission])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!isEdit && !code.trim()) {
      setCodeError('El código es requerido')
      return
    }

    setIsSubmitting(true)
    try {
      await onSave({ code: code.trim(), description: description.trim() })
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
          <DialogTitle>{isEdit ? 'Editar permiso' : 'Nuevo permiso'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'El código no es editable porque el código de la aplicación lo referencia'
              : 'El código debe coincidir con el enforcement de la aplicación'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="permission-code">
              Código {!isEdit && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id="permission-code"
              placeholder="entidad.accion"
              value={code}
              disabled={isSubmitting || isEdit}
              onChange={(e) => {
                setCode(e.target.value)
                if (codeError) setCodeError(null)
              }}
            />
            {codeError ? (
              <p className="text-sm text-destructive">{codeError}</p>
            ) : (
              !isEdit && (
                <p className="text-xs text-muted-foreground">
                  Formato: entidad.accion (ej: invoices.read) o entidad.* para
                  todas las acciones
                </p>
              )
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="permission-description">Descripción</Label>
            <Textarea
              id="permission-description"
              placeholder="Qué autoriza este permiso..."
              rows={3}
              value={description}
              disabled={isSubmitting}
              onChange={(e) => setDescription(e.target.value)}
            />
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
              {isEdit ? 'Actualizar' : 'Crear'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
