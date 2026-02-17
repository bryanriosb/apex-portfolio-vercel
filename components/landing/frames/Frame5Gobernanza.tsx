'use client'

import * as React from 'react'
import { Scale, FileCheck, Shield, ChevronRight } from 'lucide-react'
import { TrustCard } from '../TrustCard'

interface Frame5GobernanzaProps {
  frameVariants?: never
  childVariants?: never
  cardEntranceVariants?: never
}

export const Frame5Gobernanza: React.FC<Frame5GobernanzaProps> = () => {
  const cards = [
    {
      icon: <Scale />,
      title: 'Deep Compliance',
      desc: 'Manejo de normativas locales que herramientas globales ignoran.',
      details: ['Ley 1480', 'Ley 1116', 'Datacrédito', 'DIAN'],
    },
    {
      icon: <FileCheck />,
      title: 'Activos Legales',
      desc: 'Validación criptográfica de documentos soporte de facturación.',
      details: [
        'Certificación bancaria',
        'RUT válido',
        'Firma digital',
        'Trazabilidad',
      ],
    },
    {
      icon: <Shield />,
      title: 'Infraestructura',
      desc: 'Seguridad grado bancario sobre AWS con redundancia 24/7.',
      details: [
        'AWS VPC',
        'Encriptación TLS',
        'Backups automáticos',
        'SLA 99.9%',
      ],
    },
  ]

  return (
    <div
      className="w-full text-left relative max-h-[calc(100vh-160px)] lg:max-h-none overflow-y-auto lg:overflow-visible animate-in fade-in duration-500"
    >
      {/* Background decoration - Tailwind animation */}
      <div
        className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-gradient-to-b from-[#0052FF]/5 to-transparent rounded-full blur-3xl pointer-events-none animate-pulse [animation-duration:10s]"
      />

      <div
        className="max-w-3xl mb-8 sm:mb-12 bg-white border-4 border-gray-900 p-6 sm:p-10 shadow-[15px_15px_0px_#000] relative overflow-hidden group mx-4 sm:mx-0 hover:shadow-[20px_20px_0px_#0052FF] transition-all duration-300"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[#0052FF]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        <div
          className="inline-flex items-center gap-2 px-3 py-1 mb-6 bg-gray-900 text-white font-black text-xs uppercase tracking-widest rounded-none relative overflow-hidden group/btn hover:scale-[1.02] transition-transform duration-200"
        >
          <span className="absolute inset-0 bg-[#0052FF] translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300" />
          <span className="relative z-10">GOBERNANZA</span>
        </div>

        <h2
          className="text-3xl sm:text-5xl md:text-7xl font-black text-gray-900 mb-4 sm:mb-6 tracking-tighter uppercase leading-none animate-in slide-in-from-bottom-4 duration-700 fill-mode-forwards"
        >
          Trazabilidad{' '}
          <span
            className="text-[#0052FF] inline-block hover:scale-[1.02] transition-transform duration-300"
          >
            LatAm Nativa
          </span>
        </h2>

        <p
          className="text-gray-900 text-base sm:text-lg font-bold uppercase animate-in slide-in-from-bottom-4 duration-700 delay-200 fill-mode-forwards"
        >
          Cumplimiento nativo con Ley 1480, Ley 1116 y normativas DIAN /
          Datacrédito.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 px-4 sm:px-0">
        {cards.map((card, i) => (
          <div
            key={card.title}
            className="animate-in slide-in-from-bottom-4 duration-700 fill-mode-forwards hover:-translate-y-2 transition-transform duration-300"
            style={{ animationDelay: `${0.3 + i * 0.1}s` }}
          >
            <div
              className="h-full hover:shadow-[15px_15px_0px_#0052FF] transition-all duration-300"
            >
              <TrustCard {...card} />
            </div>
          </div>
        ))}
      </div>

      {/* Additional trust indicators */}
      <div
        className="mt-8 sm:mt-12 flex flex-wrap gap-2 sm:gap-4 justify-center px-4 sm:px-0 animate-in slide-in-from-bottom-4 duration-700 delay-800 fill-mode-forwards"
      >
        {[
          'Sin lock-in',
          'Datos portables',
          'API abierta',
          'Open standards',
        ].map((item) => (
          <div
            key={item}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 border-2 border-gray-900 text-xs font-black uppercase text-gray-900 hover:bg-[#0052FF] hover:text-white hover:scale-105 transition-all duration-300 cursor-pointer"
          >
            <ChevronRight className="w-3 h-3" />
            <span className="text-inherit">{item}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
