'use client'

import * as React from 'react'
import {
  Zap,
  ShieldCheck,
  TrendingUp,
  Eye,
  AlertTriangle,
  CheckCircle2,
  FileCheck,
  EyeOff,
  Lock,
} from 'lucide-react'
import { FeatureItem } from '../FeatureItem'

interface Frame1SecurityProps {
  frameVariants?: never
  childVariants?: never
  activeStrategy?: never
  setActiveStrategy?: never
}

export const Frame1Security: React.FC<Frame1SecurityProps> = () => {
  const [isVisible, setIsVisible] = React.useState(false)

  React.useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 500)
    return () => clearTimeout(timer)
  }, [])

  const apexRate = 94
  const bulkRate = 62

  return (
    <div className="w-full relative animate-in fade-in duration-500">
      {/* Background gradient - Tailwind animation */}
      <div className="absolute -top-32 left-1/4 w-96 h-96 bg-gradient-to-br from-primary/5 to-transparent rounded-full blur-3xl pointer-events-none animate-pulse [animation-duration:8s]" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-20 items-stretch w-full px-4 sm:px-0">
        <div className="bg-white border-4 border-gray-900 p-4 sm:p-6 lg:p-10 shadow-[8px_8px_0px_#000] lg:shadow-[15px_15px_0px_#000] text-left relative overflow-hidden group shrink-0 hover:shadow-[20px_20px_0px_#1dcd9f] transition-all duration-300 flex flex-col">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

          <div className="inline-flex items-center gap-2 px-2 py-1 mb-3 sm:mb-6 bg-primary text-white font-black text-[10px] sm:text-xs uppercase tracking-widest rounded-none relative overflow-hidden group/btn hover:scale-[1.02] transition-transform duration-200">
            <span className="absolute inset-0 bg-gray-900 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300" />
            <span className="relative z-10 group-hover/btn:text-white transition-colors">
              POR QUÉ APEX
            </span>
          </div>

          <h2 className="text-2xl sm:text-5xl md:text-7xl font-black text-gray-900 mb-3 sm:mb-8 tracking-tighter leading-none uppercase animate-in slide-in-from-bottom-4 duration-700 fill-mode-forwards">
            Enterprise <br className="hidden sm:block" />{' '}
            <span className="text-primary">Ready</span>
          </h2>

          <p className="text-gray-900 text-sm sm:text-lg font-bold mb-4 sm:mb-12 uppercase leading-tight animate-in slide-in-from-bottom-4 duration-700 delay-200 fill-mode-forwards">
            Cada decisión del agente es rastreable, explicable y supervisable.
          </p>

          <div className="space-y-4 sm:space-y-6 animate-in slide-in-from-bottom-4 duration-700 delay-400 fill-mode-forwards">
            <div className="hover:translate-x-2 transition-transform duration-200 cursor-pointer">
              <FeatureItem
                icon={
                  <div className="hover:rotate-180 transition-transform duration-500">
                    <Zap className="w-6 h-6" />
                  </div>
                }
                title="Auditabilidad Total"
                desc="Trazabilidad completa de cada decisión."
              />
            </div>

            <div className="hover:translate-x-2 transition-transform duration-200 cursor-pointer">
              <FeatureItem
                icon={
                  <div className="hover:rotate-180 transition-transform duration-500">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                }
                title="Guardrails de Seguridad"
                desc="Protección automática de datos sensibles y contenido."
              />
            </div>

            <div className="hover:translate-x-2 transition-transform duration-200 cursor-pointer">
              <FeatureItem
                icon={
                  <div className="hover:rotate-180 transition-transform duration-500">
                    <Lock className="w-6 h-6" />
                  </div>
                }
                title="Control de Acceso"
                desc="RBAC y SSO para agentes empresariales."
              />
            </div>
          </div>
        </div>

        <div className="bg-gray-900 border-4 border-gray-900 p-4 sm:p-8 md:p-12 shadow-[8px_8px_0px_#000] lg:shadow-[20px_20px_0px_#000] relative overflow-hidden shrink-0 hover:shadow-[25px_25px_0px_#1dcd9f] transition-all duration-300 flex flex-col">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-[100px] animate-pulse [animation-duration:8s]" />

          <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/5 blur-[100px] animate-pulse [animation-duration:10s]" />

          <div className="relative z-10">
            <div className="mb-4 sm:mb-10">
              <div className="text-[10px] font-mono text-primary font-black tracking-widest uppercase mb-1 sm:mb-2 animate-in slide-in-from-left-4 duration-500 delay-300 fill-mode-forwards">
                VISIBILIDAD TOTAL
              </div>

              <h3 className="text-lg sm:text-2xl md:text-3xl font-black text-white uppercase tracking-tight animate-in slide-in-from-bottom-4 duration-500 delay-400 fill-mode-forwards">
                ¿Qué hace cada agente?
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:gap-8 mb-4 sm:mb-10">
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className={`transition-all duration-500 ${isVisible ? 'scale-100' : 'scale-0'}`}
                  >
                    <CheckCircle2 className="w-6 h-6 text-primary" />
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest text-primary">
                    APEX
                  </span>
                </div>

                <div
                  className={`text-3xl sm:text-6xl md:text-9xl font-black text-white font-mono tracking-tighter transition-all duration-500 delay-100 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}
                >
                  {apexRate}
                  <span className="text-xl sm:text-2xl text-primary">%</span>
                </div>

                <div className="h-2 sm:h-3 bg-gray-800 border border-gray-700 p-0.5">
                  <div
                    className="h-full bg-primary transition-all duration-[1200ms] ease-out"
                    style={{ width: isVisible ? `${apexRate}%` : '0%' }}
                  />
                </div>

                <div
                  className={`flex items-center gap-2 text-xs text-white transition-opacity duration-500 delay-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
                >
                  <FileCheck size={24} />
                  <span>Decisiones trazables + resultados medibles</span>
                </div>
              </div>

              <div className="space-y-4 opacity-50">
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className={`transition-all duration-500 delay-100 ${isVisible ? 'scale-100' : 'scale-0'}`}
                  >
                    <AlertTriangle className="w-6 h-6 text-gray-400" />
                  </div>

                  <span className="text-xs font-black uppercase tracking-widest text-gray-400">
                    Otros
                  </span>
                </div>

                <div
                  className={`text-3xl sm:text-6xl md:text-9xl font-black text-gray-500 font-mono tracking-tighter transition-all duration-500 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}
                >
                  {bulkRate}
                  <span className="text-xl sm:text-2xl text-gray-600">%</span>
                </div>

                <div className="h-2 sm:h-3 bg-gray-800 border border-gray-700 p-0.5">
                  <div
                    className="h-full bg-gray-400 transition-all duration-[1200ms] ease-out delay-100"
                    style={{ width: isVisible ? `${bulkRate}%` : '0%' }}
                  />
                </div>

                <div
                  className={`flex items-center gap-2 text-sm text-gray-400 transition-opacity duration-500 delay-600 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
                >
                  <EyeOff size={24} />
                  <span>Caja negra</span>
                </div>
              </div>
            </div>

            <div
              className={`bg-white border-2 border-gray-700 p-3 sm:p-6 transition-all duration-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}
              style={{ transitionDelay: isVisible ? '700ms' : '0ms' }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 sm:gap-4">
                  <div className="animate-pulse">
                    <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
                  </div>

                  <div>
                    <div className="text-xl sm:text-3xl font-black text-gray-900">
                      +{apexRate - bulkRate}%
                    </div>
                    <div className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Más trazable que otros
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-widest">
                    Diferencia
                  </div>
                  <div className="text-xs sm:text-sm font-black text-primary">
                    APEX
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
