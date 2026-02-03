'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { ArrowRight, Sparkles, Play, CheckCircle2, Star } from 'lucide-react'
import { LANDING_IMAGES } from '@/lib/config/supabase-images'

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/5" />

      {/* Animated background blobs - subtle and organic */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-10 right-[10%] w-[500px] h-[500px] bg-primary/25 rounded-full blur-[100px] animate-blob" />
        <div className="absolute top-[30%] left-[6%] w-[400px] h-[400px] bg-secondary/20 rounded-full blur-[120px] animate-blob animation-delay-200" />
        <div className="absolute bottom-[10%] right-[20%] w-[350px] h-[350px] bg-accent/15 rounded-full blur-[100px] animate-blob animation-delay-300" />
      </div>

      {/* Soft gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-transparent to-background/80" />

      <div className="relative max-w-7xl mx-auto px-6 py-20 grid lg:grid-cols-2 gap-12 items-center">
        {/* Left content */}
        <div className="space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-primary/30 to-secondary/20 border border-primary/30 text-sm font-medium backdrop-blur-sm"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary"></span>
            </span>
            Plataforma #1 especializada para negocios de belleza
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight tracking-tight"
          >
            Software de Gestión para{' '}
            <span className="relative inline-block">
              <span className="relative z-10 bg-gradient-to-r from-secondary via-accent to-secondary bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
                Estéticas, Spas
              </span>
              <svg
                className="absolute -bottom-1 left-0 w-full"
                viewBox="0 0 200 8"
                fill="none"
                aria-hidden="true"
              >
                <motion.path
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1, delay: 0.5 }}
                  d="M2 6C50 2 150 2 198 6"
                  stroke="url(#gradient1)"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient
                    id="gradient1"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="0%"
                  >
                    <stop offset="0%" stopColor="oklch(0.90 0.09 85)" />
                    <stop offset="100%" stopColor="oklch(0.55 0.12 300)" />
                  </linearGradient>
                </defs>
              </svg>
            </span>{' '}
            y Centros de Belleza
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg text-muted-foreground max-w-lg leading-relaxed"
          >
            La plataforma todo-en-uno para estéticas, spas, clínicas y centros
            de belleza.
            <span className="text-foreground font-medium">
              {' '}
              Automatiza tu operación y enfócate en lo que amas.
            </span>
          </motion.p>

          {/* Feature pills */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-wrap gap-2"
          >
            {[
              'Agenda inteligente',
              'Asistente IA 24/7',
              'WhatsApp integrado',
              'Gestión de comisiones',
              'Reportes avanzados',
            ].map((feature) => (
              <span
                key={feature}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border text-sm"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-secondary" />
                {feature}
              </span>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-wrap items-center gap-4"
          >
            <Link href="/auth/sign-up">
              <Button
                size="lg"
                className="gap-2 rounded-full px-8 bg-gradient-to-r from-secondary to-accent hover:opacity-90 transition-all duration-300 shadow-lg hover:shadow-secondary/25 hover:scale-105 text-white border-0"
              >
                Comenzar gratis
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            {/* <Link href="#demo" className="group">
              <Button
                size="lg"
                variant="outline"
                className="gap-2 rounded-full px-6 border-2 hover:bg-primary/10 hover:border-primary transition-all duration-300"
              >
                <span className="relative flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 group-hover:bg-primary/30 transition-colors">
                  <Play className="h-3.5 w-3.5 ml-0.5 text-secondary" />
                </span>
                Ver demo
              </Button>
            </Link> */}
          </motion.div>

          {/* Social proof */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="flex flex-col sm:flex-row sm:items-center gap-6 pt-4"
          >
            {/* <div className="flex items-center gap-4">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="w-10 h-10 rounded-full bg-gradient-to-br from-primary via-secondary/50 to-secondary border-2 border-background shadow-lg"
                    style={{ zIndex: 5 - i }}
                  />
                ))}
              </div>
              <div className="text-sm">
                <div className="flex items-center gap-1 text-secondary font-semibold">
                  <Star className="h-4 w-4 fill-primary text-primary" />
                  <Star className="h-4 w-4 fill-primary text-primary" />
                  <Star className="h-4 w-4 fill-primary text-primary" />
                  <Star className="h-4 w-4 fill-primary text-primary" />
                  <Star className="h-4 w-4 fill-primary text-primary" />
                  <span className="ml-1">4.9</span>
                </div>
                <p className="text-muted-foreground">
                  <span className="font-semibold text-foreground">+500</span>{' '}
                  negocios confian en nosotros
                </p>
              </div>
            </div> */}
          </motion.div>
        </div>

        {/* Right content - Image with floating cards */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="relative hidden lg:block"
        >
          <div className="relative w-full aspect-square max-w-lg mx-auto group">
            {/* Decorative gradient ring */}
            <div className="absolute inset-0 rounded-[3rem] bg-gradient-to-br from-primary via-secondary/50 to-accent p-1 rotate-6 group-hover:rotate-3 transition-transform duration-700">
              <div className="absolute inset-0 rounded-[3rem] bg-background/80 backdrop-blur-sm" />
            </div>

            {/* Main image container with hover effect */}
            <div className="absolute inset-0 rounded-[3rem] shadow-2xl overflow-hidden group-hover:shadow-secondary/20 transition-shadow duration-500">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-secondary/20 z-10 group-hover:opacity-0 transition-opacity duration-500" />
              <Image
                src={LANDING_IMAGES.hero}
                alt="Profesional de estética usando software de gestión Beluvio para administrar citas y clientes en su salón de belleza"
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent group-hover:from-background/40 transition-all duration-500" />

              {/* Elegant shine effect on hover */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent transform -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
              </div>
            </div>

            {/* Floating card - Appointments */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.8 }}
              className="absolute -bottom-4 -left-8"
            >
              <motion.div
                animate={{ y: [0, -15, 0], rotate: [0, 1, 0] }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="glass rounded-2xl p-4 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 cursor-default"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center">
                    <Sparkles className="h-6 w-6 text-secondary" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Citas de hoy</p>
                    <p className="text-2xl font-bold bg-gradient-to-r from-secondary to-accent bg-clip-text text-transparent">
                      24
                    </p>
                  </div>
                </div>
              </motion.div>
            </motion.div>

            {/* Floating card - Revenue */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 1 }}
              className="absolute -top-4 -right-8"
            >
              <motion.div
                animate={{ y: [0, -12, 0], rotate: [0, -1, 0] }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: 0.3,
                }}
                className="glass rounded-2xl p-4 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 cursor-default"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-secondary to-accent flex items-center justify-center">
                    <svg
                      className="h-5 w-5 text-white"
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
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Ingresos del mes
                    </p>
                    <p className="text-lg font-bold">+28%</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>

            {/* Floating notification */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 1.2 }}
              className="absolute top-1/3 -right-12"
            >
              <motion.div
                animate={{ y: [0, -10, 0], x: [0, 3, 0] }}
                transition={{
                  duration: 2.2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: 0.6,
                }}
                className="glass rounded-xl p-3 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-default max-w-[180px]"
              >
                <div className="flex items-start gap-2">
                  <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs font-medium">Cita confirmada</p>
                    <p className="text-xs text-muted-foreground">
                      Maria G. - 3:00 PM
                    </p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="flex flex-col items-center gap-2 text-muted-foreground"
        >
            <span className="text-xs">Descubre más</span>
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        </motion.div>
      </motion.div>
    </section>
  )
}
