'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, KeySquare, Eye, EyeOff, RefreshCw } from 'lucide-react'
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'
import { toast } from 'sonner'
import { activateCustomerAccountAction } from '@/lib/actions/customer-auth'
import BuildTooltip from '../ui/tooltip/build'
import { Checkbox } from '../ui/checkbox'

const formSchema = z.object({
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  send_welcome_email: z.boolean().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface CreateAccessModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customer: {
    id: string
    full_name: string
    emails: string[]
    user_id?: string | null
  } | null
  businessId: string
  onSuccess: () => void
}

function generateRandomPassword(length: number = 12): string {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz'
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const numbers = '0123456789'
  const symbols = '!@#$%^&*'

  const allChars = lowercase + uppercase + numbers + symbols

  let password = ''
  password += lowercase[Math.floor(Math.random() * lowercase.length)]
  password += uppercase[Math.floor(Math.random() * uppercase.length)]
  password += numbers[Math.floor(Math.random() * numbers.length)]
  password += symbols[Math.floor(Math.random() * symbols.length)]

  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)]
  }

  return password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('')
}

export function CreateAccessModal({
  open,
  onOpenChange,
  customer,
  businessId,
  onSuccess,
}: CreateAccessModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      password: '',
      send_welcome_email: true,
    },
  })

  const handleGeneratePassword = () => {
    const newPassword = generateRandomPassword()
    form.setValue('password', newPassword)
  }

  const onSubmit = async (data: FormValues) => {
    if (!customer) return

    setIsSubmitting(true)
    try {
      const result = await activateCustomerAccountAction({
        customerId: customer.id,
        businessId: businessId,
        password: data.password,
        sendWelcomeEmail: data.send_welcome_email,
      })

      if (result.success) {
        toast.success('Cuenta de acceso creada correctamente')
        onSuccess()
        onOpenChange(false)
        form.reset()
      } else {
        toast.error(result.error || 'Error al crear la cuenta de acceso')
      }
    } catch (error: any) {
      toast.error(error.message || 'Error inesperado')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      form.reset()
    }
    onOpenChange(newOpen)
  }

  if (!customer) return null

  // Si ya tiene cuenta, no mostrar el modal
  if (customer.user_id) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeySquare className="h-5 w-5" />
            Crear Acceso
          </DialogTitle>
          <DialogDescription>
            Crear cuenta de acceso para <strong>{customer.full_name}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
          <p>
            <strong>Email:</strong> {customer.emails?.[0] || 'Sin email'}
          </p>
          <p className="mt-1 text-xs">
            El cliente podrá iniciar sesión con este correo electrónico.
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contraseña</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Contraseña del usuario"
                        disabled={isSubmitting}
                        className="pr-20"
                        {...field}
                      />
                      <div className="absolute right-0 top-0 h-full flex items-center gap-1 pr-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2"
                          onClick={handleGeneratePassword}
                          disabled={isSubmitting}
                          title="Generar contraseña aleatoria"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                        </Button>
                        <BuildTooltip
                          content="Ver/Ocultar"
                          trigger={
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() => setShowPassword(!showPassword)}
                              disabled={isSubmitting}
                            >
                              {showPassword ? <EyeOff /> : <Eye />}
                            </Button>
                          }
                        />
                      </div>
                    </div>
                  </FormControl>
                  <FormDescription>
                    Usa el botón <RefreshCw className="h-3 w-3 inline mx-0.5" />{' '}
                    para generar una contraseña aleatoria
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="send_welcome_email"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isSubmitting}
                      className="h-4 w-4 border-gray-300"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="cursor-pointer">
                      Enviar correo de bienvenida con credenciales
                    </FormLabel>
                    <p className="text-xs text-muted-foreground">
                      Se enviará un email al cliente con sus credenciales de acceso
                    </p>
                  </div>
                </FormItem>
              )}
            />

            <DialogFooter className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Crear Acceso
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
