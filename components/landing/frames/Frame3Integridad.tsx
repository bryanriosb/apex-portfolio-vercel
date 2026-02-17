'use client'

import * as React from 'react'
import { motion, Variants } from 'framer-motion'
import { DataValidationAnimation } from '../DataValidationAnimation'
import { FileSpreadsheet, Copy, Eye } from 'lucide-react'
import { FeatureItem } from '../FeatureItem'

interface Frame3IntegridadProps {
  frameVariants: Variants
  childVariants: Variants
}

export const Frame3Integridad: React.FC<Frame3IntegridadProps> = ({
  frameVariants,
  childVariants,
}) => {
  return (
    <motion.div
      key="integridad"
      initial="initial"
      animate="enter"
      exit="exit"
      variants={frameVariants}
      className="w-full relative"
    >
      {/* Background decorations */}
      <motion.div 
        className="absolute -top-20 right-1/4 w-72 h-72 bg-[#0052FF]/5 rounded-full blur-3xl pointer-events-none"
        animate={{ 
          scale: [1, 1.15, 1],
          opacity: [0.2, 0.4, 0.2]
        }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
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
            className="inline-flex items-center gap-2 px-2 py-1 mb-3 sm:mb-6 bg-gray-900 text-white font-black text-[10px] sm:text-xs uppercase tracking-widest rounded-none relative overflow-hidden"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            <motion.span
              className="absolute inset-0 bg-[#0052FF]"
              initial={{ y: "100%" }}
              whileHover={{ y: 0 }}
              transition={{ duration: 0.3 }}
            />
            <span className="relative z-10">CALIDAD DE ORIGEN</span>
          </motion.div>
          
          <motion.h2
            variants={childVariants}
            className="text-2xl sm:text-5xl md:text-7xl font-black text-gray-900 mb-3 sm:mb-8 tracking-tighter leading-none uppercase"
          >
            Preparación{' '}
            <motion.span 
              className="text-[#0052FF] inline-block"
              whileHover={{ 
                scale: 1.02,
                textShadow: "0 0 30px rgba(0,82,255,0.5)"
              }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              Inteligente
            </motion.span>
          </motion.h2>
          
          <motion.p
            variants={childVariants}
            className="text-gray-900 text-sm sm:text-lg font-bold mb-4 sm:mb-12 uppercase leading-tight"
          >
            Valida tu CSV antes de enviar. Detectamos duplicados, formatos incorrectos 
            y emails inválidos para proteger la reputación de tu dominio.
          </motion.p>
          
          <motion.div variants={childVariants} className="space-y-4 sm:space-y-6">
            <motion.div whileHover={{ x: 10 }} transition={{ type: "spring", stiffness: 300 }}>
              <FeatureItem
                icon={<motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.5 }}>
                  <FileSpreadsheet className="w-6 h-6" />
                </motion.div>
              }
                title="Formato"
                desc="Verifica columnas requeridas (NIT, email, factura, monto)."
              />
            </motion.div>
            
            <motion.div whileHover={{ x: 10 }} transition={{ type: "spring", stiffness: 300 }}>
              <FeatureItem
                icon={<motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.5 }}>
                  <Copy className="w-6 h-6" />
                </motion.div>
              }
                title="Duplicados"
                desc="Detecta y elimina registros repetidos automáticamente."
              />
            </motion.div>
            
            <motion.div whileHover={{ x: 10 }} transition={{ type: "spring", stiffness: 300 }}>
              <FeatureItem
                icon={<motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.5 }}>
                  <Eye className="w-6 h-6" />
                </motion.div>
              }
                title="Preview"
                desc="Revisa los datos antes de ejecutar la campaña."
              />
            </motion.div>
          </motion.div>
        </motion.div>
        
        <motion.div
          variants={childVariants}
          className="h-[200px] sm:h-[400px] w-full relative shrink-0"
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
        >
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-[#0052FF]/10 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-500 rounded-lg"
          />
          <DataValidationAnimation />
        </motion.div>
      </div>
    </motion.div>
  )
}