'use client'

import * as React from 'react'
import { motion, Variants } from 'framer-motion'
import { Scale, FileCheck, Shield, ChevronRight } from 'lucide-react'
import { TrustCard } from '../TrustCard'

interface Frame5GobernanzaProps {
  frameVariants: Variants
  childVariants: Variants
  cardEntranceVariants: Variants
}

export const Frame5Gobernanza: React.FC<Frame5GobernanzaProps> = ({
  frameVariants,
  childVariants,
  cardEntranceVariants,
}) => {
  const cards = [
    {
      icon: <Scale />,
      title: 'Deep Compliance',
      desc: 'Manejo de normativas locales que herramientas globales ignoran.',
      details: ['Ley 1480', 'Ley 1116', 'Datacrédito', 'DIAN'],
    },
    {
      icon: <FileCheck />,
      title: 'Activos Legales',
      desc: 'Validación criptográfica de documentos soporte de facturación.',
      details: [
        'Certificación bancaria',
        'RUT válido',
        'Firma digital',
        'Trazabilidad',
      ],
    },
    {
      icon: <Shield />,
      title: 'Infraestructura',
      desc: 'Seguridad grado bancario sobre AWS con redundancia 24/7.',
      details: [
        'AWS VPC',
        'Encriptación TLS',
        'Backups automáticos',
        'SLA 99.9%',
      ],
    },
  ]

  return (
    <motion.div
      key="gobernanza"
      initial="initial"
      animate="enter"
      exit="exit"
      variants={frameVariants}
      className="w-full text-left relative max-h-[calc(100vh-160px)] lg:max-h-none overflow-y-auto lg:overflow-visible"
    >
      {/* Background decoration */}
      <motion.div
        className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-gradient-to-b from-[#0052FF]/5 to-transparent rounded-full blur-3xl pointer-events-none"
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.2, 0.3, 0.2],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      />

      <motion.div
        className="max-w-3xl mb-8 sm:mb-12 bg-white border-4 border-gray-900 p-6 sm:p-10 shadow-[15px_15px_0px_#000] relative overflow-hidden group mx-4 sm:mx-0"
        whileHover={{
          boxShadow: '20px 20px 0px_#0052FF',
          transition: { duration: 0.3 },
        }}
      >
        <motion.div className="absolute inset-0 bg-gradient-to-br from-[#0052FF]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        <motion.div
          variants={childVariants}
          className="inline-flex items-center gap-2 px-3 py-1 mb-6 bg-gray-900 text-white font-black text-xs uppercase tracking-widest rounded-none relative overflow-hidden"
          whileHover={{ scale: 1.05 }}
          transition={{ type: 'spring', stiffness: 400, damping: 10 }}
        >
          <motion.span
            className="absolute inset-0 bg-[#0052FF]"
            initial={{ y: '100%' }}
            whileHover={{ y: 0 }}
            transition={{ duration: 0.3 }}
          />
          <span className="relative z-10">GOBERNANZA</span>
        </motion.div>

        <motion.h2
          variants={childVariants}
          className="text-3xl sm:text-5xl md:text-7xl font-black text-gray-900 mb-4 sm:mb-6 tracking-tighter uppercase leading-none"
        >
          Trazabilidad{' '}
          <motion.span
            className="text-[#0052FF] inline-block"
            whileHover={{
              scale: 1.02,
              textShadow: '0 0 30px rgba(0,82,255,0.5)',
            }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            LatAm Nativa
          </motion.span>
        </motion.h2>

        <motion.p
          variants={childVariants}
          className="text-gray-900 text-base sm:text-lg font-bold uppercase"
        >
          Cumplimiento nativo con Ley 1480, Ley 1116 y normativas DIAN /
          Datacrédito.
        </motion.p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 px-4 sm:px-0">
        {cards.map((card, i) => (
          <motion.div
            key={card.title}
            custom={i}
            variants={cardEntranceVariants}
            initial="initial"
            animate="enter"
            whileHover={{
              y: -10,
              transition: { type: 'spring', stiffness: 300 },
            }}
          >
            <motion.div
              className="h-full"
              whileHover={{
                boxShadow: '15px 15px 0px_#0052FF',
              }}
              transition={{ duration: 0.3 }}
            >
              <TrustCard {...card} />
            </motion.div>
          </motion.div>
        ))}
      </div>

      {/* Additional trust indicators */}
      <motion.div
        className="mt-8 sm:mt-12 flex flex-wrap gap-2 sm:gap-4 justify-center px-4 sm:px-0"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        {[
          'Sin lock-in',
          'Datos portables',
          'API abierta',
          'Open standards',
        ].map((item, i) => (
          <div
            key={item}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 border-2 border-gray-900 text-xs font-black uppercase text-gray-900 hover:bg-[#0052FF] hover:text-white hover:scale-105 transition-all duration-300 cursor-pointer"
          >
            <ChevronRight className="w-3 h-3" />
            <span className="text-inherit">{item}</span>
          </div>
        ))}
      </motion.div>
    </motion.div>
  )
}
