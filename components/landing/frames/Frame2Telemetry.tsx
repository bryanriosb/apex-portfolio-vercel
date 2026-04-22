'use client'

import * as React from 'react'
import { Activity, Eye, Brain } from 'lucide-react'
import { StatCard } from '../StatCard'

interface TelemetryLog {
  time: string
  type: string
  id: string
}

interface Frame2TelemetryProps {
  frameVariants?: never
  childVariants?: never
  logs: TelemetryLog[]
}

export const Frame2Telemetry: React.FC<Frame2TelemetryProps> = ({ logs }) => {
  return (
    <div className="w-full animate-in fade-in duration-500">
      <div className="bg-gray-900 border-4 border-gray-900 p-3 sm:p-8 md:p-16 shadow-[15px_15px_0px_#000] lg:shadow-[30px_30px_0px_#000] relative overflow-hidden hover:shadow-[35px_35px_0px_rgba(29,205,159,0.3)] transition-all duration-400">
        {/* Animated background gradient */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 blur-[100px] animate-pulse [animation-duration:10s]" />

        <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/5 blur-[80px] animate-pulse [animation-duration:8s]" />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-20 items-start w-full relative z-10">
          <div className="order-2 lg:order-1 animate-in slide-in-from-left-4 duration-700 fill-mode-forwards">
            <div className="bg-white border-4 border-primary p-3 sm:p-8 text-gray-900 shadow-[8px_8px_0px_#000000] lg:shadow-[15px_15px_0px_#000000] relative overflow-hidden group hover:shadow-[20px_20px_0px_#000000,0_0_40px_rgba(29,205,159,0.2)] hover:scale-[1.01] transition-all duration-300">
              {/* Scanning line effect */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/10 to-transparent h-20 pointer-events-none animate-scan" />

              <div className="text-[9px] sm:text-[10px] font-mono text-primary font-black uppercase mb-3 sm:mb-6 flex items-center gap-2 animate-in slide-in-from-left-4 duration-500 delay-300 fill-mode-forwards">
                <div className="animate-pulse [animation-duration:1.5s]">
                  <Activity className="w-3 h-3" />
                </div>{' '}
                SUPERVISION_ACTIVA
              </div>

              <div className="space-y-2 sm:space-y-4 h-42 sm:h-[30rem] overflow-hidden font-mono text-[9px] sm:text-xs text-left relative">
                {logs.slice(0, 10).map((log, i) => (
                  <div
                    key={`${log.id}-${i}`}
                    className={`p-2 sm:p-3 border-l-4 transition-all duration-300 animate-in slide-in-from-left-4 ${i === 0 ? 'border-primary bg-primary-50' : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'}`}
                    style={{ animationDelay: `${i * 100}ms` }}
                  >
                    {`> [${log.time}] EVENT: ${log.type} ID_${log.id}`}
                  </div>
                ))}

                {/* Gradient fade at bottom */}
                <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white to-transparent pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="order-1 lg:order-2 space-y-3 sm:space-y-8 text-left animate-in slide-in-from-right-4 duration-700 delay-200 fill-mode-forwards">
            <div className="inline-flex items-center gap-2 px-2 py-1 bg-primary text-white font-black text-[10px] sm:text-xs uppercase tracking-widest rounded-none relative overflow-hidden group hover:scale-[1.05] transition-transform duration-200">
              <span className="absolute inset-0 bg-white -translate-x-full group-hover:translate-x-0 transition-transform duration-300" />
              <span className="relative z-10 group-hover:text-primary transition-colors">
                SISTEMA BAJO TUS REGLAS
              </span>
            </div>

            <h2 className="text-2xl sm:text-5xl md:text-7xl font-black text-white mb-3 sm:mb-8 tracking-tighter leading-none uppercase">
              Automatiza sin{' '}
              <span className="text-primary inline-block hover:scale-[1.02] transition-transform duration-300">
                Perder Control
              </span>
            </h2>

            <p className="text-gray-400 text-sm sm:text-lg font-bold uppercase leading-tight">
              Los agentes complejos requieren más que un chat. El agente
              ejecuta. Tú supervisas. Tu equipo se enfoca en lo que importa.
            </p>

            <div className="grid grid-cols-2 gap-3 sm:gap-6 pt-2 sm:pt-4">
              <div className="hover:-translate-y-1 hover:scale-[1.02] transition-transform duration-200">
                <StatCard
                  icon={
                    <div className="hover:rotate-15 transition-transform duration-300">
                      <Activity />
                    </div>
                  }
                  title="Tu Criterio Codificado"
                  desc="El agente sigue tus reglas, no improvisa."
                />
              </div>

              <div className="hover:-translate-y-1 hover:scale-[1.02] transition-transform duration-200">
                <StatCard
                  icon={
                    <div className="hover:rotate-15 transition-transform duration-300">
                      <Brain />
                    </div>
                  }
                  title="Supervisión en Minutos"
                  desc="Revisas lo importante, no cada palabra."
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
