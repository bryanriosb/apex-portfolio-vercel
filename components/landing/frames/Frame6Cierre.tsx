'use client'

import * as React from 'react'
import { ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Frame6CierreProps {
  frameVariants?: never
  childVariants?: never
}

export const Frame6Cierre: React.FC<Frame6CierreProps> = () => {
  const tags = ['SIIGO_SYNC', 'WORLD_OFFICE', 'AWS_VPC', 'LATAM_READY', 'ML_MODELS', 'API_REST']
  const [hoveredTag, setHoveredTag] = React.useState<string | null>(null)

  return (
    <div
      className="w-full max-h-[calc(100vh-160px)] lg:max-h-none overflow-y-auto lg:overflow-visible animate-in fade-in duration-500"
    >
      <div 
        className="bg-gray-900 text-white border-4 border-white/20 p-6 sm:p-10 md:p-16 relative overflow-hidden text-center backdrop-blur-2xl mx-4 sm:mx-0 hover:border-[rgba(0,82,255,0.5)] transition-all duration-500"
      >
        {/* Animated background effects - Tailwind animations */}
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            background: "radial-gradient(circle at 50% 50%, rgba(0,82,255,0.3) 0%, transparent 70%)"
          }}
        />
        
        <div 
          className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/20 rounded-full blur-[100px] animate-pulse [animation-duration:10s]"
        />
        
        <div 
          className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-[#0052FF]/10 rounded-full blur-[100px] animate-pulse [animation-duration:12s]"
        />
        
        <div className="relative z-10">
          <div
            className="text-blue-500 font-mono text-xs mb-8 tracking-[0.5em] uppercase font-black flex items-center justify-center gap-3 animate-in slide-in-from-bottom-4 duration-700 fill-mode-forwards"
          >
            <div
              className="animate-spin [animation-duration:3s]"
            >
              <Sparkles className="w-4 h-4" />
            </div>
            DEPLOYMENT_READY
            <div
              className="animate-spin [animation-duration:3s]"
            >
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          
          <h2
            className="text-3xl sm:text-5xl md:text-7xl lg:text-9xl font-black mb-8 sm:mb-12 tracking-tighter uppercase leading-none animate-in slide-in-from-bottom-4 duration-700 delay-200 fill-mode-forwards"
          >
            Active su{' '}
            <span 
              className="text-blue-500 inline-block hover:scale-105 transition-transform duration-300"
            >
              Liquidez
            </span>
          </h2>
          
          <div className="animate-in slide-in-from-bottom-4 duration-700 delay-400 fill-mode-forwards">
            <div
              className="hover:scale-105 active:scale-98 transition-transform duration-200"
            >
              <Button 
                className="bg-[#0052FF] text-white font-black text-xs sm:text-sm uppercase tracking-widest rounded-none h-14 sm:h-20 px-8 sm:px-16 border-2 border-white shadow-[4px_4px_0px_#0052FF] sm:shadow-[8px_8px_0px_#0052FF] hover:shadow-none hover:bg-white hover:text-gray-900 transition-all group relative overflow-hidden"
              >
                <span
                  className="absolute inset-0 bg-white -translate-x-full group-hover:translate-x-0 transition-transform duration-400 ease-in-out"
                />
                <span className="relative z-10 flex items-center gap-2">
                  Iniciar Ahora
                  <div
                    className="group-hover:translate-x-2 transition-transform duration-200"
                  >
                    <ArrowRight className="w-5 h-5" />
                  </div>
                </span>
              </Button>
            </div>
            
            <p
              className="mt-6 text-gray-400 text-sm font-medium animate-in fade-in duration-500 delay-1000 fill-mode-forwards"
            >
              Demo gratuita · Sin tarjeta de crédito · Setup en 15 minutos
            </p>
          </div>
          
          <div className="mt-12 sm:mt-24 flex flex-wrap gap-3 sm:gap-8 justify-center px-2 sm:px-0">
            {tags.map((tag, i) => (
              <span
                key={tag}
                className="border-2 border-white/30 px-2 sm:px-4 py-1 sm:py-1.5 text-[8px] sm:text-[10px] uppercase font-mono font-black cursor-pointer relative overflow-hidden hover:border-[#0052FF] hover:text-white hover:scale-110 transition-all duration-300 animate-in slide-in-from-bottom-4 fill-mode-forwards"
                style={{ animationDelay: `${1.2 + i * 0.1}s` }}
                onMouseEnter={() => setHoveredTag(tag)}
                onMouseLeave={() => setHoveredTag(null)}
              >
                <span
                  className="absolute inset-0 bg-[#0052FF] origin-left transition-transform duration-300"
                  style={{ transform: hoveredTag === tag ? 'scaleX(1)' : 'scaleX(0)' }}
                />
                <span className="relative z-10">{tag}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
