'use client'

import * as React from 'react'
import { motion, Variants } from 'framer-motion'
import { Activity, Eye, Brain, ArrowUpRight } from 'lucide-react'
import { StatCard } from '../StatCard'

interface TelemetryLog {
  time: string
  type: string
  id: string
}

interface Frame2TelemetriaProps {
  frameVariants: Variants
  childVariants: Variants
  logs: TelemetryLog[]
}

export const Frame2Telemetria: React.FC<Frame2TelemetriaProps> = ({
  frameVariants,
  childVariants,
  logs,
}) => {
  return (
    <motion.div
      key="telemetria"
      initial="initial"
      animate="enter"
      exit="exit"
      variants={frameVariants}
      className="w-full"
    >
      <motion.div
        className="bg-gray-900 border-4 border-gray-900 p-3 sm:p-8 md:p-16 shadow-[15px_15px_0px_#000] lg:shadow-[30px_30px_0px_#000] relative overflow-hidden"
        whileHover={{
          boxShadow: '35px 35px 0px rgba(0,82,255,0.3)',
        }}
        transition={{ duration: 0.4 }}
      >
        {/* Animated background gradient */}
        <motion.div
          className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 blur-[100px]"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.2, 0.1],
            x: [0, 50, 0],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />

        <motion.div
          className="absolute bottom-0 left-0 w-64 h-64 bg-[#0052FF]/5 blur-[80px]"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.1, 0.15, 0.1],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-20 items-start w-full relative z-10 max-h-[calc(100vh-140px)] lg:max-h-none overflow-y-auto lg:overflow-visible">
          <motion.div variants={childVariants} className="order-2 lg:order-1">
            <motion.div
              className="bg-white border-4 border-[#0052FF] p-3 sm:p-8 text-gray-900 shadow-[8px_8px_0px_#0052FF] lg:shadow-[15px_15px_0px_#0052FF] relative overflow-hidden group"
              whileHover={{
                boxShadow: '20px 20px 0px_#0052FF, 0 0 40px rgba(0,82,255,0.2)',
                scale: 1.01,
              }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            >
              {/* Scanning line effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0052FF]/10 to-transparent h-20 pointer-events-none"
                animate={{
                  y: [-100, 400],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: 'linear',
                }}
              />

              <motion.div
                className="text-[9px] sm:text-[10px] font-mono text-[#0052FF] font-black uppercase mb-3 sm:mb-6 flex items-center gap-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <motion.div
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [1, 0.5, 1],
                  }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <Activity className="w-3 h-3" />
                </motion.div>{' '}
                MONITOR_OPERATIVO_VIVO
              </motion.div>

              <div className="space-y-2 sm:space-y-4 h-32 sm:h-64 overflow-hidden font-mono text-[9px] sm:text-xs text-left relative">
                {logs.slice(0, 4).map((log, i) => (
                  <motion.div
                    key={`${log.id}-${i}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className={`p-2 sm:p-3 border-l-4 transition-all duration-300 ${i === 0 ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'}`}
                  >
                    {`> [${log.time}] EVENT: ${log.type} ID_${log.id}`}
                  </motion.div>
                ))}

                {/* Gradient fade at bottom */}
                <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white to-transparent pointer-events-none" />
              </div>
            </motion.div>
          </motion.div>

          <motion.div
            variants={childVariants}
            className="order-1 lg:order-2 space-y-3 sm:space-y-8 text-left"
          >
            <motion.div
              className="inline-flex items-center gap-2 px-2 py-1 bg-blue-500 text-white font-black text-[10px] sm:text-xs uppercase tracking-widest rounded-none relative overflow-hidden group"
              whileHover={{ scale: 1.05 }}
              transition={{ type: 'spring', stiffness: 400, damping: 10 }}
            >
              <motion.span
                className="absolute inset-0 bg-white"
                initial={{ x: '-100%' }}
                whileHover={{ x: 0 }}
                transition={{ duration: 0.3 }}
              />
              <span className="relative z-10 group-hover:text-blue-500 transition-colors">
                VISIBILIDAD TOTAL
              </span>
            </motion.div>

            <h2 className="text-2xl sm:text-5xl md:text-7xl font-black text-white mb-3 sm:mb-8 tracking-tighter leading-none uppercase">
              Telemetría{' '}
              <motion.span
                className="text-blue-500 inline-block"
                whileHover={{
                  scale: 1.02,
                  textShadow: '0 0 30px rgba(59,130,246,0.5)',
                }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                Sin Ceguera
              </motion.span>
            </h2>

            <p className="text-gray-400 text-sm sm:text-lg font-bold uppercase leading-tight">
              APEX separa deudores colaborativos de evasivos en tiempo real.
              Optimice su equipo enfocándolo en casos de alto valor.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6 pt-2 sm:pt-4">
              <motion.div
                whileHover={{ y: -5, scale: 1.02 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <StatCard
                  icon={
                    <motion.div
                      whileHover={{ rotate: 15 }}
                      transition={{ type: 'spring', stiffness: 300 }}
                    >
                      <Eye />
                    </motion.div>
                  }
                  title="Detección Real"
                  desc="Tasa de Apertura, Rebotes y reportes de SPAM en tiempo real."
                />
              </motion.div>

              <motion.div
                whileHover={{ y: -5, scale: 1.02 }}
                transition={{
                  type: 'spring',
                  stiffness: 300,
                  damping: 20,
                  delay: 0.1,
                }}
              >
                <StatCard
                  icon={
                    <motion.div
                      whileHover={{ rotate: 15 }}
                      transition={{ type: 'spring', stiffness: 300 }}
                    >
                      <Brain />
                    </motion.div>
                  }
                  title="Conducta LatAm"
                  desc="Modelos entrenados con patrones regionales."
                />
              </motion.div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  )
}
