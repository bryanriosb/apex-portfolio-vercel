'use client'

import * as React from 'react'
import { Suspense } from 'react'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useRouter, useSearchParams } from 'next/navigation'
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
import { KeyRound, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { updatePasswordAction } from '@/lib/actions/auth'

const formSchema = z
  .object({
    password: z
      .string()
      .min(8, 'La contraseña debe tener al menos 8 caracteres')
      .max(50, 'La contraseña no puede tener más de 50 caracteres')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'La contraseña debe contener al menos una mayúscula, una minúscula y un número'
      ),
    confirmPassword: z.string().min(1, 'Confirma tu contraseña'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  })

type ResetPasswordSchemaType = z.infer<typeof formSchema>

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordLoading />}>
      <ResetPasswordContent />
    </Suspense>
  )
}

function ResetPasswordLoading() {
  return (
    <div className="w-full min-h-screen flex items-center justify-center">
      <Loading className="h-8 w-8" />
    </div>
  )
}

function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = React.useState(false)
  const [isSuccess, setIsSuccess] = React.useState(false)
  const [isError, setIsError] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState('')
  const [showPassword, setShowPassword] = React.useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false)

  // Obtener tokens del hash del URL (Supabase los pone en el fragment)
  const [tokens, setTokens] = React.useState<{
    accessToken: string | null
    refreshToken: string | null
  }>({ accessToken: null, refreshToken: null })

  React.useEffect(() => {
    // Supabase pone los tokens en el hash del URL
    const hash = window.location.hash
    if (hash) {
      const params = new URLSearchParams(hash.substring(1))
      const accessToken = params.get('access_token')
      const refreshToken = params.get('refresh_token')
      const error = params.get('error')
      const errorDescription = params.get('error_description')

      if (error) {
        setIsError(true)
        setErrorMessage(
          errorDescription ||
            'El enlace de recuperación es inválido o ha expirado.'
        )
        return
      }

      if (accessToken && refreshToken) {
        setTokens({ accessToken, refreshToken })
      } else {
        setIsError(true)
        setErrorMessage('El enlace de recuperación es inválido o ha expirado.')
      }
    } else {
      // Verificar si hay parámetros de error en la URL
      const error = searchParams.get('error')
      if (error) {
        setIsError(true)
        setErrorMessage('El enlace de recuperación es inválido o ha expirado.')
      }
    }
  }, [searchParams])

  const form = useForm<ResetPasswordSchemaType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  })

  async function onSubmit(values: ResetPasswordSchemaType) {
    if (!tokens.accessToken || !tokens.refreshToken) {
      toast.error('El enlace de recuperación es inválido')
      return
    }

    try {
      setIsLoading(true)

      const result = await updatePasswordAction(
        values.password,
        tokens.accessToken,
        tokens.refreshToken
      )

      if (!result.success) {
        toast.error(result.error)
        setIsLoading(false)
        return
      }

      setIsSuccess(true)
      toast.success('Contraseña actualizada exitosamente')

      // Redirigir al login después de unos segundos
      setTimeout(() => {
        router.push('/auth/sign-in')
      }, 3000)
    } catch (error) {
      toast.error('Ocurrió un error. Por favor, intenta de nuevo.')
    } finally {
      setIsLoading(false)
    }
  }

  // Mostrar error si el enlace es inválido
  if (isError) {
    return (
      <div className="w-full min-h-screen grid md:grid-cols-2">
        <div className="relative flex items-center justify-center p-6 md:p-8 bg-card">
          <Link href="/" className="absolute top-6 left-6">
            <Image
              src="/logo.png"
              alt="Beluvio"
              width={120}
              height={36}
              priority
            />
          </Link>

          <div className="w-full max-w-md space-y-6">
            <div className="flex flex-col items-center gap-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>

              <div className="space-y-2">
                <h1 className="text-2xl font-bold">Enlace inválido</h1>
                <p className="text-muted-foreground">{errorMessage}</p>
              </div>

              <Link href="/auth/forgot-password">
                <Button className="gap-2">
                  <KeyRound className="h-4 w-4" />
                  Solicitar nuevo enlace
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Columna derecha - Imagen */}
        <div className="relative hidden md:block">
          <Image
            src="/V0d4HpVHLp-beluvio.jpg"
            alt="Beauty salon"
            className="absolute inset-0 h-full w-full object-cover"
            fill
          />
          <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-secondary/30" />
        </div>
      </div>
    )
  }

  return (
    <div className="w-full min-h-screen grid md:grid-cols-2">
      {/* Columna izquierda - Formulario */}
      <div className="relative flex items-center justify-center p-6 md:p-8 bg-card">
        <Link href="/" className="absolute top-6 left-6">
          <Image
            src="/logo.png"
            alt="Beluvio"
            width={120}
            height={36}
            priority
          />
        </Link>

        <div className="w-full max-w-md space-y-6">
          {!isSuccess ? (
            <>
              <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-bold">Crear nueva contraseña</h1>
                <p className="text-balance text-muted-foreground">
                  Ingresa tu nueva contraseña. Asegúrate de que sea segura y
                  fácil de recordar.
                </p>
              </div>

              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nueva contraseña</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showPassword ? 'text' : 'password'}
                              placeholder="••••••••"
                              autoComplete="new-password"
                              disabled={isLoading}
                              {...field}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <Eye className="h-4 w-4 text-muted-foreground" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirmar contraseña</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showConfirmPassword ? 'text' : 'password'}
                              placeholder="••••••••"
                              autoComplete="new-password"
                              disabled={isLoading}
                              {...field}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              onClick={() =>
                                setShowConfirmPassword(!showConfirmPassword)
                              }
                            >
                              {showConfirmPassword ? (
                                <EyeOff className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <Eye className="h-4 w-4 text-muted-foreground" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>La contraseña debe contener:</p>
                    <ul className="list-disc list-inside space-y-0.5">
                      <li>Al menos 8 caracteres</li>
                      <li>Una letra mayúscula</li>
                      <li>Una letra minúscula</li>
                      <li>Un número</li>
                    </ul>
                  </div>

                  <Button
                    type="submit"
                    className="w-full gap-2"
                    disabled={isLoading || !tokens.accessToken}
                  >
                    {isLoading ? <Loading /> : <KeyRound className="h-4 w-4" />}
                    {isLoading ? 'Actualizando...' : 'Actualizar contraseña'}
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
                <h1 className="text-2xl font-bold">¡Contraseña actualizada!</h1>
                <p className="text-muted-foreground">
                  Tu contraseña ha sido actualizada exitosamente. Serás
                  redirigido al inicio de sesión en unos segundos.
                </p>
              </div>

              <Link href="/auth/sign-in">
                <Button className="gap-2">Ir a iniciar sesión</Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Columna derecha - Imagen */}
      <div className="relative hidden md:block">
        <Image
          src="/V0d4HpVHLp-beluvio.jpg"
          alt="Beauty salon"
          className="absolute inset-0 h-full w-full object-cover"
          fill
        />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-secondary/30" />
        <div className="relative flex h-full items-center justify-center p-8">
          <div className="space-y-6 text-center">
            <Image
              src="/logo.png"
              alt="Beluvio"
              width={200}
              height={60}
              className="mx-auto drop-shadow-lg brightness-0 invert"
            />
            <p className="text-lg text-white drop-shadow-md max-w-sm">
              Gestiona tu negocio de belleza de manera eficiente
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
