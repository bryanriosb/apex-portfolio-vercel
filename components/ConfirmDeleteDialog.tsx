'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Loader2 } from 'lucide-react'

interface ConfirmDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  title?: string
  description?: string
  itemName?: string
  count?: number
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'filled' | 'outline'
  isLoading?: boolean
}

export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  itemName = 'elemento',
  count = 1,
  confirmLabel,
  cancelLabel = 'Cancelar',
  variant = 'filled',
  isLoading = false,
}: ConfirmDeleteDialogProps) {
  const isBatch = count > 1

  const defaultTitle = isBatch
    ? `¿Eliminar ${count} ${itemName}(s)?`
    : '¿Estás seguro?'

  const defaultDescription = isBatch
    ? `Esta acción no se puede deshacer. Esto eliminará permanentemente los ${count} ${itemName}(s) seleccionados y todos sus datos asociados.`
    : `Esta acción no se puede deshacer. Esto eliminará permanentemente el ${itemName} y todos sus datos asociados.`

  const defaultConfirmLabel = isBatch ? `Eliminar ${count}` : 'Eliminar'

  const actionClassName =
    variant === 'filled'
      ? 'bg-destructive text-white hover:bg-destructive/90'
      : 'border border-destructive bg-transparent text-destructive hover:text-white hover:bg-destructive/90'

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title || defaultTitle}</AlertDialogTitle>
          <AlertDialogDescription>
            {description || defaultDescription}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              onConfirm()
            }}
            className={actionClassName}
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmLabel || defaultConfirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
