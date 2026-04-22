'use client'

import * as React from 'react'
import { DataValidationAnimation } from '../DataValidationAnimation'
import { FileSpreadsheet, Copy, Eye } from 'lucide-react'
import { FeatureItem } from '../FeatureItem'

interface Frame3IntegrityProps {
  frameVariants?: never
  childVariants?: never
}

export const Frame3Integrity: React.FC<Frame3IntegrityProps> = () => {
  return (
    <div className="w-full relative animate-in fade-in duration-500">
      {/* Background decorations - Tailwind animation */}
      <div className="absolute -top-20 right-1/4 w-72 h-72 bg-primary/5 rounded-full blur-3xl pointer-events-none animate-pulse [animation-duration:7s]" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-20 items-start w-full px-4 sm:px-0">
        <div className="bg-white border-4 border-gray-900 p-4 sm:p-6 lg:p-10 shadow-[8px_8px_0px_#000] lg:shadow-[15px_15px_0px_#000] text-left relative overflow-hidden group shrink-0 hover:shadow-[20px_20px_0px_#1dcd9f] transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

          <div className="inline-flex items-center gap-2 px-2 py-1 mb-3 sm:mb-6 bg-gray-900 text-white font-black text-[10px] sm:text-xs uppercase tracking-widest rounded-none relative overflow-hidden group/btn hover:scale-[1.02] transition-transform duration-200">
            <span className="absolute inset-0 bg-primary translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300" />
            <span className="relative z-10">TUS DATOS, UN LUGAR</span>
          </div>

          <h2 className="text-2xl sm:text-5xl md:text-7xl font-black text-gray-900 mb-3 sm:mb-8 tracking-tighter leading-none uppercase animate-in slide-in-from-bottom-4 duration-700 fill-mode-forwards">
            Todo en un{' '}
            <span className="text-primary inline-block hover:scale-[1.02] transition-transform duration-300">
              Solo Lugar
            </span>
          </h2>

          <p className="text-gray-900 text-sm sm:text-lg font-bold mb-4 sm:mb-12 uppercase leading-tight animate-in slide-in-from-bottom-4 duration-700 delay-200 fill-mode-forwards">
            Ves todo lo que necesitas en un solo lugar. Cliente, historial,
            compromisos. No más buscar en Excel, email, ERP...
          </p>

          <div className="space-y-4 sm:space-y-6 animate-in slide-in-from-bottom-4 duration-700 delay-400 fill-mode-forwards">
            <div className="hover:translate-x-2 transition-transform duration-200 cursor-pointer">
              <FeatureItem
                icon={
                  <div className="hover:rotate-180 transition-transform duration-500">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                }
                title="Una Sola Fuente de Verdad"
                desc="Tus sistemas conectados, no más buscar."
              />
            </div>

            <div className="hover:translate-x-2 transition-transform duration-200 cursor-pointer">
              <FeatureItem
                icon={
                  <div className="hover:rotate-180 transition-transform duration-500">
                    <Copy className="w-6 h-6" />
                  </div>
                }
                title="Relaciones Claras"
                desc="Entiende cómo se conecta tu negocio."
              />
            </div>

            <div className="hover:translate-x-2 transition-transform duration-200 cursor-pointer">
              <FeatureItem
                icon={
                  <div className="hover:rotate-180 transition-transform duration-500">
                    <Eye className="w-6 h-6" />
                  </div>
                }
                title="Historial Completo"
                desc="Nada se pierde. Todo queda registrado."
              />
            </div>
          </div>
        </div>

        <div className="h-[200px] sm:h-full w-full relative shrink-0 hover:scale-[1.02] transition-transform duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-500 rounded-lg" />
          <DataValidationAnimation />
        </div>
      </div>
    </div>
  )
}
