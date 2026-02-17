interface DeliveryBarProps {
  label: string
  value: string
  color: string
  active: boolean
  onClick?: () => void
}

export const DeliveryBar = ({
  label,
  value,
  color,
  active,
  onClick,
}: DeliveryBarProps) => (
  <div
    onClick={onClick}
    className={`
      transition-all duration-500 cursor-pointer group
      ${active ? 'scale-105 opacity-100' : 'scale-95 opacity-40 hover:opacity-70'}
    `}
  >
    <div className="flex justify-between text-sm font-black uppercase mb-3 text-left">
      <span className={`transition-colors duration-300 ${active ? 'text-white' : 'text-gray-400 group-hover:text-gray-300'}`}>
        {label}
      </span>
      <span className={`
        transition-all duration-300 font-mono
        ${active ? 'text-blue-400 scale-110' : 'text-gray-500 group-hover:text-gray-400'}
      `}>
        {value}
      </span>
    </div>
    
    <div className="h-8 border-2 border-white/20 p-1 bg-black/20 relative overflow-hidden">
      <div
        className={`
          h-full ${color} transition-all duration-1000 relative
          ${active ? 'shadow-[0_0_20px_rgba(59,130,246,0.5)]' : ''}
        `}
        style={{ width: value }}
      >
        {active && (
          <div className="absolute inset-0 bg-white/30 animate-pulse" />
        )}
      </div>
      
      {/* Grid lines */}
      <div className="absolute inset-0 flex">
        {[25, 50, 75].map((pos) => (
          <div key={pos} className="flex-1 border-l border-white/10 first:border-l-0" />
        ))}
      </div>
    </div>
  </div>
)