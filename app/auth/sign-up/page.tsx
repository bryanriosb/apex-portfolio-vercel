import Link from 'next/link'
import { SignUpForm } from '@/components/auth/SignUpForm'
import { FieldDescription } from '@/components/ui/field'
import Logo from '@/components/Logo'
import { AuthSidePanel } from '@/components/auth/AuthSidePanel'

export default function SignUpPage() {
  return (
    <div className="w-full min-h-screen grid md:grid-cols-2">
      {/* Columna izquierda - Formulario */}
      <div className="relative flex items-center justify-center p-6 md:p-8 bg-card">
        <Link href="/" className="absolute top-6 left-6">
          <Logo />
        </Link>

        <div className="w-full max-w-md space-y-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold">Crea tu cuenta</h1>
            <p className="text-balance text-muted-foreground">
              Comienza a gestionar de forma inteligente tu negocio
            </p>
          </div>

          <SignUpForm />

          <div className="text-center text-sm">
            ¿Ya tienes una cuenta?{' '}
            <Link
              href="/auth/sign-in"
              className="font-medium underline underline-offset-4"
            >
              Inicia sesión
            </Link>
          </div>

          <FieldDescription className="text-center">
            Al continuar, aceptas nuestros{' '}
            <a href="#" className="underline underline-offset-4">
              Términos de Servicio
            </a>{' '}
            y{' '}
            <a href="#" className="underline underline-offset-4">
              Política de Privacidad
            </a>
            .
          </FieldDescription>
        </div>
      </div>

      <AuthSidePanel mode="sign-up" />
    </div>
  )
}
