'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, UserRoundCog } from 'lucide-react'
import { toast } from 'sonner'
import { createMemberWithAccountAction } from '@/lib/actions/business-account'

const formSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email({ message: 'Email inválido' }),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  role: z.enum(['business_monitor', 'business_admin'] as const),
})

type CreateMemberFormValues = z.infer<typeof formSchema>

interface CreateMemberModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  accountId: string
  onMemberCreated: () => void
  contactName?: string
  contactEmail?: string
}

export function CreateMemberModal({
  open,
  onOpenChange,
  accountId,
  onMemberCreated,
  contactName,
  contactEmail,
}: CreateMemberModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<CreateMemberFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      role: 'business_monitor',
    },
  })

  const handleUseContactData = () => {
    if (contactName && contactEmail) {
      form.setValue('name', contactName)
      form.setValue('email', contactEmail)
      toast.success('Datos del contacto cargados')
    }
  }

  const onSubmit = async (data: CreateMemberFormValues) => {
    setIsSubmitting(true)
    try {
      const result = await createMemberWithAccountAction({
        name: data.name,
        email: data.email,
        password: data.password,
        role: data.role,
        accountId,
      })

      if (!result.success) {
        toast.error(result.error || 'Error al crear el usuario')
        return
      }

      toast.success(`Usuario ${data.name} creado exitosamente`)
      onMemberCreated()
      onOpenChange(false)
      form.reset()
    } catch (error: any) {
      toast.error(error.message || 'Error al crear el usuario')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Crear Miembro</DialogTitle>
          <DialogDescription>
            Crea un nuevo usuario y agrégalo a esta cuenta de negocio
          </DialogDescription>
        </DialogHeader>

        {contactName && contactEmail && (
          <div className="flex items-center gap-2 rounded-md bg-muted p-3">
            <UserRoundCog className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1 text-sm">
              <p className="font-medium">Contacto de la cuenta disponible</p>
              <p className="text-xs text-muted-foreground">
                {contactName} ({contactEmail})
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleUseContactData}
              disabled={isSubmitting}
            >
              Usar datos
            </Button>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Nombre Completo <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Juan Pérez"
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Email <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="usuario@ejemplo.com"
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Contraseña <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="••••••"
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>Mínimo 6 caracteres</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Rol <span className="text-destructive">*</span>
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecciona un rol" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="business_monitor">Miembro</SelectItem>
                      <SelectItem value="business_admin">
                        Administrador
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {field.value === 'business_admin'
                      ? 'Los administradores pueden gestionar la cuenta y sus miembros'
                      : 'Los miembros tienen acceso básico a la cuenta'}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Crear Usuario
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
