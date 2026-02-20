'use client'

import * as React from 'react'
import { PricingCard } from '../PricingCard'
import { RoadmapStep } from '../RoadmapStep'
import { Target, Sparkles, Brain, Workflow, CheckCircle2 } from 'lucide-react'

interface Frame4PlataformaProps {
  frameVariants?: never
  childVariants?: never
}

export const Frame4Plataforma: React.FC<Frame4PlataformaProps> = () => {
  const [hoveredPhase, setHoveredPhase] = React.useState<number | null>(null)

  const phases = [
    {
      phase: '01',
      title: 'Notificaciones',
      subtitle: 'Fase Actual',
      desc: 'Recaudo multi-canal inteligente',
      active: true,
      features: [
        'Wizard 3 pasos completo',
        'Tracking en tiempo real',
        'Motor de plantillas',
        'Gestión de adjuntos',
        'KPI dashboard',
        'Inbox integrado',
        'Acuerdos de pago',
        'Scoring básico ML',
        'Multi-canal (WhatsApp API)',
        'Integraciones ERP (Siigo, World Office)',
      ],
      icon: <Target className="w-5 h-5" />,
      color: '#0052FF',
    },
    {
      phase: '02',
      title: 'Inteligencia',
      subtitle: 'En desarrollo',
      desc: 'Modelos propensión IA + Agentes autónomos',
      features: [
        'Agente de cobro autónomo',
        'Modelo de propensión de pago',
        'Predicción 7/15/30 días',
        'Dashboard predictivo',
        'Interfaz conversacional NLP',
        'Priorización automática',
        'Secuencia óptima de contacto',
        'Análisis de comportamiento',
        'Alertas proactivas',
        'Escalado inteligente',
      ],
      icon: <Brain className="w-5 h-5" />,
      color: '#7C3AED',
    },
    {
      phase: '03',
      title: 'Planificación integrada',
      subtitle: 'Visión futura',
      desc: 'Tesorería integrada + Planeación financiera',
      features: [
        'Módulo tesorería completo',
        'Proyección flujo de caja',
        'Módulo planeación financiera',
        'Escenarios 30/60/90 días',
        'Orquestación multi-agentes',
        'Agente de tesorería',
        'Agente de alertas',
        'Marketplace integraciones',
        'API pública',
        'Multi-empresa / Grupos',
      ],
      icon: <Workflow className="w-5 h-5" />,
      color: '#059669',
    },
  ]

  return (
    <div className="w-full animate-in fade-in duration-500 space-y-6">
      {/* Sección LA PLATAFORMA - Header compartido */}
      <div className="text-left">
        <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 bg-gray-900 text-white font-black text-xs uppercase tracking-widest rounded-none relative overflow-hidden group hover:scale-[1.02] transition-transform duration-200">
          <span className="absolute inset-0 bg-[#0052FF] translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
          <span className="relative z-10">LA PLATAFORMA</span>
        </div>
      </div>

      {/* Grid de dos cards horizontales */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Card 1: Capacidad Enterprise */}
        <div className="bg-white/95 backdrop-blur-md border-4 border-gray-900 p-4 sm:p-6 lg:p-8 shadow-[10px_10px_0px_#000] lg:shadow-[20px_20px_0px_#000] relative overflow-hidden hover:shadow-[25px_25px_0px_rgba(0,82,255,0.2)] transition-all duration-400">
          {/* Background gradient */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-[#0052FF]/5 to-transparent animate-pulse [animation-duration:6s]" />

          <div className="relative">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-gray-900 mb-4 tracking-tighter uppercase leading-none">
              Capacidad{' '}
              <span className="text-[#0052FF] inline-block hover:scale-[1.02] transition-transform duration-300">
                Enterprise
              </span>
            </h2>

            <p className="text-gray-900 text-sm sm:text-base font-bold uppercase mb-6">
              IA operativa de clase mundial para grupos empresariales.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="hover:-translate-y-1 transition-transform duration-300">
                <PricingCard
                  title="Starter"
                  price="49"
                  emails="500"
                  profile="Pequeña Pyme"
                />
              </div>

              <div className="hover:-translate-y-1 transition-transform duration-300">
                <PricingCard
                  title="Growth"
                  price="149"
                  emails="2.000"
                  profile="Mediana Pyme"
                  featured
                />
              </div>

              <div className="hover:-translate-y-1 transition-transform duration-300">
                <PricingCard
                  title="Business"
                  price="399"
                  emails="10.000"
                  profile="Corporativa"
                />
              </div>

              <div className="hover:-translate-y-1 transition-transform duration-300">
                <PricingCard
                  title="Enterprise"
                  price="799+"
                  emails="Ilimitado"
                  profile="Grupos"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: ROADMAP_2026 */}
        <div className="bg-white/95 backdrop-blur-md border-4 border-gray-900 p-4 sm:p-6 lg:p-8 shadow-[10px_10px_0px_#000] lg:shadow-[20px_20px_0px_#000] relative overflow-hidden hover:shadow-[25px_25px_0px_rgba(124,58,237,0.2)] transition-all duration-400">
          <div className="relative">
            <div className="text-blue-600 font-mono text-sm font-black uppercase mb-6 tracking-widest flex items-center gap-2">
              <div className="animate-spin [animation-duration:20s]">
                <Sparkles className="w-5 h-5" />
              </div>
              ROADMAP_2026
            </div>

            <div className="space-y-4">
              {phases.map((phase, index) => (
                <div
                  key={phase.phase}
                  className="relative"
                  onMouseEnter={() => setHoveredPhase(index)}
                  onMouseLeave={() => setHoveredPhase(null)}
                >
                  <div
                    className={`p-4 border-l-4 cursor-pointer transition-all duration-300 hover:translate-x-1 ${
                      hoveredPhase === index
                        ? 'border-[#0052FF] bg-blue-50 shadow-md'
                        : phase.active
                          ? 'border-blue-500'
                          : 'border-gray-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="text-2xl font-black shrink-0"
                        style={{ color: phase.color }}
                      >
                        {phase.phase}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-black uppercase tracking-widest text-sm text-gray-900">
                            {phase.title}
                          </span>
                          <div
                            className="hover:rotate-180 transition-transform duration-500"
                            style={{ color: phase.color }}
                          >
                            {phase.icon}
                          </div>
                        </div>

                        <div className="text-xs text-gray-500 font-bold uppercase mb-1">
                          {phase.subtitle}
                        </div>

                        <p className="text-xs text-gray-600 leading-relaxed mb-2">
                          {phase.desc}
                        </p>

                        {hoveredPhase === index && (
                          <div className="space-y-2 pt-2 border-t border-gray-200 animate-in fade-in duration-300">
                            {phase.active && (
                              <div className="flex items-center gap-2 text-xs text-green-600 font-bold">
                                <CheckCircle2 className="w-4 h-4" />
                                Disponible ahora
                              </div>
                            )}

                            <div className="space-y-1.5">
                              {phase.features.slice(0, 4).map((feature) => (
                                <div
                                  key={feature}
                                  className={`flex items-center gap-2 text-xs ${phase.active ? 'text-gray-600' : 'text-gray-400 italic'}`}
                                >
                                  <CheckCircle2
                                    className={`w-3 h-3 shrink-0 ${phase.active ? 'text-green-500' : 'text-gray-400'}`}
                                  />
                                  <span className="truncate">{feature}</span>
                                  {!phase.active && (
                                    <span className="text-[10px] text-gray-400 ml-1 shrink-0">
                                      (Próx.)
                                    </span>
                                  )}
                                </div>
                              ))}
                              {phase.features.length > 4 && (
                                <div
                                  className={`text-xs italic ${phase.active ? 'text-gray-400' : 'text-gray-300'}`}
                                >
                                  +{phase.features.length - 4} más...
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {index < phases.length - 1 && (
                    <div className="h-4 w-0.5 bg-gray-300 ml-6" />
                  )}
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-gray-50 border-2 border-gray-200 hover:border-[#0052FF] transition-all duration-300">
              <div className="text-sm font-black uppercase text-gray-900 mb-2">
                Inteligencia que Decide y Ejecuta
              </div>
              <div className="text-xs text-gray-600 leading-relaxed">
                Predicciones precisas y auditables para decisiones críticas de
                cartera, combinadas con comprensión natural del lenguaje.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
