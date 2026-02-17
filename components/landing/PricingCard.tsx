import { Button } from '@/components/ui/button'
import { Mail, Target } from 'lucide-react'

interface PricingCardProps {
  title: string
  price: string
  emails: string
  profile: string
  featured?: boolean
}

export const PricingCard = ({
  title,
  price,
  emails,
  profile,
  featured = false,
}: PricingCardProps) => (
  <div
    className={`p-4 sm:p-6 border-4 ${featured ? 'border-[#0052FF] bg-blue-50 shadow-[10px_10px_0px_#0052FF]' : 'border-gray-900 bg-white shadow-[10px_10px_0px_#000]'} text-left flex flex-col h-full`}
  >
    <div className="text-[9px] sm:text-[10px] font-black uppercase text-gray-400 mb-2">
      {title}
    </div>
    <div className="text-2xl sm:text-3xl font-black uppercase mb-4 tracking-tighter text-gray-900">
      USD {price}
    </div>
    <div className="flex-1 space-y-2 sm:space-y-3 mb-4 sm:mb-6">
      <div className="flex items-center gap-2 text-[9px] sm:text-[10px] font-bold uppercase text-gray-900">
        <Mail className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500 shrink-0" /> {emails} Emails
      </div>
      <div className="flex items-center gap-2 text-[9px] sm:text-[10px] font-bold uppercase text-gray-900">
        <Target className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500 shrink-0" /> {profile}
      </div>
    </div>
    <Button
      className={`w-full rounded-none font-black uppercase text-[9px] sm:text-[10px] border-2 border-gray-900 shadow-[4px_4px_0px_#000] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all  ${featured ? 'bg-[#0052FF] text-white hover:bg-blue-600' : 'bg-white text-gray-900 hover:bg-[#0052FF] hover:text-white'}`}
    >
      Seleccionar
    </Button>
  </div>
)
