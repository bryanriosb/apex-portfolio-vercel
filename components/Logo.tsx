'use client'

import { useSidebar } from './ui/sidebar'

export default function Logo({ className }: { className?: string }) {
  const { state } = useSidebar()
  const isCollapsed = state === 'collapsed'

  return (
    <div className="mb-6">
      <div
        className={`relative  top-2 font-bold text-2xl flex gap-2 items-center transition-all ${
          isCollapsed ? 'justify-center px-0' : 'px-2'
        } ${className}`}
      >
        P-APEX
        {!isCollapsed && <span>Beauty</span>}
      </div>
    </div>
  )
}
