'use client'

import * as React from 'react'
import { motion, Variants } from 'framer-motion'
import { Zap, ShieldCheck, TrendingUp, Mail, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { FeatureItem } from '../FeatureItem'

interface Frame1SeguridadProps {
  frameVariants: Variants
  childVariants: Variants
  activeStrategy: 'apex' | 'legacy'
  setActiveStrategy: (strategy: 'apex' | 'legacy') => void
}

export const Frame1Seguridad: React.FC<Frame1SeguridadProps> = ({
  frameVariants,
  childVariants,
}) => {
  const [isVisible, setIsVisible] = React.useState(false)

  React.useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 500)
    return () => clearTimeout(timer)
  }, [])

  const apexRate = 94
  const bulkRate = 62

  return (
    <motion.div
      key="seguridad"
      initial="initial"
      animate="enter"
      exit="exit"
      variants={frameVariants}
      className="w-full relative"
    >
      <motion.div 
        className="absolute -top-32 left-1/4 w-96 h-96 bg-gradient-to-br from-[#0052FF]/5 to-transparent rounded-full blur-3xl pointer-events-none"
        animate={{ 
          scale: [1, 1.1, 1],
          opacity: [0.3, 0.5, 0.3]
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-20 items-start w-full px-4 sm:px-0 max-h-[calc(100vh-140px)] lg:max-h-none overflow-y-auto lg:overflow-visible">
        <motion.div 
          className="bg-white border-4 border-gray-900 p-4 sm:p-6 lg:p-10 shadow-[8px_8px_0px_#000] lg:shadow-[15px_15px_0px_#000] text-left relative overflow-hidden group shrink-0"
          whileHover={{ 
            boxShadow: "20px 20px 0px_#0052FF",
            transition: { duration: 0.3 }
          }}
        >
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-[#0052FF]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          />
          
          <motion.div
            variants={childVariants}
            className="inline-flex items-center gap-2 px-2 py-1 mb-3 sm:mb-6 bg-[#0052FF] text-white font-black text-[10px] sm:text-xs uppercase tracking-widest rounded-none relative overflow-hidden"
          >
            <motion.span
              className="absolute inset-0 bg-gray-900"
              initial={{ y: "100%" }}
              whileHover={{ y: 0 }}
              transition={{ duration: 0.3 }}
            />
            <span className="relative z-10 group-hover:text-white transition-colors">POR QUÉ APEX</span>
          </motion.div>
          
          <motion.h2
            variants={childVariants}
            className="text-2xl sm:text-5xl md:text-7xl font-black text-gray-900 mb-3 sm:mb-8 tracking-tighter leading-none uppercase"
          >
            Seguridad <br className="hidden sm:block" />{' '}
            <motion.span className="text-[#0052FF]">
              De Dominio
            </motion.span>
          </motion.h2>
          
          <motion.p
            variants={childVariants}
            className="text-gray-900 text-sm sm:text-lg font-bold mb-4 sm:mb-12 uppercase leading-tight"
          >
            Protegemos su reputación digital mientras escalamos el
            recaudo mediante Smart Ramp-Up.
          </motion.p>
          
          <motion.div variants={childVariants} className="space-y-4 sm:space-y-6">
            <motion.div whileHover={{ x: 10 }} transition={{ type: "spring", stiffness: 300 }}>
              <FeatureItem
                icon={<motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.5 }}>
                  <Zap className="w-6 h-6" />
                </motion.div>
              }
                title="Smart Ramp-Up"
                desc="Escalado automático de reputación."
              />
            </motion.div>
            
            <motion.div whileHover={{ x: 10 }} transition={{ type: "spring", stiffness: 300 }}>
              <FeatureItem
                icon={<motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.5 }}>
                  <ShieldCheck className="w-6 h-6" />
                </motion.div>
              }
                title="Protección Activa"
                desc="Prevención de listas negras IA."
              />
            </motion.div>
          </motion.div>
        </motion.div>
        
        <motion.div
          variants={childVariants}
          className="bg-gray-900 border-4 border-gray-900 p-4 sm:p-8 md:p-12 shadow-[8px_8px_0px_#000] lg:shadow-[20px_20px_0px_#000] relative overflow-hidden shrink-0"
          whileHover={{ 
            boxShadow: "25px_25px_0px_rgba(0,82,255,0.3)",
          }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
        >
          <motion.div
            className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-[100px]"
            animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
            transition={{ duration: 8, repeat: Infinity }}
          />
          
          <motion.div
            className="absolute bottom-0 left-0 w-64 h-64 bg-[#0052FF]/5 blur-[100px]"
            animate={{ scale: [1.2, 1, 1.2], opacity: [0.1, 0.15, 0.1] }}
            transition={{ duration: 10, repeat: Infinity }}
          />

          <div className="relative z-10">
            <div className="mb-4 sm:mb-10">
              <motion.div 
                className="text-[10px] font-mono text-blue-400 font-black tracking-widest uppercase mb-1 sm:mb-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                COMPARATIVA DE ENTREGABILIDAD
              </motion.div>
              
              <motion.h3
                className="text-lg sm:text-2xl md:text-3xl font-black text-white uppercase tracking-tight"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                ¿Cuál llega al inbox?
              </motion.h3>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:gap-8 mb-4 sm:mb-10">
              <motion.div className="space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={isVisible ? { scale: 1 } : {}}
                    transition={{ delay: 0.5, type: "spring" }}
                  >
                    <CheckCircle2 className="w-6 h-6 text-blue-400" />
                  </motion.div>
                  <span className="text-xs font-black uppercase tracking-widest text-blue-400">
                    APEX Engine
                  </span>
                </div>
                
                <motion.div
                  className="text-3xl sm:text-6xl md:text-7xl font-black text-white font-mono tracking-tighter"
                  initial={{ opacity: 0, y: 20 }}
                  animate={isVisible ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: 0.6, type: "spring", stiffness: 100 }}
                >
                  {apexRate}
                  <span className="text-xl sm:text-2xl text-blue-400">%</span>
                </motion.div>
                
                <motion.div
                  className="h-2 sm:h-3 bg-gray-800 border border-gray-700 p-0.5"
                >
                  <motion.div
                    className="h-full bg-blue-500"
                    initial={{ width: 0 }}
                    animate={isVisible ? { width: `${apexRate}%` } : {}}
                    transition={{ delay: 0.8, duration: 1.2, ease: "easeOut" }}
                  />
                </motion.div>
                
                <motion.div
                  className="flex items-center gap-2 text-xs text-gray-400"
                  initial={{ opacity: 0 }}
                  animate={isVisible ? { opacity: 1 } : {}}
                  transition={{ delay: 1 }}
                >
                  <Mail className="w-3 h-3" />
                  <span>Inbox garantizado</span>
                </motion.div>
              </motion.div>

              <motion.div className="space-y-4 opacity-50">
                <div className="flex items-center gap-3 mb-2">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={isVisible ? { scale: 1 } : {}}
                    transition={{ delay: 0.6, type: "spring" }}
                  >
                    <AlertTriangle className="w-6 h-6 text-red-400" />
                  </motion.div>
                  
                  <span className="text-xs font-black uppercase tracking-widest text-red-400">
                    Sistemas Bulk
                  </span>
                </div>
                
                <motion.div
                  className="text-3xl sm:text-6xl md:text-7xl font-black text-gray-500 font-mono tracking-tighter"
                  initial={{ opacity: 0, y: 20 }}
                  animate={isVisible ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: 0.7, type: "spring", stiffness: 100 }}
                >
                  {bulkRate}
                  <span className="text-xl sm:text-2xl text-gray-600">%</span>
                </motion.div>
                
                <motion.div
                  className="h-2 sm:h-3 bg-gray-800 border border-gray-700 p-0.5"
                >
                  <motion.div
                    className="h-full bg-red-500"
                    initial={{ width: 0 }}
                    animate={isVisible ? { width: `${bulkRate}%` } : {}}
                    transition={{ delay: 0.9, duration: 1.2, ease: "easeOut" }}
                  />
                </motion.div>
                
                <motion.div
                  className="flex items-center gap-2 text-xs text-gray-500"
                  initial={{ opacity: 0 }}
                  animate={isVisible ? { opacity: 1 } : {}}
                  transition={{ delay: 1.1 }}
                >
                  <Mail className="w-3 h-3" />
                  <span>Alto riesgo de spam</span>
                </motion.div>
              </motion.div>
            </div>

            <motion.div
              className="bg-white border-2 border-gray-700 p-3 sm:p-6"
              initial={{ opacity: 0, y: 20 }}
              animate={isVisible ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 1.2 }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 sm:gap-4">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-[#0052FF]" />
                  </motion.div>
                  
                  <div>
                    <div className="text-xl sm:text-3xl font-black text-gray-900">
                      +{apexRate - bulkRate}%
                    </div>
                    <div className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Más emails en inbox
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-widest">
                    Ventaja
                  </div>
                  <div className="text-xs sm:text-sm font-black text-[#0052FF]">
                    APEX
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}