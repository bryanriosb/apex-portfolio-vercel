'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react'

const benefits = [
  'Sin tarjeta de crédito',
  'Configuración en 15 minutos',
  'Soporte 24/7 incluido',
]

export function CTA() {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative rounded-[2.5rem] overflow-hidden"
        >
          {/* Background layers */}
          <div className="absolute inset-0 bg-gradient-to-r from-secondary via-accent to-secondary" />
          <div className="absolute inset-0 bg-[url('/27l4R4D3Ig-beluvio.jpg')] bg-cover bg-center opacity-10" />

          {/* Animated blobs - subtle */}
          <div className="absolute -top-20 -left-20 w-[400px] h-[400px] bg-primary/20 rounded-full blur-[100px] animate-blob" />
          <div className="absolute -bottom-20 -right-20 w-[350px] h-[350px] bg-white/10 rounded-full blur-[100px] animate-blob animation-delay-2000" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-primary/15 rounded-full blur-[80px] animate-blob animation-delay-4000" />

          {/* Content */}
          <div className="relative px-8 py-16 md:px-16 md:py-24">
            <div className="max-w-3xl mx-auto text-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm text-white text-sm font-medium mb-8"
              >
                <Sparkles className="h-4 w-4" />
                Comienza tu prueba gratuita
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6"
              >
                Transforma tu negocio de belleza{' '}
                <span className="text-primary">hoy mismo</span>
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="text-lg text-white/80 max-w-2xl mx-auto mb-8"
              >
                Únete y optimiza su gestión con Beluvio una herramienta pensada
                para tu negocio de belleza. Comienza gratis y ve los resultados
                desde el primer día.
              </motion.p>

              {/* Benefits */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="flex flex-wrap justify-center gap-4 mb-10"
              >
                {benefits.map((benefit) => (
                  <span
                    key={benefit}
                    className="inline-flex items-center gap-2 text-white/90 text-sm"
                  >
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    {benefit}
                  </span>
                ))}
              </motion.div>

              {/* CTA buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="flex flex-col sm:flex-row items-center justify-center gap-4"
              >
                <Link href="/auth/sign-up">
                  <Button
                    size="lg"
                    className="gap-2 rounded-full px-8 bg-white text-secondary hover:bg-white/90 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300"
                  >
                    Empezar gratis
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
