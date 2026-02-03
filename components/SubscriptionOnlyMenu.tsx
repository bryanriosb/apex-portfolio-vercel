'use client'

import { AlertTriangle } from 'lucide-react'
import { NavMain } from './NavMain'
import { useCurrentUser } from '@/hooks/use-current-user'
import { SIDE_SYSTEM_MENU_ITEMS } from '@/const/sidebar-menu'

export function SubscriptionOnlyMenu() {
  const { role } = useCurrentUser()

  // Solo mostrar el menú de suscripción para roles permitidos
  const subscriptionOnlyItems = SIDE_SYSTEM_MENU_ITEMS.filter((item) => {
    // Verificar rol
    if (!role || !item.allowedRoles.includes(role)) {
      return false
    }

    // Solo mostrar menú de suscripción
    return item.title === 'Suscripción'
  })

  const finalItems = [...subscriptionOnlyItems]

  return (
    <div className="space-y-4">
      <NavMain items={finalItems} label="Estado de Cuenta" userRole={role} />
      <div className="px-3 py-2">
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
          <p className="text-sm text-destructive font-medium">
            Sin plan activo
          </p>
          <p className="text-xs text-destructive/80 mt-1">
            Tu acceso está restringido. Activa una suscripción para continuar
            usando todas las funciones.
          </p>
        </div>
      </div>
    </div>
  )
}
