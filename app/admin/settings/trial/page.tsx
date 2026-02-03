'use client'

import { useCurrentUser } from '@/hooks/use-current-user'
import { TrialConfigForm } from '@/components/trial'
import { Loader2, ShieldAlert } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { USER_ROLES } from '@/const/roles'

export default function TrialSettingsPage() {
  const { isLoading, role } = useCurrentUser()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (role !== USER_ROLES.COMPANY_ADMIN) {
    return (
      <div className="flex flex-col gap-6 w-full overflow-auto">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Período de Prueba
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Configuración del período de prueba
          </p>
        </div>
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center gap-4 text-center">
              <ShieldAlert className="h-12 w-12 text-muted-foreground" />
              <div>
                <h2 className="text-lg font-semibold">Acceso restringido</h2>
                <p className="text-muted-foreground">
                  Solo los administradores de la plataforma pueden configurar el período de prueba.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 w-full overflow-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Período de Prueba
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Configura los parámetros del período de prueba para nuevas cuentas
        </p>
      </div>

      <TrialConfigForm />
    </div>
  )
}
