interface RoadmapStepProps {
  phase: string
  title: string
  desc: string
  active?: boolean
}

export const RoadmapStep = ({
  phase,
  title,
  desc,
  active = false,
}: RoadmapStepProps) => (
  <div className="text-left space-y-2 group cursor-pointer">
    <div
      className={`text-xl font-black transition-all duration-300 ${active ? 'text-blue-500' : 'text-gray-300 group-hover:text-gray-500'}`}
    >
      {phase}
    </div>
    <div className="font-black uppercase tracking-widest text-xs text-gray-900 transition-colors duration-300 group-hover:text-[#0052FF]">
      {title}
    </div>
    
    <p className="text-[10px] text-gray-500 uppercase font-bold leading-tight transition-colors duration-300 group-hover:text-gray-700">
      {desc}
    </p>
  </div>
)