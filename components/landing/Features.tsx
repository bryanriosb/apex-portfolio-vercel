'use client'

import { motion } from 'framer-motion'
import {
  Calendar,
  Users,
  Package,
  TrendingUp,
  MessageCircle,
  CreditCard,
  ArrowRight,
  Sparkles,
  Bot,
  Zap,
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { LANDING_IMAGES } from '@/lib/config/supabase-images'

const features = [
  {
    icon: Calendar,
    title: 'Agenda inteligente',
    description:
      'Gestiona citas con calendario visual, recordatorios automáticos y evita solapamientos. Sincroniza con Google Calendar.',
    gradient: 'from-primary/80 to-primary/40',
    iconBg: 'from-primary to-primary/60',
    highlight: 'Más popular',
  },
  {
    icon: Users,
    title: 'Clientes y fidelización',
    description:
      'Base de datos completa con historial, preferencias y programas de lealtad que aumentan la retención.',
    gradient: 'from-secondary/60 to-accent/40',
    iconBg: 'from-secondary to-accent',
  },
  {
    icon: Package,
    title: 'Control de inventario',
    description:
      'Monitorea productos en tiempo real, recibe alertas de stock bajo y registra consumo por servicio.',
    gradient: 'from-accent/60 to-secondary/40',
    iconBg: 'from-accent to-secondary/80',
  },
  {
    icon: TrendingUp,
    title: 'Reportes avanzados',
    description:
      'Dashboard interactivo con métricas de ventas, servicios populares y rendimiento del equipo.',
    gradient: 'from-primary/60 to-secondary/40',
    iconBg: 'from-primary/80 to-secondary',
  },
  {
    icon: MessageCircle,
    title: 'WhatsApp integrado',
    description:
      'Envía confirmaciones y recordatorios automáticos directo al WhatsApp. Reduce cancelaciones un 40%.',
    gradient: 'from-green-500/40 to-secondary/40',
    iconBg: 'from-green-500 to-green-600',
  },
  {
    icon: CreditCard,
    title: 'Facturacion electronica',
    description:
      'Genera facturas profesionales, controla pagos pendientes y gestiona cuentas por cobrar fácilmente.',
    gradient: 'from-secondary/60 to-primary/40',
    iconBg: 'from-secondary to-primary/80',
  },
]

const aiCapabilities = [
  'Agenda citas automáticamente 24/7',
  'Responde consultas de disponibilidad',
  'Reagenda o cancela citas por chat',
  'Informa sobre servicios y precios',
  'Contestará llamadas entrantes',
  'Realizará llamadas automáticas',
  'Entiende lenguaje natural',
  'Aprende las preferencias del negocio',
]

export function Features() {
  return (
    <section id="features" className="py-24 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background" />
      <div className="absolute top-1/2 left-0 w-[500px] h-[500px] bg-primary/20 rounded-full blur-3xl -translate-y-1/2 -translate-x-1/2" />
      <div className="absolute top-1/2 right-0 w-[400px] h-[400px] bg-secondary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

      <div className="relative max-w-7xl mx-auto px-6">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/10 border border-secondary/20 text-sm font-medium mb-6"
          >
            <Sparkles className="h-4 w-4 text-secondary" />
            Funcionalidades
          </motion.div>
          <h2 className="text-3xl lg:text-5xl font-bold mb-6">
            Todo lo que necesitas para tu{' '}
            <span className="bg-gradient-to-r from-secondary via-accent to-secondary bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
              negocio de belleza
            </span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Herramientas profesionales diseñadas para estéticas, spas, clínicas
            de cirugía plástica, barberías y centros de belleza.
          </p>
        </motion.div>

        {/* AI Assistant Feature - Special Highlight */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-12"
        >
          <div className="relative rounded-3xl overflow-hidden">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-r from-secondary via-accent to-secondary opacity-90" />
            <div
              className="absolute inset-0 bg-cover bg-center opacity-5"
              style={{ backgroundImage: `url(${LANDING_IMAGES.features})` }}
            />

            {/* Animated blobs - subtle */}
            <div className="absolute -top-20 -right-20 w-[350px] h-[350px] bg-primary/25 rounded-full blur-[80px] animate-blob" />
            <div className="absolute -bottom-20 -left-20 w-[300px] h-[300px] bg-white/10 rounded-full blur-[80px] animate-blob animation-delay-2000" />
            <div className="absolute top-1/2 right-1/4 w-[200px] h-[200px] bg-primary/15 rounded-full blur-[60px] animate-blob animation-delay-4000" />

            <div className="relative p-8 md:p-12 lg:p-16">
              <div className="grid lg:grid-cols-2 gap-10 items-center">
                {/* Left content */}
                <div className="space-y-6">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm text-white text-sm font-semibold">
                    <Zap className="h-4 w-4" />
                    Potenciado por IA
                  </div>

                  <h3 className="text-3xl md:text-4xl font-bold text-white">
                    Asistente IA con gestión telefónica
                  </h3>

                  <p className="text-white/80 text-lg leading-relaxed">
                    Tu asistente virtual trabaja 24/7 gestionando
                    automáticamente tu negocio. Los clientes pueden agendar,
                    reagendar o cancelar citas por WhatsApp, chat web o
                    teléfono, mientras el sistema verifica disponibilidad en
                    tiempo real y realiza llamadas de confirmación.
                  </p>

                  {/* Capabilities grid */}
                  <div className="grid sm:grid-cols-2 gap-3 pt-2">
                    {aiCapabilities.map((capability, index) => (
                      <motion.div
                        key={capability}
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        className="flex items-center gap-2 text-white/90 text-sm"
                      >
                        <div className="w-5 h-5 rounded-full bg-primary/30 flex items-center justify-center shrink-0">
                          <svg
                            className="w-3 h-3 text-primary"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                        {capability}
                      </motion.div>
                    ))}
                  </div>

                  <Button
                    size="lg"
                    className="gap-2 rounded-full px-8 bg-white text-secondary hover:bg-white/90 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 mt-4 cursor-default"
                    onClick={(e) => e.preventDefault()}
                  >
                    Próximamente
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>

                {/* Right - Chat mockup */}
                <div className="hidden lg:block">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="relative"
                  >
                    <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/20">
                      {/* Chat header */}
                      <div className="flex items-center gap-3 pb-4 border-b border-white/20">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center">
                          <Bot className="h-5 w-5 text-secondary" />
                        </div>
                        <div>
                          <p className="text-white font-semibold text-sm">
                            Asistente APEX
                          </p>
                          <p className="text-white/60 text-xs flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                            En línea
                          </p>
                        </div>
                      </div>

                      {/* Chat messages */}
                      <div className="space-y-4 py-4">
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.3, delay: 0.4 }}
                          className="flex justify-end"
                        >
                          <div className="bg-primary/30 rounded-2xl rounded-tr-sm px-4 py-2 max-w-[80%]">
                            <p className="text-white text-sm">
                              ¡Hola! Quiero agendar un corte para mañana
                            </p>
                          </div>
                        </motion.div>

                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.3, delay: 0.6 }}
                          className="flex justify-start"
                        >
                          <div className="bg-white/20 rounded-2xl rounded-tl-sm px-4 py-2 max-w-[80%]">
                            <p className="text-white text-sm">
                              ¡Perfecto! Tengo disponibilidad mañana a las 10:00,
                              14:00 y 16:30. ¿Cuál prefieres?
                            </p>
                          </div>
                        </motion.div>

                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.3, delay: 0.8 }}
                          className="flex justify-end"
                        >
                          <div className="bg-primary/30 rounded-2xl rounded-tr-sm px-4 py-2 max-w-[80%]">
                            <p className="text-white text-sm">
                              A las 10:00 por favor
                            </p>
                          </div>
                        </motion.div>

                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.3, delay: 1 }}
                          className="flex justify-start"
                        >
                          <div className="bg-white/20 rounded-2xl rounded-tl-sm px-4 py-2 max-w-[80%]">
                            <p className="text-white text-sm">
                              ¡Listo! Tu cita quedó agendada para mañana a las
                              10:00. Te envío confirmación por WhatsApp
                            </p>
                          </div>
                        </motion.div>
                      </div>
                    </div>

                    {/* Floating badge */}
                    <motion.div
                      animate={{ y: [0, -8, 0] }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                      className="absolute -top-4 -right-4 bg-white rounded-xl px-4 py-2 shadow-xl"
                    >
                      <p className="text-secondary font-bold text-sm">40%</p>
                      <p className="text-muted-foreground text-xs">
                        menos cancelaciones
                      </p>
                    </motion.div>
                  </motion.div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Features grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <FeatureCard key={feature.title} feature={feature} index={index} />
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-16 text-center"
        >
          <p className="text-muted-foreground mb-4">
            Y muchas más funcionalidades que te ayudarán a crecer
          </p>
          <a
            href="#services"
            className="inline-flex items-center gap-2 text-secondary font-semibold hover:gap-3 transition-all"
          >
            Ver todas las funcionalidades
            <ArrowRight className="h-4 w-4" />
          </a>
        </motion.div>
      </div>
    </section>
  )
}

