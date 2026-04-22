import * as React from 'react'

interface StatCardProps {
  icon: React.ReactNode
  title: string
  desc: string
}

export const StatCard = ({
  icon,
  title,
  desc,
}: StatCardProps) => (
  <div className="border-2 border-gray-900 p-3 sm:p-4 text-left hover:border-primary transition-colors group bg-white text-gray-900 shadow-[4px_4px_0px_#000] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all">
    <div className="text-primary w-5 h-5 sm:w-6 sm:h-6 mb-2 sm:mb-3 group-hover:scale-110 transition-transform">
      {icon}
    </div>
    <h4 className="font-black uppercase mb-1 text-[10px] sm:text-xs">{title}</h4>
    <p className="text-[8px] sm:text-[9px] text-gray-500 uppercase leading-relaxed">
      {desc}
    </p>
  </div>
)
