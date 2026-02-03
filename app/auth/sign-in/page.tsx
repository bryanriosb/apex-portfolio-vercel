'use client'

import * as React from 'react'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
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
import { FieldDescription } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import Loading from '@/components/ui/loading'
import { LogIn } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

const formSchema = z.object({
  username: z
    .string()
    .min(1, 'El correo electrónico es requerido')
    .email('Ingresa un correo electrónico válido'),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(50),
})

type SignInSchemaType = z.infer<typeof formSchema>

export default function SignInPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = React.useState(false)

  const form = useForm<SignInSchemaType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  })

  async function onSubmit(values: SignInSchemaType) {
    try {
      setIsLoading(true)

      const result = await signIn('credentials', {
        username: values.username,
        password: values.password,
        redirect: false,
      })

      if (!result?.ok) {
        toast.error('Credenciales inválidas.')
        setIsLoading(false)
        return
      }

      toast.success('Auténticacion exitosa')
      setTimeout(() => {
        console.log('Redirecting to /admin')
        router.push('/admin')
      }, 2000)
    } catch (error) {
      toast.error('Ocurrió un error. Por favor, intenta de nuevo.')
      setIsLoading(false)
    }
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
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold">Bienvenido de vuelta</h1>
            <p className="text-balance text-muted-foreground">
              Inicia sesión en tu cuenta
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
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

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Contraseña</FormLabel>
                      <Link
                        href="/auth/forgot-password"
                        className="text-sm underline-offset-2 hover:underline"
                      >
                        ¿Olvidaste tu contraseña?
                      </Link>
                    </div>
                    <FormControl>
                      <Input
                        type="password"
                        autoComplete="current-password"
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
                {isLoading ? <Loading className="text-white" /> : <LogIn />}
                {isLoading ? 'Iniciando sesión' : 'Iniciar sesión'}
              </Button>
            </form>
          </Form>

          <div className="text-center text-sm">
            ¿No tienes una cuenta?{' '}
            <Link
              href="/auth/sign-up"
              className="font-medium underline underline-offset-4"
            >
              Regístrate
            </Link>
          </div>

          <FieldDescription className="text-center">
            Al continuar, aceptas nuestros{' '}
            <Link href="/terminos" className="underline underline-offset-4">
              Términos de Servicio
            </Link>{' '}
            y{' '}
            <Link href="/privacidad" className="underline underline-offset-4">
              Política de Privacidad
            </Link>
            .
          </FieldDescription>
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