interface FeatureCardProps {
  feature: (typeof features)[0]
  index: number
}

function FeatureCard({ feature, index }: FeatureCardProps) {
  const Icon = feature.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="group relative"
    >
      {/* Card */}
      <div className="relative h-full p-6 rounded-2xl bg-card border border-border/50 hover:border-primary/50 transition-all duration-500 hover:shadow-xl hover:shadow-primary/5 overflow-hidden">
        {/* Gradient background on hover */}
        <div
          className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
        />
        <div className="absolute inset-0 bg-card opacity-100 group-hover:opacity-95 transition-opacity duration-500" />

        {/* Shimmer effect */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
          <div className="absolute inset-0 animate-shimmer" />
        </div>

        {/* Content */}
        <div className="relative">
          {/* Highlight badge */}
          {feature.highlight && (
            <div className="absolute -top-2 -right-2">
              <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/30 text-secondary">
                {feature.highlight}
              </span>
            </div>
          )}

          {/* Icon */}
          <div
            className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.iconBg} flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 group-hover:shadow-xl transition-all duration-300`}
          >
            <Icon className="h-7 w-7 text-white" />
          </div>

          {/* Text */}
          <h3 className="font-bold text-xl mb-3 group-hover:text-secondary transition-colors duration-300">
            {feature.title}
          </h3>
          <p className="text-muted-foreground text-sm leading-relaxed group-hover:text-foreground/80 transition-colors duration-300">
            {feature.description}
          </p>

          {/* Arrow indicator */}
          <div className="mt-4 flex items-center gap-2 text-secondary opacity-0 group-hover:opacity-100 translate-x-[-10px] group-hover:translate-x-0 transition-all duration-300">
            <span className="text-sm font-medium">Saber más</span>
            <ArrowRight className="h-4 w-4" />
          </div>
        </div>
      </div>
    </motion.div>
  )
}
