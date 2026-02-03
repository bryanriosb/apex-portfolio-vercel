'use client'

import { AlertTriangle, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import Link from 'next/link'

interface SubscriptionBlockedScreenProps {
  reason: string
}

export function SubscriptionBlockedScreen({ reason }: SubscriptionBlockedScreenProps) {
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6">
      <Card className="max-w-lg w-full text-center">
        <CardHeader>
          <div className="mx-auto mb-4 p-4 bg-red-100 rounded-full">
            <AlertTriangle className="h-10 w-10 text-red-600" />
          </div>
          <CardTitle className="text-2xl">Acceso Restringido</CardTitle>
          <CardDescription className="text-base mt-2">
            {reason}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
            <p>
              Para continuar utilizando todas las funcionalidades de la plataforma,
              es necesario tener una suscripción activa.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Button asChild size="lg" className="w-full">
              <Link href="/admin/suscription">
                <CreditCard className="mr-2 h-5 w-5" />
                Ver Planes y Suscribirse
              </Link>
            </Button>

            <Button asChild variant="outline" size="lg" className="w-full">
              <Link href="/admin">
                Volver al Inicio
              </Link>
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Si crees que esto es un error, por favor contacta a soporte.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
