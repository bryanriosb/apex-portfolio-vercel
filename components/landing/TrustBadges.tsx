'use client'

import { motion } from 'framer-motion'
import { Shield, Lock, Zap, Award, Clock, HeartHandshake } from 'lucide-react'

const badges = [
  {
    icon: Shield,
    title: 'Datos seguros',
    description: 'Encriptación SSL de grado bancario',
  },
  {
    icon: Clock,
    title: 'Soporte 24/7',
    description: 'Equipo dedicado siempre disponible',
  },
  {
    icon: Zap,
    title: '99.9% Uptime',
    description: 'Infraestructura de alta disponibilidad',
  },
  {
    icon: Award,
    title: 'Sin contratos',
    description: 'Cancela cuando quieras',
  },
]

const stats = [
  { value: '500+', label: 'Salones activos' },
  { value: '50k+', label: 'Citas gestionadas' },
  { value: '98%', label: 'Satisfacción' },
  { value: '4.9', label: 'Calificación' },
]

export function TrustBadges() {
  return (
    <section className="py-16 border-y bg-gradient-to-r from-primary/5 via-background to-secondary/5">
      <div className="max-w-7xl mx-auto px-6">
        {/* Stats row */}
        {/* <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12"
        >
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="text-center"
            >
              <p className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-secondary to-accent bg-clip-text text-transparent">
                {stat.value}
              </p>
              <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>

        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mb-12" /> */}

        {/* Trust badges */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {badges.map((badge, i) => (
            <motion.div
              key={badge.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="flex items-start gap-3 p-4 rounded-xl bg-card/50 border border-transparent hover:border-primary/30 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/30 to-secondary/20 flex items-center justify-center shrink-0">
                <badge.icon className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <p className="font-semibold text-sm">{badge.title}</p>
                <p className="text-xs text-muted-foreground">
                  {badge.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Logos section */}
        {/* <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-16 text-center"
        >
          <p className="text-sm text-muted-foreground mb-8">Usado por esteticas, spas, clinicas y centros de belleza en toda Latinoamerica</p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12 opacity-60">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-8 w-24 md:w-32 rounded bg-gradient-to-r from-muted/50 to-muted/30 flex items-center justify-center"
              >
                <span className="text-xs text-muted-foreground font-medium">Salon {i}</span>
              </div>
            ))}
          </div>
        </motion.div> */}
      </div>
    </section>
  )
}
