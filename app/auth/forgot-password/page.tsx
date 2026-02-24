'use client'

import * as React from 'react'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import Loading from '@/components/ui/loading'
import { ArrowLeft, Mail, CheckCircle2 } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { sendPasswordResetEmailAction } from '@/lib/actions/auth'
import Logo from '@/components/Logo'

const formSchema = z.object({
  email: z
    .string()
    .min(1, 'El correo electrónico es requerido')
    .email('Ingresa un correo electrónico válido'),
})

type ForgotPasswordSchemaType = z.infer<typeof formSchema>

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = React.useState(false)
  const [isEmailSent, setIsEmailSent] = React.useState(false)
  const [sentEmail, setSentEmail] = React.useState('')

  const form = useForm<ForgotPasswordSchemaType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
    },
  })

  async function onSubmit(values: ForgotPasswordSchemaType) {
    try {
      setIsLoading(true)

      const result = await sendPasswordResetEmailAction(values.email)

      if (!result.success) {
        toast.error(result.error)
        setIsLoading(false)
        return
      }

      setSentEmail(values.email)
      setIsEmailSent(true)
      toast.success('Correo enviado exitosamente')
    } catch (error) {
      toast.error('Ocurrió un error. Por favor, intenta de nuevo.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResend = async () => {
    if (!sentEmail) return

    setIsLoading(true)
    const result = await sendPasswordResetEmailAction(sentEmail)

    if (result.success) {
      toast.success('Correo reenviado exitosamente')
    } else {
      toast.error(result.error)
    }
    setIsLoading(false)
  }

  return (
    <div className="w-full min-h-screen grid md:grid-cols-2">
      {/* Columna izquierda - Formulario */}
      <div className="relative flex items-center justify-center p-6 md:p-8 bg-card">
        <Link href="/" className="absolute top-6 left-6">
          <Logo />
        </Link>

        <div className="w-full max-w-md space-y-6">
          {!isEmailSent ? (
            <>
              <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-bold">Recuperar contraseña</h1>
                <p className="text-balance text-muted-foreground">
                  Ingresa tu correo electrónico y te enviaremos un enlace para
                  restablecer tu contraseña.
                </p>
              </div>

              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Correo electrónico</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="nombre@ejemplo.com"
                            autoComplete="email"
                            disabled={isLoading}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full gap-2"
                    disabled={isLoading}
                  >
                    {isLoading ? <Loading /> : <Mail className="h-4 w-4" />}
                    {isLoading
                      ? 'Enviando...'
                      : 'Enviar enlace de recuperación'}
                  </Button>
                </form>
              </Form>
            </>
          ) : (
            <div className="flex flex-col items-center gap-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>

              <div className="space-y-2">
                <h1 className="text-2xl font-bold">Revisa tu correo</h1>
                <p className="text-muted-foreground">
                  Hemos enviado un enlace de recuperación a:
                </p>
                <p className="font-medium">{sentEmail}</p>
              </div>

              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  Si no ves el correo, revisa tu carpeta de spam o correo no
                  deseado.
                </p>
                <p>El enlace expirará en 1 hora.</p>
              </div>

              <Button
                variant="outline"
                className="gap-2"
                onClick={handleResend}
                disabled={isLoading}
              >
                {isLoading ? <Loading /> : <Mail className="h-4 w-4" />}
                Reenviar correo
              </Button>
            </div>
          )}

          <div className="text-center">
            <Link
              href="/auth/sign-in"
              className="inline-flex items-center gap-2 text-sm font-medium hover:underline underline-offset-4"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver a iniciar sesión
            </Link>
          </div>
        </div>
      </div>

      {/* Columna derecha - Imagen */}
      <div className="relative hidden md:block">
        <div className="absolute inset-0 bg-primary" />
        <div className="relative flex h-full items-center justify-center p-8">
          <div className="space-y-6 text-center">
            <Logo />
            <p className="text-lg text-white drop-shadow-md max-w-sm">
              Gestiona tu negocio de belleza de manera eficiente
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
