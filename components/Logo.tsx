'use client'

import { useSidebar } from './ui/sidebar'
import IsoType from './IsoType'

export default function Logo({ className }: { className?: string }) {
  const { state } = useSidebar()
  const isCollapsed = state === 'collapsed'

  return (
    <div className="flex items-center gap-3 sm:gap-4 text-left">
      <IsoType />
      {
        !isCollapsed && (
          <div className="flex flex-col">
            <span className="text-gray-900 dark:text-gray-100 font-black text-lg sm:text-2xl tracking-tighter leading-none uppercase">
              APEX
            </span>
          </div>
        )
      }
    </div>
  )

}
