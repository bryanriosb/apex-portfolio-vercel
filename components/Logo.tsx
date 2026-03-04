'use client'

import { useSidebar } from './ui/sidebar'
import IsoType from './IsoType'
import Image from 'next/image'

interface LogoProps {
  className?: string
  businessLogoUrl?: string | null
}

export default function Logo({ className, businessLogoUrl }: LogoProps) {
  const { state } = useSidebar()
  const isCollapsed = state === 'collapsed'

  // Si hay un logo de negocio y no está colapsado, mostrar el logo del negocio
  // Proporción original del logo: 187x70 (~2.67:1)
  if (businessLogoUrl && !isCollapsed) {
    return (
      <div className={`flex items-center gap-3 sm:gap-4 text-left ${className || ''}`}>
        <div className="relative w-[120px] h-[45px] sm:w-[150px] sm:h-[56px] flex-shrink-0 overflow-hidden border-0">
          <Image
            src={businessLogoUrl}
            alt="Logo del negocio"
            fill
            className="object-contain object-left"
            priority
            sizes="150px"
          />
        </div>
      </div>
    )
  }

  // Fallback: IsoType + texto APEX (comportamiento original)
  // Cuando está colapsado o no hay logo de negocio
  return (
    <div className={`flex items-center gap-3 sm:gap-4 text-left ${className || ''}`}>
      <IsoType />
      {!isCollapsed && (
        <div className="flex flex-col">
          <span className="text-gray-900 dark:text-gray-100 font-black text-lg sm:text-2xl tracking-tighter leading-none uppercase">
            APEX
          </span>
        </div>
      )}
    </div>
  )
}