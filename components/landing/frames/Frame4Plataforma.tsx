'use client'

import * as React from 'react'
import { motion, Variants } from 'framer-motion'
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
  frameVariants: Variants
  childVariants: Variants
}

export const Frame4Plataforma: React.FC<Frame4PlataformaProps> = ({
  frameVariants,
  childVariants,
}) => {
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
    <motion.div
      key="plataforma"
      initial="initial"
      animate="enter"
      exit="exit"
      variants={frameVariants}
      className="w-full max-h-[calc(100vh-160px)] lg:max-h-none overflow-y-auto lg:overflow-visible"
    >
      <motion.div 
        className="bg-white/95 backdrop-blur-md border-4 border-gray-900 p-4 sm:p-8 md:p-12 shadow-[15px_15px_0px_#000] lg:shadow-[30px_30px_0px_#000] relative overflow-hidden"
        whileHover={{ 
          boxShadow: "35px 35px 0px rgba(0,82,255,0.2)",
        }}
        transition={{ duration: 0.4 }}
      >
        {/* Background gradient */}
        <motion.div 
          className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-[#0052FF]/5 to-transparent"
          animate={{ 
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
        
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-12">
          <div className="xl:col-span-2 text-left">
            <motion.div
              variants={childVariants}
              className="inline-flex items-center gap-2 px-3 py-1 mb-6 bg-gray-900 text-white font-black text-xs uppercase tracking-widest rounded-none relative overflow-hidden group"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <motion.span
                className="absolute inset-0 bg-[#0052FF]"
                initial={{ y: "100%" }}
                whileHover={{ y: 0 }}
                transition={{ duration: 0.3 }}
              />
              <span className="relative z-10">LA PLATAFORMA</span>
            </motion.div>
            
            <motion.h2
              variants={childVariants}
              className="text-3xl sm:text-5xl md:text-6xl font-black text-gray-900 mb-4 tracking-tighter uppercase leading-none"
            >
              Capacidad{' '}
              <motion.span 
                className="text-[#0052FF] inline-block"
                whileHover={{ 
                  scale: 1.02,
                  textShadow: "0 0 30px rgba(0,82,255,0.3)"
                }}
              >
                Enterprise
              </motion.span>
            </motion.h2>
            
            <motion.p
              variants={childVariants}
              className="text-gray-900 text-base sm:text-lg font-bold uppercase mb-6 sm:mb-10"
            >
              IA operativa de clase mundial para grupos empresariales.
            </motion.p>
            
            <motion.div
              variants={childVariants}
              className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 max-w-4xl"
            >
              {/* Top row */}
              <motion.div whileHover={{ y: -5 }} transition={{ type: "spring", stiffness: 300 }}>
                <PricingCard
                  title="Starter"
                  price="49"
                  emails="500"
                  profile="Pequeña Pyme"
                />
              </motion.div>
              
              <motion.div whileHover={{ y: -5 }} transition={{ type: "spring", stiffness: 300, delay: 0.05 }}>
                <PricingCard
                  title="Growth"
                  price="149"
                  emails="2.000"
                  profile="Mediana Pyme"
                  featured
                />
              </motion.div>
              
              {/* Bottom row */}
              <motion.div whileHover={{ y: -5 }} transition={{ type: "spring", stiffness: 300, delay: 0.1 }}>
                <PricingCard
                  title="Business"
                  price="399"
                  emails="10.000"
                  profile="Corporativa"
                />
              </motion.div>
              
              <motion.div whileHover={{ y: -5 }} transition={{ type: "spring", stiffness: 300, delay: 0.15 }}>
                <PricingCard
                  title="Enterprise"
                  price="799+"
                  emails="Ilimitado"
                  profile="Grupos"
                />
              </motion.div>
            </motion.div>
          </div>
          
          <div className="border-t-4 xl:border-t-0 xl:border-l-4 border-gray-900 pt-8 xl:pt-0 xl:pl-8 text-left">
            <motion.div 
              className="text-blue-600 font-mono text-sm font-black uppercase mb-8 tracking-widest flex items-center gap-2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              >
                <Sparkles className="w-5 h-5" />
              </motion.div>
              ROADMAP_2026
            </motion.div>
            
            <div className="space-y-6">
              {phases.map((phase, index) => (
                <motion.div
                  key={phase.phase}
                  className="relative"
                  onMouseEnter={() => setHoveredPhase(index)}
                  onMouseLeave={() => setHoveredPhase(null)}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                >
                  <motion.div 
                    className={`p-5 border-l-4 cursor-pointer transition-all duration-300 ${
                      hoveredPhase === index 
                        ? 'border-[#0052FF] bg-blue-50 shadow-md' 
                        : phase.active 
                          ? 'border-blue-500' 
                          : 'border-gray-300'
                    }`}
                    whileHover={{ x: 5 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <div className="flex items-start gap-4">
                      <motion.div 
                        className="text-3xl font-black shrink-0"
                        style={{ color: phase.color }}
                        animate={phase.active ? {
                          scale: [1, 1.1, 1],
                        } : {}}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        {phase.phase}
                      </motion.div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-black uppercase tracking-widest text-base text-gray-900">
                            {phase.title}
                          </span>
                          <motion.div
                            style={{ color: phase.color }}
                            whileHover={{ rotate: 360 }}
                            transition={{ duration: 0.5 }}
                          >
                            {phase.icon}
                          </motion.div>
                        </div>
                        
                        <div className="text-xs text-gray-500 font-bold uppercase mb-2">
                          {phase.subtitle}
                        </div>
                        
                        <p className="text-sm text-gray-600 leading-relaxed mb-3">
                          {phase.desc}
                        </p>
                        
                        {hoveredPhase === index && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="space-y-3 pt-3 border-t border-gray-200"
                          >
                            {phase.active && (
                               <div className="flex items-center gap-2 text-xs text-green-600 font-bold">
                                 <CheckCircle2 className="w-4 h-4" />
                                 Disponible ahora
                               </div>
                             )}
                             
                             <div className="space-y-2">
                               {phase.features.slice(0, 5).map((feature, i) => (
                                 <motion.div
                                   key={feature}
                                   initial={{ opacity: 0, x: -10 }}
                                   animate={{ opacity: 1, x: 0 }}
                                   transition={{ delay: i * 0.05 }}
                                   className={`flex items-center gap-2 text-xs ${phase.active ? 'text-gray-600' : 'text-gray-400 italic'}`}
                                 >
                                   <CheckCircle2 className={`w-3 h-3 shrink-0 ${phase.active ? 'text-green-500' : 'text-gray-400'}`} />
                                   {feature}
                                   {!phase.active && <span className="text-[10px] text-gray-400 ml-1">(Próximamente)</span>}
                                 </motion.div>
                               ))}
                               {phase.features.length > 5 && (
                                 <div className={`text-xs italic ${phase.active ? 'text-gray-400' : 'text-gray-300'}`}>
                                   +{phase.features.length - 5} más...
                                 </div>
                               )}
                             </div>
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                  
                  {index < phases.length - 1 && (
                    <motion.div 
                      className="h-8 w-0.5 bg-gray-300 ml-8"
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: 1 }}
                      transition={{ delay: 0.5 + index * 0.1 }}
                    />
                  )}
                </motion.div>
              ))}
            </div>
            
            <motion.div 
              className="mt-8 p-5 bg-gray-50 border-2 border-gray-200"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              whileHover={{ borderColor: "#0052FF", transition: { duration: 0.3 } }}
            >
              <div className="text-sm font-black uppercase text-gray-900 mb-3">
                Inteligencia que Decide y Ejecuta
              </div>
              <div className="text-xs text-gray-600 leading-relaxed">
                Predicciones precisas y auditables para decisiones críticas de cartera, 
                combinadas con comprensión natural del lenguaje para interactuar 
                conversationalmente con tus datos.
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}