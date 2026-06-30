'use client'

import * as React from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

interface ModuleCardProps {
  title: string
  description: string
  badge: string
  badgeColor?: 'green' | 'gray'
  href?: string
  features?: string[]
  icon?: React.ReactNode
}

export const ModuleCard: React.FC<ModuleCardProps> = ({
  title,
  description,
  badge,
  badgeColor = 'green',
  href,
  features = [],
  icon,
}) => {
  const badgeStyles = {
    green: 'bg-primary text-white',
    gray: 'bg-gray-300 text-gray-600',
  }

  const content = (
    <div className="group bg-white/95 backdrop-blur-md border-4 border-gray-900 p-5 sm:p-6 shadow-[10px_10px_0px_#000] lg:shadow-[15px_15px_0px_#000] relative overflow-hidden hover:shadow-[15px_15px_0px_#1dcd9f] lg:hover:shadow-[20px_20px_0px_#1dcd9f] transition-all duration-400 hover:-translate-x-1 hover:-translate-y-1">
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="relative">
        <div className="flex items-center gap-3 mb-3">
          {icon && (
            <div className="w-10 h-10 bg-gray-900 flex items-center justify-center shadow-[3px_3px_0px_#000] border-2 border-gray-900">
              {icon}
            </div>
          )}
          <div>
            <h3 className="font-black text-gray-900 text-sm sm:text-base uppercase tracking-widest leading-none">
              {title}
            </h3>
            <span className={`inline-block mt-1 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest ${badgeStyles[badgeColor]}`}>
              {badge}
            </span>
          </div>
        </div>

        <p className="text-sm text-gray-600 font-bold leading-relaxed mb-4">
          {description}
        </p>

        {features.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {features.map((f) => (
              <span
                key={f}
                className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-600 border border-gray-200"
              >
                {f}
              </span>
            ))}
          </div>
        )}

        {href && (
          <div className="flex items-center gap-2 text-primary font-black text-xs uppercase tracking-widest group-hover:gap-3 transition-all duration-300">
            <span>Ver detalle completo</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        )}
      </div>
    </div>
  )

  if (href) {
    return <Link href={href}>{content}</Link>
  }

  return content
}
