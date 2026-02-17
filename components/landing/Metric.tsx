interface MetricProps {
  value: string
  label: string
}

export const Metric = ({ value, label }: MetricProps) => (
  <div className="flex flex-col items-center group cursor-default">
    <div className="text-3xl sm:text-5xl font-black text-[#0052FF] mb-1 tracking-tighter transition-all duration-300 group-hover:scale-110 group-hover:text-shadow-glow">
      {value}
    </div>
    <div className="text-[10px] sm:text-[11px] font-black text-gray-900 uppercase tracking-widest transition-colors duration-300 group-hover:text-[#0052FF] text-center">
      {label}
    </div>
  </div>
)