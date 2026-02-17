'use client'

import * as React from 'react'
import { motion, Variants } from 'framer-motion'
import { TechnicalTypewriter } from '../apex/TechnicalTypewriter'
import { Metric } from '../Metric'

interface Frame0ROIProps {
  frameVariants: Variants
  childVariants: Variants
}

export const Frame0ROI: React.FC<Frame0ROIProps> = ({
  frameVariants,
  childVariants,
}) => {
  return (
    <motion.div
      key="roi"
      initial="initial"
      animate="enter"
      exit="exit"
      variants={frameVariants}
      className="w-full flex items-center justify-center relative"
    >
      {/* Floating decorative elements */}
      <motion.div 
        className="absolute -top-20 -left-20 w-40 h-40 bg-[#0052FF]/10 rounded-full blur-3xl pointer-events-none"
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3]
        }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div 
        className="absolute -bottom-20 -right-20 w-60 h-60 bg-[#0052FF]/5 rounded-full blur-3xl pointer-events-none"
        animate={{ 
          scale: [1.2, 1, 1.2],
          opacity: [0.2, 0.4, 0.2]
        }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      
      <motion.div 
        className="max-w-5xl bg-white border-4 border-gray-900 p-6 sm:p-10 md:p-16 relative overflow-hidden text-center mx-4 sm:mx-0"
        initial={{ boxShadow: "20px 20px 0px rgba(0,82,255,0.2)" }}
        animate={{ 
          boxShadow: [
            "20px 20px 0px rgba(0,82,255,0.2)",
            "20px 20px 30px rgba(0,82,255,0.4)",
            "20px 20px 0px rgba(0,82,255,0.2)"
          ]
        }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        whileHover={{ 
          boxShadow: "25px 25px 0px rgba(0,82,255,0.3)",
          transition: { duration: 0.3 }
        }}
      >
        {/* Corner accents */}
        <motion.div 
          className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-[#0052FF]/10 to-transparent"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.5 }}
        />
        <motion.div 
          className="absolute bottom-0 left-0 w-20 h-20 bg-gradient-to-tr from-gray-100 to-transparent"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.5 }}
        />
        
        <motion.div
          variants={childVariants}
          className="inline-flex items-center gap-2 px-4 py-1.5 mb-8 bg-gray-900 text-white font-black text-xs uppercase tracking-widest rounded-none relative overflow-hidden group cursor-default"
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 400, damping: 10 }}
        >
          <motion.span
            className="absolute inset-0 bg-[#0052FF]"
            initial={{ x: "-100%" }}
            whileHover={{ x: 0 }}
            transition={{ duration: 0.3 }}
          />
          <span className="relative z-10">ESTRATEGIA</span>
        </motion.div>
        
        <motion.h1
          variants={childVariants}
          className="grid gap-2 sm:gap-3 text-3xl sm:text-5xl md:text-8xl font-black text-gray-900 mb-6 sm:mb-8 leading-[0.85] tracking-tighter uppercase text-left"
        >
          <motion.span
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            <TechnicalTypewriter text="RECAUDO" delay={500} />
          </motion.span>
          <span className="text-[#0052FF]">
            <TechnicalTypewriter text="AUTÓNOMO" delay={1500} />
          </span>
        </motion.h1>
        
        <motion.p
          variants={childVariants}
          className="text-base sm:text-lg md:text-xl text-gray-900 max-w-3xl mr-auto text-left font-bold leading-tight mb-8 sm:mb-12 uppercase"
        >
          Potencie la operación de su empresa con agentes IA que planifican y
          ejecutan procesos críticos de cartera.
        </motion.p>
        
        <motion.div
          variants={childVariants}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 md:gap-12 pt-6 sm:pt-10 border-t-4 border-gray-900"
        >
          <motion.div
            whileHover={{ y: -5, scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <Metric value="35%+" label="Open Rate Objetivo" />
          </motion.div>
          <motion.div
            whileHover={{ y: -5, scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
          >
            <Metric value="ROI" label="Medible Mes 1" />
          </motion.div>
          <motion.div
            whileHover={{ y: -5, scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.2 }}
          >
            <Metric value="100%" label="Basado en Datos" />
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}