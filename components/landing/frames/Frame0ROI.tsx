'use client'

import * as React from 'react'
import { TechnicalTypewriter } from '../apex/TechnicalTypewriter'
import { Metric } from '../Metric'

interface Frame0ROIProps {
  frameVariants?: never
  childVariants?: never
}

export const Frame0ROI: React.FC<Frame0ROIProps> = () => {
  return (
    <div className="w-full flex items-center justify-center relative animate-in fade-in duration-500">
      {/* Floating decorative elements - Tailwind animations */}
      <div className="absolute -top-20 -left-20 w-40 h-40 bg-[#0052FF]/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute -bottom-20 -right-20 w-60 h-60 bg-[#0052FF]/5 rounded-full blur-3xl pointer-events-none animate-pulse [animation-duration:6s]" />

      <div className="max-w-5xl bg-white border-4 border-gray-900 p-6 sm:p-10 md:p-16 relative overflow-hidden text-center mx-4 sm:mx-0 shadow-[20px_20px_0px_rgba(0,82,255,0.2)] hover:shadow-[25px_25px_0px_rgba(0,82,255,0.3)] transition-all duration-300">
        {/* Corner accents */}
        <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-[#0052FF]/10 to-transparent opacity-0 animate-in fade-in duration-500 delay-1000 fill-mode-forwards" />
        <div className="absolute bottom-0 left-0 w-20 h-20 bg-gradient-to-tr from-gray-100 to-transparent opacity-0 animate-in fade-in duration-500 delay-[1200ms] fill-mode-forwards" />

        <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-8 bg-gray-900 text-white font-black text-xs uppercase tracking-widest rounded-none relative overflow-hidden group cursor-default hover:scale-[1.02] transition-transform duration-200">
          <span className="absolute inset-0 bg-[#0052FF] -translate-x-full group-hover:translate-x-0 transition-transform duration-300" />
          <span className="relative z-10">ESTRATEGIA</span>
        </div>

        <h1 className="grid gap-2 sm:gap-3 text-3xl sm:text-5xl md:text-8xl font-black text-gray-900 mb-6 sm:mb-8 leading-[0.85] tracking-tighter uppercase text-left">
          <span className="animate-bounce slide-in-from-bottom-4 duration-700 fill-mode-forwards">
            <TechnicalTypewriter text="RECAUDO" delay={500} />
          </span>
          <span className="text-[#0052FF] animate-in slide-in-from-bottom-4 duration-700 delay-300 fill-mode-forwards">
            <TechnicalTypewriter text="AUTÓNOMO" delay={1500} />
          </span>
        </h1>

        <p className="text-base sm:text-lg md:text-xl text-gray-900 max-w-3xl mr-auto text-left font-bold leading-tight mb-8 sm:mb-12 uppercase animate-in slide-in-from-bottom-4 duration-700 delay-500 fill-mode-forwards">
          Potencie la operación de su empresa con agentes IA que planifican y
          ejecutan procesos críticos de cartera.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 md:gap-12 pt-6 sm:pt-10 border-t-4 border-gray-900 animate-in slide-in-from-bottom-4 duration-700 delay-700 fill-mode-forwards">
          <div className="hover:-translate-y-1 hover:scale-[1.02] transition-transform duration-200">
            <Metric value="35%+" label="Open Rate Objetivo" />
          </div>
          <div className="hover:-translate-y-1 hover:scale-[1.02] transition-transform duration-200">
            <Metric value="ROI" label="Medible Mes 1" />
          </div>
          <div className="hover:-translate-y-1 hover:scale-[1.02] transition-transform duration-200">
            <Metric value="100%" label="Basado en Datos" />
          </div>
        </div>
      </div>
    </div>
  )
}
