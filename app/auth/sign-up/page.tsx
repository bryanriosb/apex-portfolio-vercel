import Image from 'next/image'
import Link from 'next/link'
import { SignUpForm } from '@/components/auth/SignUpForm'
import { FieldDescription } from '@/components/ui/field'

export default function SignUpPage() {
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
            <h1 className="text-2xl font-bold">Crea tu cuenta</h1>
            <p className="text-balance text-muted-foreground">
              Comienza a gestionar tu negocio de belleza
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
