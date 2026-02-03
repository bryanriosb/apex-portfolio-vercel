'use client'

import Link from 'next/link'
import { useSidebar } from './ui/sidebar'
import BeautyLogo from './BeautyLogo'

export default function SidebarUpgradePlan() {
  const { state } = useSidebar()
  const isCollapsed = state === 'collapsed'

  if (isCollapsed) {
    return null
  }

  return (
    <div className="h-full flex items-end py-6">
      <div className="grid gap-4 w-full h-fit p-3 bg-slate-200 rounded-lg text-xs dark:bg-black dark:border dark:border-sidebar-border">
        <div className="relative mb-2">
          <BeautyLogo className="rotate-10 relative -top-0.5 -right-1" />
          <BeautyLogo className="bg-radial-[at_50%_75%]  from-slate-200 to-slate-400 absolute bottom-[-1px] left-0" />
        </div>
        <div className="grid gap-2">
          <span className="font-bold">Activa todas las funcionalidaes</span>
          <p className="text-muted-foreground">
            ¿Preparado para gestionar sin límites? Funciones premium, soporte
            prioritario y control total de tus flujos <b>I/O</b>.
          </p>
        </div>

        <div className="flex items-center justify-between">
          <Link
            title="Información sobre todas las funcionalidades"
            href="/features"
            className="font-bold"
          >
            Leer mas
          </Link>
          <Link
            title="Elige tu plan premium"
            href="/pricing"
            className="text-primary font-bold"
          >
            Actualizar plan
          </Link>
        </div>
      </div>
    </div>
  )
}
