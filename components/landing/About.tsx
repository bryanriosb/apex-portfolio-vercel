'use client'

import { motion } from 'framer-motion'
import { Heart, Sparkles, Users, Award, Zap } from 'lucide-react'
import { LANDING_IMAGES } from '@/lib/config/supabase-images'

export function About() {
  return (
    <section id="about" className="py-24 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-secondary/5 to-background" />
      <div className="absolute inset-0 bg-cover bg-center opacity-5" style={{backgroundImage: `url(${LANDING_IMAGES.about})`}} />
      <div className="absolute top-1/2 left-0 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl -translate-y-1/2 -translate-x-1/2" />
      <div className="absolute top-1/2 right-0 w-[400px] h-[400px] bg-secondary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

      <div className="relative max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-4xl mx-auto mb-16"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/10 border border-secondary/20 text-sm font-medium mb-6"
          >
            <Heart className="h-4 w-4 text-secondary" />
            Sobre nosotros
          </motion.div>
          <h2 className="text-3xl lg:text-5xl font-bold mb-6">
            Especializados en el{' '}
            <span className="bg-gradient-to-r from-secondary via-accent to-secondary bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
              bienestar y la belleza
            </span>
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            No somos una plataforma genérica. Somos expertos en tecnología para negocios de belleza y salud,
            entendiendo las necesidades únicas de estéticas, spas, clínicas y centros de bienestar.
          </p>
        </motion.div>

        {/* Content grid */}
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-6"
          >
            <div className="space-y-4">
              <h3 className="text-2xl font-semibold">
                Tecnología diseñada por y para profesionales del sector
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Entendemos que cada cita, tratamiento y servicio tiene particularidades que las soluciones
                genéricas no comprenden. Por eso hemos creado una plataforma que habla tu mismo idioma.
              </p>
            </div>

            {/* Features list */}
            <div className="space-y-4 pt-4">
              {[
                {
                  icon: Sparkles,
                  title: 'Especialización Beauty & Health',
                  description: 'Diseñada específicamente para estéticas, spas, clínicas y centros de bienestar'
                },
                {
                  icon: Users,
                  title: 'Entendimiento del sector',
                  description: 'Conocemos los desafíos reales de la gestión en belleza y salud'
                },
                {
                  icon: Zap,
                  title: 'Innovación constante',
                  description: 'Evolutiva con las necesidades cambiantes de la industria'
                }
              ].map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: 0.3 + index * 0.1 }}
                  className="flex gap-4"
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-secondary/20 to-accent/20 flex items-center justify-center shrink-0">
                    <item.icon className="h-5 w-5 text-secondary" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">{item.title}</h4>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right content - Stats/Values */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="space-y-8"
          >
            {/* Mission statement */}
            <div className="p-8 rounded-3xl bg-gradient-to-br from-secondary/10 to-accent/5 border border-secondary/20">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-secondary to-accent flex items-center justify-center">
                  <Heart className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h4 className="text-xl font-semibold mb-2">Nuestra misión</h4>
                  <p className="text-muted-foreground leading-relaxed">
                    Empoderar a los profesionales del sector belleza y salud con tecnología que les permita
                    enfocarse en lo que mejor saben hacer: transformar vidas y hacer sentir bien a sus clientes.
                  </p>
                </div>
              </div>
            </div>

            {/* Value proposition */}
            <div className="space-y-6">
              {/* Main floating insight card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="relative"
              >
                <motion.div
                  animate={{ 
                    y: [0, -20, 0],
                    scale: [1, 1.02, 1]
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                  className="glass rounded-2xl p-6 shadow-2xl hover:shadow-3xl hover:scale-105 transition-all duration-300 cursor-default bg-gradient-to-br from-secondary/15 to-accent/10 border border-secondary/30"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-secondary to-accent flex items-center justify-center">
                      <svg
                        className="h-7 w-7 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                        />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <motion.p 
                        className="text-sm text-muted-foreground mb-1"
                        animate={{
                          opacity: [0.8, 1, 0.8]
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: 'easeInOut'
                        }}
                      >
                        Empresas beauty aumentan su productividad
                      </motion.p>
                      <motion.p 
                        className="text-3xl font-bold bg-gradient-to-r from-secondary to-accent bg-clip-text text-transparent"
                        animate={{
                          scale: [1, 1.05, 1]
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: 'easeInOut',
                          delay: 0.5
                        }}
                      >
                        +62%
                      </motion.p>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      con automatización
                    </div>
                  </div>
                </motion.div>
              </motion.div>

              {/* Secondary stats grid */}
              <div className="grid grid-cols-2 gap-4">
                {[
                  {
                    value: '87%',
                    label: 'Reducción en cancelaciones',
                    description: 'con recordatorios IA'
                  },
                  {
                    value: '4.8★',
                    label: 'Satisfacción cliente',
                    description: 'promedio del sector'
                  },
                  {
                    value: '15h',
                    label: 'Tiempo ahorrado',
                    description: 'por semana'
                  },
                  {
                    value: '3x',
                    label: 'ROI en 6 meses',
                    description: 'típico del sector'
                  }
                ].map((stat, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: 0.6 + index * 0.1 }}
                    whileHover={{ 
                      y: -3,
                      boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
                    }}
                    className="p-4 rounded-xl bg-card border border-border/50 hover:border-secondary/30 transition-all duration-300 cursor-default"
                  >
                    <div className="text-2xl font-bold text-secondary mb-1">{stat.value}</div>
                    <div className="text-sm font-medium mb-1">{stat.label}</div>
                    <div className="text-xs text-muted-foreground">{stat.description}</div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="text-center mt-16"
        >
          <motion.div 
            className="inline-flex items-center gap-2 p-6 rounded-3xl bg-gradient-to-r from-secondary/10 to-accent/10 border border-secondary/20 relative overflow-hidden"
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.3 }}
          >
            {/* Animated background glow */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-secondary/20 to-accent/20"
              animate={{
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            
            <motion.div
              className="relative z-10"
              animate={{
                rotate: [0, 5, -5, 0],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <Award className="h-6 w-6 text-secondary" />
            </motion.div>
            <div className="text-left relative z-10">
              <p className="font-semibold">Especialistas en tecnología Beauty & Health</p>
              <p className="text-sm text-muted-foreground">
                La solución diseñada por y para profesionales del sector
              </p>
            </div>
          </motion.div>
        </motion.div>

        {/* Floating animated elements */}
        <motion.div
          className="absolute top-10 right-10 w-6 h-6 bg-secondary/20 rounded-full"
          animate={{
            y: [0, -20, 0],
            opacity: [0.3, 0.8, 0.3],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0
          }}
        />
        <motion.div
          className="absolute bottom-20 left-20 w-4 h-4 bg-accent/30 rounded-full"
          animate={{
            y: [0, -15, 0],
            opacity: [0.3, 0.7, 0.3],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1
          }}
        />
        <motion.div
          className="absolute top-1/3 left-10 w-8 h-8 bg-primary/15 rounded-full"
          animate={{
            y: [0, -25, 0],
            opacity: [0.2, 0.6, 0.2],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2
          }}
        />
      </div>
    </section>
  )
}