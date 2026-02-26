'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import {
  NotificationThresholdService,
  TemplateService,
} from '@/lib/services/collection'
import type { NotificationThreshold } from '@/lib/models/collection/notification-threshold'
import type { CollectionTemplate } from '@/lib/models/collection'

interface ThresholdFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  threshold: NotificationThreshold | null
  businessId: string
  businessAccountId: string
  onSuccess: () => void
}

export function ThresholdFormDialog({
  open,
  onOpenChange,
  threshold,
  businessId,
  businessAccountId,
  onSuccess,
}: ThresholdFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [templates, setTemplates] = useState<CollectionTemplate[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    days_from: 0,
    days_to: '',
    email_template_id: '',
  })

  // Load templates when dialog opens
  useEffect(() => {
    if (open && businessAccountId) {
      loadTemplates()
    }
  }, [open, businessAccountId])

  // Set form values when editing
  useEffect(() => {
    if (threshold) {
      setFormData({
        name: threshold.name,
        description: threshold.description || '',
        days_from: threshold.days_from,
        days_to: threshold.days_to?.toString() || '',
        email_template_id: threshold.email_template_id,
      })
    } else {
      setFormData({
        name: '',
        description: '',
        days_from: 0,
        days_to: '',
        email_template_id: '',
      })
    }
  }, [threshold])

  const loadTemplates = async () => {
    setLoadingTemplates(true)
    try {
      const result = await TemplateService.fetchItems({
        business_account_id: businessAccountId,
        template_type: 'email',
        is_active: true,
        page_size: 100,
      })
      setTemplates(result.data)
    } catch (error) {
      console.error('Error loading templates:', error)
      toast.error('Error al cargar las plantillas')
    } finally {
      setLoadingTemplates(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Validation
      if (!formData.name.trim()) {
        toast.error('El nombre es requerido')
        return
      }
      if (!formData.email_template_id) {
        toast.error('La plantilla es requerida')
        return
      }

      const payload = {
        business_id: businessId,
        name: formData.name.trim(),
        description: formData.description?.trim() || null,
        days_from: Number(formData.days_from),
        days_to: formData.days_to ? Number(formData.days_to) : undefined,
        email_template_id: formData.email_template_id,
        is_active: true,
        display_order: 0,
      }

      if (threshold) {
        // Update existing
        await NotificationThresholdService.updateThreshold(
          threshold.id,
          payload,
          businessId
        )
        toast.success('Umbral actualizado correctamente')
      } else {
        // Create new
        await NotificationThresholdService.createThreshold(payload)
        toast.success('Umbral creado correctamente')
      }

      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      console.error('Error saving threshold:', error)
      toast.error(error.message || 'Error al guardar el umbral')
    } finally {
      setIsSubmitting(false)
      setFormData({
        name: '',
        description: '',
        days_from: 0,
        days_to: '',
        email_template_id: '',
      })
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {threshold ? 'Editar Umbral' : 'Nuevo Umbral'}
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Los umbrales definen rangos de días de mora y determinan qué plantilla de correo 
            se enviará automáticamente a cada cliente según su antigüedad de deuda. 
            Configure el nombre identificativo, el rango de días y la plantilla asociada.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              Nombre <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              placeholder="Ej: Recordatorio 30-60 días"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">
              Descripción <span className="text-muted-foreground text-xs">(Opcional)</span>
            </Label>
            <Textarea
              id="description"
              placeholder="Descripción opcional del umbral..."
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              disabled={isSubmitting}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="days_from">Desde (días)</Label>
              <Input
                id="days_from"
                type="number"
                min={0}
                value={formData.days_from}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    days_from: parseInt(e.target.value) || 0,
                  })
                }
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="days_to">Hasta (días)</Label>
              <Input
                id="days_to"
                type="number"
                min={0}
                placeholder="Sin límite"
                value={formData.days_to}
                onChange={(e) =>
                  setFormData({ ...formData, days_to: e.target.value })
                }
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Plantilla de Email</Label>
            <Select
              value={formData.email_template_id}
              onValueChange={(value) =>
                setFormData({ ...formData, email_template_id: value })
              }
              disabled={isSubmitting || loadingTemplates}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar plantilla..." />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? 'Guardando...'
                : threshold
                  ? 'Actualizar'
                  : 'Crear'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
