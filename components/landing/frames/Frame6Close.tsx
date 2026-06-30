'use client'

import * as React from 'react'
import { ArrowRight, Settings, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface Frame6CloseProps {
  frameVariants?: never
  childVariants?: never
}

export const Frame6Close: React.FC<Frame6CloseProps> = () => {
  const tags = [
    'LATAM_READY',
    'AUTOMATIZACIÓN',
    'CONTROL',
    'INTEGRACIÓN',
    'SEGURIDAD',
    'ESCALABILIDAD',
    'TRAZABILIDAD'
  ]
  const [hoveredTag, setHoveredTag] = React.useState<string | null>(null)

  return (
    <div className="w-full animate-in fade-in duration-500">
      <div className="bg-gray-900 text-white border-4 border-white/20 p-6 sm:p-10 md:p-16 relative overflow-hidden text-center backdrop-blur-2xl mx-4 sm:mx-0 hover:border-primary transition-all duration-500">
        {/* Animated background effects - Tailwind animations */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background:
              'radial-gradient(circle at 50% 50%, #1dcd9f 0%, transparent 70%)',
          }}
        />

        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary-500/20 rounded-full blur-[100px] animate-pulse [animation-duration:10s]" />

        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-primary/10 rounded-full blur-[100px] animate-pulse [animation-duration:12s]" />

        <div className="relative z-10">

          <h2 className="text-3xl sm:text-5xl md:text-7xl lg:text-9xl font-black mb-4 sm:mb-6 tracking-tighter uppercase leading-none animate-in slide-in-from-bottom-4 duration-700 delay-200 fill-mode-forwards">
            Cuéntenos su{' '}
            <span className="text-primary-500 inline-block hover:scale-105 transition-transform duration-300">
              Desafío
            </span>
          </h2>

          <p className="text-sm sm:text-base md:text-lg text-gray-400  max-w-2xl mx-auto mb-8 sm:mb-12 animate-in slide-in-from-bottom-4 duration-700 delay-300 fill-mode-forwards">
            Cada empresa tiene retos únicos. Cuéntenos qué está complicando su
            operación — Cobranza, tesorería, facturación, Compras, Costos, Inventario, Comex o
            cualquier proceso crítico — y le ayudamos a resolverlo con agentes
            IA que ejecutan procesos reales con control humano.
          </p>

          <div className="flex items-center justify-center gap-6 sm:gap-8 md:gap-12 animate-in slide-in-from-bottom-4 duration-700 delay-400 fill-mode-forwards">
            <Link
              href="https://borls.com/contact"
              target="_blank"
              className="animate-in slide-in-from-bottom-4 duration-700 delay-400 fill-mode-forwards"
            >
              <div className="hover:scale-105 active:scale-98 transition-transform duration-200">
                <Button className="bg-primary text-white font-black text-xs sm:text-sm uppercase tracking-widest rounded-none h-14 sm:h-20 px-8 sm:px-16 border-2 border-white shadow-[4px_4px_0px_#000] sm:shadow-[8px_8px_0px_#000] hover:shadow-none hover:bg-white hover:text-gray-900 transition-all group relative overflow-hidden">
                  <span className="absolute inset-0 bg-white -translate-x-full group-hover:translate-x-0 transition-transform duration-400 ease-in-out" />
                  <span className="relative z-10 flex items-center gap-2">
                    Hablemos
                    <div className="group-hover:translate-x-2 transition-transform duration-200">
                      <ArrowRight className="w-5 h-5" />
                    </div>
                  </span>
                </Button>
              </div>

              {/* <p className="mt-6 text-gray-400 text-sm font-medium animate-in fade-in duration-500 delay-1000 fill-mode-forwards">
              Demo gratuita · Sin tarjeta de crédito · Setup en 10 minutos
            </p> */}
            </Link>
            <Link
              href="https://wa.me/573245134148?text=Hola%21%20Requiero%20m%C3%A1s%20informaci%C3%B3n%20sobre%20APEX"
              target="_blank"
              className="flex items-center justify-center bg-primary text-white font-black text-xs sm:text-sm uppercase tracking-widest rounded-none h-14 sm:h-20 px-2  border-2 border-white shadow-[4px_4px_0px_#000] sm:shadow-[8px_8px_0px_#000] hover:shadow-none hover:bg-white hover:text-gray-900 transition-all group relative overflow-hidden"
            >
              <img
                src="/whatsapp.png"
                alt="wahtsapp-icon"
                className="w-14 h-14"
              />
            </Link>
          </div>

          <div className="mt-12 sm:mt-24 flex flex-wrap gap-3 sm:gap-8 justify-center px-2 sm:px-0">
            {tags.map((tag, i) => (
              <span
                key={tag}
                className="border-2 border-white/30 px-2 sm:px-4 py-1 sm:py-1.5 text-[8px] sm:text-[10px] uppercase font-mono font-black cursor-pointer relative overflow-hidden hover:border-primary hover:text-white hover:scale-110 transition-all duration-300 animate-in slide-in-from-bottom-4 fill-mode-forwards"
                style={{ animationDelay: `${1.2 + i * 0.1}s` }}
                onMouseEnter={() => setHoveredTag(tag)}
                onMouseLeave={() => setHoveredTag(null)}
              >
                <span
                  className="absolute inset-0 bg-primary origin-left transition-transform duration-300"
                  style={{
                    transform: hoveredTag === tag ? 'scaleX(1)' : 'scaleX(0)',
                  }}
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
