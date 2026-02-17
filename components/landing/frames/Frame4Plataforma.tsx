'use client'

import * as React from 'react'
import { PricingCard } from '../PricingCard'
import { RoadmapStep } from '../RoadmapStep'
import { 
  Target, 
  Sparkles, 
  Brain, 
  Workflow,
  CheckCircle2
} from 'lucide-react'

interface Frame4PlataformaProps {
  frameVariants?: never
  childVariants?: never
}

export const Frame4Plataforma: React.FC<Frame4PlataformaProps> = () => {
  const [hoveredPhase, setHoveredPhase] = React.useState<number | null>(null)

  const phases = [
    {
      phase: "01",
      title: "Collections",
      subtitle: "Fase Actual",
      desc: "Recaudo multi-canal inteligente",
      active: true,
      features: [
        "Wizard 3 pasos completo",
        "Tracking en tiempo real",
        "Motor de plantillas",
        "Gestión de adjuntos",
        "KPI dashboard",
        "Inbox integrado",
        "Acuerdos de pago",
        "Scoring básico ML",
        "Multi-canal (WhatsApp API)",
        "Integraciones ERP (Siigo, World Office)"
      ],
      icon: <Target className="w-5 h-5" />,
      color: "#0052FF"
    },
    {
      phase: "02",
      title: "Intelligence",
      subtitle: "En desarrollo",
      desc: "Modelos propensión IA + Agentes autónomos",
      features: [
        "Agente de cobro autónomo",
        "Modelo de propensión de pago",
        "Predicción 7/15/30 días",
        "Dashboard predictivo",
        "Interfaz conversacional NLP",
        "Priorización automática",
        "Secuencia óptima de contacto",
        "Análisis de comportamiento",
        "Alertas proactivas",
        "Escalado inteligente"
      ],
      icon: <Brain className="w-5 h-5" />,
      color: "#7C3AED"
    },
    {
      phase: "03",
      title: "Platform",
      subtitle: "Visión futura",
      desc: "Tesorería integrada + Planeación financiera",
      features: [
        "Módulo tesorería completo",
        "Proyección flujo de caja",
        "Módulo planeación financiera",
        "Escenarios 30/60/90 días",
        "Orquestación multi-agentes",
        "Agente de tesorería",
        "Agente de alertas",
        "Marketplace integraciones",
        "API pública",
        "Multi-empresa / Grupos"
      ],
      icon: <Workflow className="w-5 h-5" />,
      color: "#059669"
    }
  ]

  return (
    <div
      className="w-full animate-in fade-in duration-500"
    >
      <div 
        className="bg-white/95 backdrop-blur-md border-4 border-gray-900 p-4 sm:p-8 md:p-12 shadow-[15px_15px_0px_#000] lg:shadow-[30px_30px_0px_#000] relative overflow-hidden hover:shadow-[35px_35px_0px_rgba(0,82,255,0.2)] transition-all duration-400"
      >
        {/* Background gradient - Tailwind animation */}
        <div 
          className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-[#0052FF]/5 to-transparent animate-pulse [animation-duration:6s]"
        />
        
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-12">
          <div className="xl:col-span-2 text-left">
            <div
              className="inline-flex items-center gap-2 px-3 py-1 mb-6 bg-gray-900 text-white font-black text-xs uppercase tracking-widest rounded-none relative overflow-hidden group hover:scale-[1.02] transition-transform duration-200"
            >
              <span className="absolute inset-0 bg-[#0052FF] translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              <span className="relative z-10">LA PLATAFORMA</span>
            </div>
            
            <h2
              className="text-3xl sm:text-5xl md:text-6xl font-black text-gray-900 mb-4 tracking-tighter uppercase leading-none animate-in slide-in-from-bottom-4 duration-700 fill-mode-forwards"
            >
              Capacidad{' '}
              <span 
                className="text-[#0052FF] inline-block hover:scale-[1.02] transition-transform duration-300"
              >
                Enterprise
              </span>
            </h2>
            
            <p
              className="text-gray-900 text-base sm:text-lg font-bold uppercase mb-6 sm:mb-10 animate-in slide-in-from-bottom-4 duration-700 delay-200 fill-mode-forwards"
            >
              IA operativa de clase mundial para grupos empresariales.
            </p>
            
            <div
              className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 max-w-4xl animate-in slide-in-from-bottom-4 duration-700 delay-400 fill-mode-forwards"
            >
              {/* Top row */}
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
              
              {/* Bottom row */}
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
          
          <div className="border-t-4 xl:border-t-0 xl:border-l-4 border-gray-900 pt-8 xl:pt-0 xl:pl-8 text-left">
            <div 
              className="text-blue-600 font-mono text-sm font-black uppercase mb-8 tracking-widest flex items-center gap-2 animate-in slide-in-from-left-4 duration-500 delay-500 fill-mode-forwards"
            >
              <div
                className="animate-spin [animation-duration:20s]"
              >
                <Sparkles className="w-5 h-5" />
              </div>
              ROADMAP_2026
            </div>
            
            <div className="space-y-6">
              {phases.map((phase, index) => (
                <div
                  key={phase.phase}
                  className="relative animate-in slide-in-from-left-4 duration-500 fill-mode-forwards"
                  style={{ animationDelay: `${0.6 + index * 0.1}s` }}
                  onMouseEnter={() => setHoveredPhase(index)}
                  onMouseLeave={() => setHoveredPhase(null)}
                >
                  <div 
                    className={`p-5 border-l-4 cursor-pointer transition-all duration-300 hover:translate-x-1 ${
                      hoveredPhase === index 
                        ? 'border-[#0052FF] bg-blue-50 shadow-md' 
                        : phase.active 
                          ? 'border-blue-500' 
                          : 'border-gray-300'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div 
                        className="text-3xl font-black shrink-0"
                        style={{ color: phase.color }}
                      >
                        {phase.phase}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-black uppercase tracking-widest text-base text-gray-900">
                            {phase.title}
                          </span>
                          <div
                            className="hover:rotate-180 transition-transform duration-500"
                            style={{ color: phase.color }}
                          >
                            {phase.icon}
                          </div>
                        </div>
                        
                        <div className="text-xs text-gray-500 font-bold uppercase mb-2">
                          {phase.subtitle}
                        </div>
                        
                        <p className="text-sm text-gray-600 leading-relaxed mb-3">
                          {phase.desc}
                        </p>
                        
                        {hoveredPhase === index && (
                          <div
                            className="space-y-3 pt-3 border-t border-gray-200 animate-in fade-in duration-300"
                          >
                            {phase.active && (
                               <div className="flex items-center gap-2 text-xs text-green-600 font-bold">
                                 <CheckCircle2 className="w-4 h-4" />
                                 Disponible ahora
                               </div>
                             )}
                             
                             <div className="space-y-2">
                               {phase.features.slice(0, 5).map((feature, i) => (
                                 <div
                                   key={feature}
                                   className={`flex items-center gap-2 text-xs ${phase.active ? 'text-gray-600' : 'text-gray-400 italic'}`}
                                 >
                                   <CheckCircle2 className={`w-3 h-3 shrink-0 ${phase.active ? 'text-green-500' : 'text-gray-400'}`} />
                                   {feature}
                                   {!phase.active && <span className="text-[10px] text-gray-400 ml-1">(Próximamente)</span>}
                                 </div>
                               ))}
                               {phase.features.length > 5 && (
                                 <div className={`text-xs italic ${phase.active ? 'text-gray-400' : 'text-gray-300'}`}>
                                   +{phase.features.length - 5} más...
                                 </div>
                               )}
                             </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {index < phases.length - 1 && (
                    <div 
                      className="h-8 w-0.5 bg-gray-300 ml-8 animate-in zoom-in-50 fill-mode-forwards"
                      style={{ animationDelay: `${0.8 + index * 0.1}s` }}
                    />
                  )}
                </div>
              ))}
            </div>
            
            <div 
              className="mt-8 p-5 bg-gray-50 border-2 border-gray-200 hover:border-[#0052FF] transition-all duration-300 animate-in slide-in-from-bottom-4 duration-500 delay-800 fill-mode-forwards"
            >
              <div className="text-sm font-black uppercase text-gray-900 mb-3">
                Inteligencia que Decide y Ejecuta
              </div>
              <div className="text-xs text-gray-600 leading-relaxed">
                Predicciones precisas y auditables para decisiones críticas de cartera, 
                combinadas con comprensión natural del lenguaje para interactuar 
                conversationalmente con tus datos.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
