'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Loader2 } from 'lucide-react'
import type {
  AgentLink,
  AgentLinkInsert,
  AgentLinkUpdate,
} from '@/lib/models/ai-conversation'

const formSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  type: z.enum(['single_use', 'multi_use', 'time_limited', 'minute_limited']),
  max_uses: z.number().nullable(),
  max_minutes: z.number().nullable(),
  expires_at: z.string().nullable(),
  assistant_name: z.string().optional(),
  welcome_message: z.string().optional(),
  require_phone_verification: z.boolean(),
})

type FormData = z.infer<typeof formSchema>

interface AgentLinkModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  link: AgentLink | null
  businessId: string
  onSave: (data: AgentLinkInsert | AgentLinkUpdate) => Promise<void>
}

export function AgentLinkModal({
  open,
  onOpenChange,
  link,
  businessId,
  onSave,
}: AgentLinkModalProps) {
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      name: '',
      type: 'multi_use',
      max_uses: null,
      max_minutes: null,
      expires_at: null,
      assistant_name: '',
      welcome_message: '',
      require_phone_verification: false,
    },
  })

  const linkType = watch('type')

  useEffect(() => {
    if (link) {
      reset({
        name: link.name,
        type: link.type,
        max_uses: link.max_uses,
        max_minutes: link.max_minutes,
        expires_at: link.expires_at ? link.expires_at.split('T')[0] : null,
        assistant_name: link.settings?.assistant_name || '',
        welcome_message: link.settings?.welcome_message || '',
        require_phone_verification:
          link.settings?.require_phone_verification || false,
      })
    } else {
      reset({
        name: '',
        type: 'multi_use',
        max_uses: null,
        max_minutes: null,
        expires_at: null,
        assistant_name: '',
        welcome_message: '',
        require_phone_verification: false,
      })
    }
  }, [link, reset])

  const onSubmit = async (data: FormData) => {
    setIsLoading(true)
    try {
      const payload: AgentLinkInsert | AgentLinkUpdate = {
        name: data.name,
        type: data.type,
        max_uses:
          data.type === 'multi_use' || data.type === 'single_use'
            ? data.max_uses
            : null,
        max_minutes: data.type === 'minute_limited' ? data.max_minutes : null,
        expires_at:
          data.type === 'time_limited' && data.expires_at
            ? new Date(data.expires_at).toISOString()
            : null,
        settings: {
          assistant_name: data.assistant_name || undefined,
          welcome_message: data.welcome_message || undefined,
          require_phone_verification: data.require_phone_verification,
        },
      }

      if (!link) {
        ;(payload as AgentLinkInsert).business_id = businessId
      }

      await onSave(payload)
      onOpenChange(false)
    } catch (error) {
      console.error('Error saving link:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {link ? 'Editar Enlace' : 'Crear Enlace de Agente'}
          </DialogTitle>
          <DialogDescription>
            Configura un enlace para compartir el asistente virtual con tus
            clientes.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre del enlace</Label>
            <Input
              id="name"
              placeholder="Ej: Enlace WhatsApp, Enlace Web"
              {...register('name')}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="assistant_name">
              Nombre del asistente (opcional)
            </Label>
            <Input
              id="assistant_name"
              placeholder="Ej: Ana, Sofía, etc."
              {...register('assistant_name')}
            />
            <p className="text-xs text-muted-foreground">
              Este nombre se mostrará en el chat y el agente se presentará con
              él
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Tipo de enlace</Label>
            <Select
              value={linkType}
              onValueChange={(value) =>
                setValue('type', value as FormData['type'])
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecciona el tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single_use">Un solo uso</SelectItem>
                <SelectItem value="multi_use">Múltiples usos</SelectItem>
                <SelectItem value="time_limited">
                  Con fecha de expiración
                </SelectItem>
                <SelectItem value="minute_limited">
                  Con límite de minutos
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {linkType === 'multi_use' && (
            <div className="space-y-2">
              <Label htmlFor="max_uses">Máximo de usos (opcional)</Label>
              <Input
                id="max_uses"
                type="number"
                min="1"
                placeholder="Sin límite"
                {...register('max_uses', { valueAsNumber: true })}
              />
            </div>
          )}

          {linkType === 'minute_limited' && (
            <div className="space-y-2">
              <Label htmlFor="max_minutes">Minutos máximos</Label>
              <Input
                id="max_minutes"
                type="number"
                min="1"
                placeholder="Ej: 60"
                {...register('max_minutes', { valueAsNumber: true })}
              />
            </div>
          )}

          {linkType === 'time_limited' && (
            <div className="space-y-2">
              <Label htmlFor="expires_at">Fecha de expiración</Label>
              <Input id="expires_at" type="date" {...register('expires_at')} />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="welcome_message">
              Mensaje de bienvenida (opcional)
            </Label>
            <Textarea
              id="welcome_message"
              placeholder="Hola! Soy el asistente virtual..."
              rows={3}
              {...register('welcome_message')}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="require_phone">Verificar teléfono</Label>
              <p className="text-sm text-muted-foreground">
                Solicitar teléfono antes de iniciar
              </p>
            </div>
            <Switch
              id="require_phone"
              checked={watch('require_phone_verification')}
              onCheckedChange={(checked) =>
                setValue('require_phone_verification', checked)
              }
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {link ? 'Guardar cambios' : 'Crear enlace'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
