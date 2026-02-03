'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import {
  Scissors,
  Sparkles,
  Heart,
  Palette,
  Brush,
  Eye,
  CheckCircle2,
} from 'lucide-react'
import { LANDING_IMAGES } from '@/lib/config/supabase-images'

const services = [
  {
    icon: Scissors,
    name: 'Cortes y peinados',
    gradient: 'from-primary to-primary/50',
  },
  {
    icon: Sparkles,
    name: 'Tratamientos faciales',
    gradient: 'from-secondary to-accent',
  },
  {
    icon: Heart,
    name: 'Manicure y pedicure',
    gradient: 'from-pink-400 to-pink-600',
  },
    { icon: Palette, name: 'Colorimetría', gradient: 'from-accent to-secondary' },
  { icon: Brush, name: 'Maquillaje', gradient: 'from-rose-400 to-rose-600' },
  {
    icon: Eye,
    name: 'Pestanas y cejas',
    gradient: 'from-purple-400 to-purple-600',
  },
]

const benefits = [
  'Configura servicios en minutos',
  'Asigna especialistas por servicio',
  'Define duraciones flexibles',
  'Gestión de abonos y cartera',
  'Precios diferenciados por profesional',
  'Comisiones automáticas',
]

export function Services() {
  return (
    <section id="services" className="py-24 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-secondary/5" />

      <div className="relative max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left - Visual showcase */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            <div className="grid grid-cols-2 gap-4">
              {/* Main image */}
              <div className="space-y-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="aspect-[4/5] rounded-3xl overflow-hidden relative group"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-secondary/20" />
                  <Image
                    src={LANDING_IMAGES.services.haircare}
                    alt="Profesional de peluquería realizando tratamiento capilar en salón de belleza gestionado con Beluvio"
                    width={300}
                    height={400}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
                </motion.div>

                {/* Stats card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  className="relative rounded-3xl bg-gradient-to-br from-secondary/80 to-accent/80 p-6 text-white overflow-hidden"
                >
                  <div className="absolute inset-0 bg-cover opacity-10" style={{backgroundImage: `url(${LANDING_IMAGES.services.treatment})`}} />
                  <div className="relative">
                    <p className="text-5xl font-bold">98%</p>
                    <p className="text-white/80 text-sm mt-1">
                      Satisfacción de clientes
                    </p>
                    <div className="flex items-center gap-1 mt-2">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <span key={i} className="text-primary">
                          ★
                        </span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </div>

              <div className="space-y-4 pt-8">
                {/* Stats card 2 */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="relative rounded-3xl bg-gradient-to-br from-primary/80 to-primary/50 p-6 overflow-hidden"
                >
                  <div className="relative">
                    <p className="text-5xl font-bold text-secondary">+5k</p>
                    <p className="text-foreground/70 text-sm mt-1">
                      Citas gestionadas cada mes
                    </p>
                    <div className="mt-3 h-2 bg-background/30 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: '85%' }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, delay: 0.5 }}
                        className="h-full bg-secondary rounded-full"
                      />
                    </div>
                  </div>
                </motion.div>

                {/* Second image */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                  className="aspect-[4/5] rounded-3xl overflow-hidden relative group"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-secondary/30 to-primary/20" />
                  <Image
                    src={LANDING_IMAGES.services.treatment}
                    alt="Mujer recibiendo tratamiento facial en salon de estética utilizando sistema de gestión Beluvio"
                    width={300}
                    height={400}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
                </motion.div>
              </div>
            </div>
          </motion.div>

          {/* Right - Content */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-8"
          >
            <div>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 text-sm font-medium mb-6"
              >
                <Sparkles className="h-4 w-4 text-accent" />
                Servicios
              </motion.div>
              <h2 className="text-3xl lg:text-5xl font-bold mb-6">
                Configura todos los{' '}
                <span className="bg-gradient-to-r from-secondary via-accent to-secondary bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
                  servicios
                </span>{' '}
                de tu negocio
              </h2>
              <p className="text-lg text-muted-foreground">
                Desde cortes hasta tratamientos complejos, gestiona cada
                servicio con total flexibilidad y control.
              </p>
            </div>

            {/* Service tags */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {services.map((service, index) => (
                <motion.div
                  key={service.name}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                  className="group"
                >
                  <div
                    className={`flex items-center gap-2 p-3 rounded-xl bg-gradient-to-br ${service.gradient} hover:shadow-lg transition-all duration-300`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-background/90 flex items-center justify-center shrink-0">
                      <service.icon className="h-4 w-4 text-secondary" />
                    </div>
                    <span className="text-sm font-medium text-white truncate">
                      {service.name}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Benefits list */}
            <div className="p-6 rounded-2xl bg-card border border-border/50">
              <p className="font-semibold mb-4 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-secondary" />
                 Personalización total
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                {benefits.map((benefit, index) => (
                  <motion.div
                    key={benefit}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <CheckCircle2 className="h-4 w-4 text-secondary shrink-0" />
                    {benefit}
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
