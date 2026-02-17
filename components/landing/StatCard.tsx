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
  <div className="border-2 border-gray-900 p-4 sm:p-6 text-left hover:border-blue-500 transition-colors group bg-white text-gray-900 shadow-[4px_4px_0px_#000] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all">
    <div className="text-blue-500 w-6 h-6 sm:w-8 sm:h-8 mb-3 sm:mb-4 group-hover:scale-110 transition-transform">
      {icon}
    </div>
    <h4 className="font-black uppercase mb-2 text-xs sm:text-sm">{title}</h4>
    <p className="text-[9px] sm:text-[10px] text-gray-500 uppercase leading-relaxed">
      {desc}
    </p>
  </div>
)
