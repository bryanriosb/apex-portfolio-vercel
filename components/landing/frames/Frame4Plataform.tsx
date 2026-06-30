'use client'

import * as React from 'react'
import { ModuleCard } from '../ModuleCard'
import { Crosshair, Layers, ShoppingCart, TrendingUp, Receipt } from 'lucide-react'

interface Frame4PlataformProps {
  frameVariants?: never
  childVariants?: never
}

export const Frame4Plataform: React.FC<Frame4PlataformProps> = () => {
  const apexDimensions = [
    {
      letter: 'A',
      title: 'Agentic',
      desc: 'Aprende y se adapta al comportamiento de cada empresa y sus deudores.',
    },
    {
      letter: 'P',
      title: 'Planning',
      desc: 'Decisiones de planificación asistidas por datos y modelos ML, no por intuición.',
    },
    {
      letter: 'E',
      title: 'Execution',
      desc: 'No solo informa, actúa. Agentes autónomos ejecutan procesos en background.',
    },
    {
      letter: 'X',
      title: 'Expansion',
      desc: 'Cada módulo genera datos que potencian el siguiente. La plataforma crece.',
    },
  ]

  return (
    <div className="w-full animate-in fade-in duration-500 space-y-6">
      {/* Sección LA PLATAFORMA - Header */}
      <div className="text-left">
        <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 bg-gray-900 text-white font-black text-xs uppercase tracking-widest rounded-none relative overflow-hidden group hover:scale-[1.02] transition-transform duration-200">
          <span className="absolute inset-0 bg-primary translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
          <span className="relative z-10">LA PLATAFORMA</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Qué es APEX */}
        <div className="bg-white/95 backdrop-blur-md border-4 border-gray-900 p-4 sm:p-6 lg:p-8 shadow-[10px_10px_0px_#000] lg:shadow-[20px_20px_0px_#000] relative overflow-hidden hover:shadow-[25px_25px_0px_#1dcd9f] transition-all duration-400">
          <div className="relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-primary flex items-center justify-center shadow-[3px_3px_0px_#000] border-2 border-gray-900">
                <Crosshair className="text-white w-5 h-5" />
              </div>
              <div className="text-primary font-mono text-sm font-black uppercase tracking-widest">
                QUÉ ES APEX
              </div>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mb-3 tracking-tighter uppercase leading-none">
              Agentic AI Planning &{' '}
              <span className="text-primary">EXecution</span> Platform
            </h2>

            <p className="text-sm sm:text-base text-gray-600 font-bold leading-relaxed mb-6 max-w-3xl">
              APEX no es un software estático. Es una plataforma viva que conecta cualquier fuente de datos
              existente — ERP, CRM, bases de datos, correos, extractos bancarios — eliminando silos y ejecutando
              procesos críticos sin reemplazar el sistema actual.
            </p>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              {apexDimensions.map((d) => (
                <div
                  key={d.letter}
                  className="bg-gray-50 border-2 border-gray-200 p-3 hover:border-primary transition-colors duration-300"
                >
                  <div className="text-2xl font-black text-primary mb-1">{d.letter}</div>
                  <div className="text-xs font-black uppercase tracking-widest text-gray-900 mb-1">
                    {d.title}
                  </div>
                  <p className="text-sm text-gray-500 leading-snug">{d.desc}</p>
                </div>
              ))}
            </div>

            <div className="p-3 bg-gray-50 border-2 border-gray-200 hover:border-primary transition-colors duration-300">
              <p className="text-xs text-gray-600">
                <span className="font-black uppercase tracking-widest text-primary">Visión:</span>{' '}
                Ser la plataforma de planificación operativa inteligente de referencia para empresas
                latinoamericanas, democratizando el acceso a capacidades de IA que hoy solo tienen las grandes
                corporaciones globales.
              </p>
            </div>
          </div>
        </div>

        {/* Soluciones */}
        <div>
          <div className="text-primary font-mono text-sm font-black uppercase mb-4 tracking-widest">
            SOLUCIONES
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ModuleCard
              title="APEX Collection"
              description="Gestión de cobro y cartera B2B. Agentes IA que ejecutan el ciclo de cobro y conciliación de forma autónoma — su equipo se enfoca en estrategia y relaciones."
              badge="MVP Activo"
              badgeColor="green"
              href="/modules/collection"
              icon={<Layers className="w-5 h-5 text-white" />}
              features={['Cobro Multicanal', 'Conciliación HITL', 'Plantillas IA', 'KPIs Tiempo Real']}
            />

            <div className="bg-gray-50/80 backdrop-blur-md border-4 border-dashed border-gray-300 p-5 sm:p-6 opacity-60">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gray-300 flex items-center justify-center border-2 border-gray-400">
                  <TrendingUp className="text-white w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-gray-500 text-sm sm:text-base uppercase tracking-widest leading-none">
                    Tesorería
                  </h3>
                  <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest bg-gray-200 text-gray-500">
                    Próximamente
                  </span>
                </div>
              </div>
              <p className="text-sm text-gray-400 font-bold leading-relaxed">
                Proyecciones de flujo de caja, conciliación bancaria y gestión de tesorería.
              </p>
            </div>

            <div className="bg-gray-50/80 backdrop-blur-md border-4 border-dashed border-gray-300 p-5 sm:p-6 opacity-60">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gray-300 flex items-center justify-center border-2 border-gray-400">
                  <Receipt className="text-white w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-gray-500 text-sm sm:text-base uppercase tracking-widest leading-none">
                    Facturación
                  </h3>
                  <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest bg-gray-200 text-gray-500">
                    Próximamente
                  </span>
                </div>
              </div>
              <p className="text-sm text-gray-400 font-bold leading-relaxed">
                Emisión, recepción y conciliación de facturas con agentes autónomos.
              </p>
            </div>

            <div className="bg-gray-50/80 backdrop-blur-md border-4 border-dashed border-gray-300 p-5 sm:p-6 opacity-60">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gray-300 flex items-center justify-center border-2 border-gray-400">
                  <ShoppingCart className="text-white w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-gray-500 text-sm sm:text-base uppercase tracking-widest leading-none">
                    Compras
                  </h3>
                  <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest bg-gray-200 text-gray-500">
                    Próximamente
                  </span>
                </div>
              </div>
              <p className="text-sm text-gray-400 font-bold leading-relaxed">
                Requisiciones, órdenes de compra y seguimiento de proveedores con IA.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
