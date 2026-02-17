import * as React from 'react'

interface TrustCardProps {
  icon: React.ReactNode
  title: string
  desc: string
  details?: string[]
}

export const TrustCard = ({
  icon,
  title,
  desc,
  details,
}: TrustCardProps) => (
  <div className="bg-white p-6 sm:p-10 border-4 border-gray-900 shadow-[10px_10px_0px_#000] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all duration-300 group h-full text-left relative overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-br from-[#0052FF]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    
    <div className="relative z-10">
      <div className="text-[#0052FF] mb-4 sm:mb-6 p-2 sm:p-3 bg-gray-100 border-2 border-gray-900 w-fit shadow-[4px_4px_0px_#000] group-hover:shadow-none group-hover:translate-x-1 group-hover:translate-y-1 group-hover:bg-[#0052FF] group-hover:text-white group-hover:border-[#0052FF] transition-all">
        {icon}
      </div>
      
      <h3 className="text-base sm:text-xl font-black text-gray-900 mb-2 sm:mb-3 tracking-tighter uppercase transition-colors duration-300 group-hover:text-[#0052FF]">
        {title}
      </h3>
      
      <p className="text-gray-900 text-xs sm:text-sm font-bold leading-tight uppercase mb-3 sm:mb-4">
        {desc}
      </p>
      
      {details && (
        <div className="flex flex-wrap gap-2 pt-3 sm:pt-4 border-t border-gray-200">
          {details.map((detail) => (
            <span
              key={detail}
              className="text-[9px] sm:text-[10px] font-black uppercase px-2 py-1 bg-gray-100 text-gray-600 group-hover:bg-[#0052FF]/10 group-hover:text-[#0052FF] transition-colors"
            >
              {detail}
            </span>
          ))}
        </div>
      )}
    </div>
  </div>
)