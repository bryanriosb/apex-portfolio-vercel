import * as React from 'react'

interface FeatureItemProps {
  icon: React.ReactNode
  title: string
  desc: string
}

export const FeatureItem = ({
  icon,
  title,
  desc,
}: FeatureItemProps) => (
  <div className="flex gap-3 sm:gap-6 group text-left">
    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 border-2 border-gray-900 rounded-none flex items-center justify-center text-gray-900 transition-all shadow-[4px_4px_0px_#000] group-hover:shadow-none group-hover:translate-x-1 group-hover:translate-y-1 group-hover:bg-[#0052FF] group-hover:text-white group-hover:border-[#0052FF] shrink-0">
      {icon}
    </div>
    <div className="uppercase min-w-0 flex-1">
      <h3 className="text-sm sm:text-lg font-black text-gray-900 mb-1 tracking-tight leading-none">
        {title}
      </h3>
      <p className="text-gray-900 text-[9px] sm:text-[10px] font-bold leading-tight">
        {desc}
      </p>
    </div>
  </div>
)
