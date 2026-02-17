'use client'

import * as React from 'react'
import { motion, Variants } from 'framer-motion'
import { ArrowRight, Sparkles, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Frame6CierreProps {
  frameVariants: Variants
  childVariants: Variants
}

export const Frame6Cierre: React.FC<Frame6CierreProps> = ({
  frameVariants,
  childVariants,
}) => {
  const tags = ['SIIGO_SYNC', 'WORLD_OFFICE', 'AWS_VPC', 'LATAM_READY', 'ML_MODELS', 'API_REST']
  const [hoveredTag, setHoveredTag] = React.useState<string | null>(null)

  return (
    <motion.div
      key="contacto"
      initial="initial"
      animate="enter"
      exit="exit"
      variants={frameVariants}
      className="w-full max-h-[calc(100vh-160px)] lg:max-h-none overflow-y-auto lg:overflow-visible"
    >
      <motion.div 
        className="bg-gray-900 text-white border-4 border-white/20 p-6 sm:p-10 md:p-16 relative overflow-hidden text-center backdrop-blur-2xl mx-4 sm:mx-0"
        whileHover={{ 
          borderColor: "rgba(0,82,255,0.5)",
        }}
        transition={{ duration: 0.5 }}
      >
        {/* Animated background effects */}
        <motion.div 
          className="absolute inset-0 opacity-30"
          style={{
            background: "radial-gradient(circle at 50% 50%, rgba(0,82,255,0.3) 0%, transparent 70%)"
          }}
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.4, 0.2]
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        
        <motion.div 
          className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/20 rounded-full blur-[100px]"
          animate={{ 
            x: [0, 30, 0],
            y: [0, -30, 0],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        
        <motion.div 
          className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-[#0052FF]/10 rounded-full blur-[100px]"
          animate={{ 
            x: [0, -30, 0],
            y: [0, 30, 0],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
        
        <div className="relative z-10">
          <motion.div
            variants={childVariants}
            className="text-blue-500 font-mono text-xs mb-8 tracking-[0.5em] uppercase font-black flex items-center justify-center gap-3"
          >
            <motion.div
              animate={{ 
                rotate: [0, 360],
                scale: [1, 1.2, 1]
              }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <Sparkles className="w-4 h-4" />
            </motion.div>
            DEPLOYMENT_READY
            <motion.div
              animate={{ 
                rotate: [360, 0],
                scale: [1, 1.2, 1]
              }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <Sparkles className="w-4 h-4" />
            </motion.div>
          </motion.div>
          
          <motion.h2
            variants={childVariants}
            className="text-3xl sm:text-5xl md:text-7xl lg:text-9xl font-black mb-8 sm:mb-12 tracking-tighter uppercase leading-none"
          >
            Active su{' '}
            <motion.span 
              className="text-blue-500 inline-block"
              whileHover={{ 
                scale: 1.05,
                textShadow: "0 0 60px rgba(59,130,246,0.8)"
              }}
              transition={{ type: "spring", stiffness: 200 }}
            >
              Liquidez
            </motion.span>
          </motion.h2>
          
          <motion.div variants={childVariants}>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <Button 
                className="bg-[#0052FF] text-white font-black text-xs sm:text-sm uppercase tracking-widest rounded-none h-14 sm:h-20 px-8 sm:px-16 border-2 border-white shadow-[4px_4px_0px_#0052FF] sm:shadow-[8px_8px_0px_#0052FF] hover:shadow-none hover:bg-white hover:text-gray-900 transition-all group relative overflow-hidden"
              >
                <motion.span
                  className="absolute inset-0 bg-white"
                  initial={{ x: "-100%" }}
                  whileHover={{ x: 0 }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                />
                <span className="relative z-10 flex items-center gap-2">
                  Iniciar Ahora
                  <motion.div
                    className="group-hover:translate-x-2 transition-transform"
                  >
                    <ArrowRight className="w-5 h-5" />
                  </motion.div>
                </span>
              </Button>
            </motion.div>
            
            <motion.p
              className="mt-6 text-gray-400 text-sm font-medium"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
            >
              Demo gratuita · Sin tarjeta de crédito · Setup en 15 minutos
            </motion.p>
          </motion.div>
          
          <div className="mt-12 sm:mt-24 flex flex-wrap gap-3 sm:gap-8 justify-center px-2 sm:px-0">
            {tags.map((tag, i) => (
              <motion.span
                key={tag}
                className="border-2 border-white/30 px-2 sm:px-4 py-1 sm:py-1.5 text-[8px] sm:text-[10px] uppercase font-mono font-black cursor-pointer relative overflow-hidden"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 0.6, y: 0 }}
                transition={{ delay: 1.2 + i * 0.1 }}
                onMouseEnter={() => setHoveredTag(tag)}
                onMouseLeave={() => setHoveredTag(null)}
                whileHover={{ 
                  borderColor: "#0052FF",
                  color: "#fff",
                  opacity: 1,
                  scale: 1.1
                }}
              >
                <motion.span
                  className="absolute inset-0 bg-[#0052FF]"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: hoveredTag === tag ? 1 : 0 }}
                  transition={{ duration: 0.3 }}
                  style={{ originX: 0 }}
                />
                <span className="relative z-10">{tag}</span>
              </motion.span>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}