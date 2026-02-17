'use client'

import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  AnimatePresence,
} from 'framer-motion'
import { useRef, useState, useEffect } from 'react'
import {
  ArrowRight,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Sparkles,
  Zap,
  Shield,
  BarChart3,
  Mail,
  Play,
  Star,
} from 'lucide-react'
import Link from 'next/link'

// Spring configs
const smoothSpring = { stiffness: 100, damping: 30, restDelta: 0.001 }

// Counter hook
function useCountUp(end: number, duration: number = 2) {
  const [count, setCount] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) setIsVisible(true)
      },
      { threshold: 0.3 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [isVisible])

  useEffect(() => {
    if (!isVisible) return
    let startTime: number
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime
      const progress = Math.min(
        (currentTime - startTime) / (duration * 1000),
        1
      )
      const easeOutQuart = 1 - Math.pow(1 - progress, 4)
      setCount(Math.floor(end * easeOutQuart))
      if (progress < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }, [isVisible, end, duration])

  return { count, ref }
}

// Floating icon
function FloatingIcon({
  icon: Icon,
  color,
  delay = 0,
  className = '',
}: {
  icon: React.ElementType
  color: string
  delay?: number
  className?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1, y: [0, -15, 0], rotate: [0, 5, -5, 0] }}
      transition={{
        opacity: { duration: 0.5, delay },
        scale: {
          duration: 0.5,
          delay,
          type: 'spring',
          stiffness: 300,
          damping: 20,
        },
        y: {
          duration: 4,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: delay + 0.5,
        },
        rotate: {
          duration: 6,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: delay + 0.5,
        },
      }}
      className={`absolute ${className}`}
    >
      <div className="w-16 h-16 bg-white flex items-center justify-center border border-slate-200 shadow-lg">
        <Icon className={`w-8 h-8 ${color}`} />
      </div>
    </motion.div>
  )
}

// Header
function Header({ scrolled }: { scrolled: boolean }) {
  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="w-10 h-10 bg-blue-600 flex items-center justify-center shadow-md"
          >
            <span className="text-white font-bold text-xl">A</span>
          </motion.div>
          <span className="font-bold text-xl text-slate-900">APEX</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {['Producto', 'Precios', 'Demo'].map((item, i) => (
            <motion.a
              key={item}
              href={`#${item.toLowerCase()}`}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i + 0.3 }}
              className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors"
            >
              {item}
            </motion.a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/auth/sign-in"
            className="hidden sm:flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-slate-600 hover:text-blue-600"
          >
            <Lock className="w-4 h-4" />
            Ingresar
          </Link>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Link
              href="/auth/sign-up"
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors shadow-md"
            >
              Comenzar gratis
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>
      </div>
    </motion.header>
  )
}

// Slide 1: Hero
function HeroSlide() {
  const titleWords = ['Recupera', 'tu', 'cartera']
  const subtitleWords = ['sin', 'perder', 'tiempo']

  return (
    <div className="h-full flex flex-col justify-center items-center px-6 text-center relative overflow-hidden">
      {/* Background orbs - solo azul */}
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 8, repeat: Infinity }}
        className="absolute top-1/4 -left-32 w-[500px] h-[500px] bg-blue-200/50 rounded-full blur-[120px]"
      />
      <motion.div
        animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 10, repeat: Infinity, delay: 2 }}
        className="absolute bottom-1/4 -right-32 w-[400px] h-[400px] bg-blue-300/40 rounded-full blur-[100px]"
      />
      <motion.div
        animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.3, 0.2] }}
        transition={{ duration: 6, repeat: Infinity, delay: 1 }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-100/30 rounded-full blur-[150px]"
      />

      {/* Floating icons */}
      <FloatingIcon
        icon={Mail}
        color="text-blue-600"
        delay={0.6}
        className="top-32 left-[15%]"
      />
      <FloatingIcon
        icon={BarChart3}
        color="text-blue-600"
        delay={0.8}
        className="top-40 right-[12%]"
      />
      <FloatingIcon
        icon={TrendingUp}
        color="text-blue-600"
        delay={1}
        className="bottom-40 left-[10%]"
      />
      <FloatingIcon
        icon={Zap}
        color="text-blue-600"
        delay={1.2}
        className="bottom-32 right-[15%]"
      />

      <div className="relative z-10 max-w-5xl">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 shadow-md mb-8"
        >
          <motion.div
            animate={{ rotate: [0, 15, -15, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
          >
            <Sparkles className="w-4 h-4 text-blue-600" />
          </motion.div>
          <span className="text-sm font-semibold text-slate-700">
            Ahora disponible en Colombia
          </span>
          <span className="text-lg">🇨🇴</span>
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ staggerChildren: 0.12, delayChildren: 0.3 }}
          className="mb-4"
        >
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-2">
            {titleWords.map((word, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                className={`text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight ${i === 2 ? 'text-blue-600' : 'text-slate-900'}`}
              >
                {word}
              </motion.span>
            ))}
          </div>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-2">
            {subtitleWords.map((word, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-slate-300"
              >
                {word}
              </motion.span>
            ))}
          </div>
        </motion.div>

        {/* Underline */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1, delay: 1 }}
          className="h-2 w-48 mx-auto bg-blue-600 mb-8 origin-left"
        />

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.2 }}
          className="text-xl md:text-2xl text-slate-600 max-w-2xl mx-auto mb-10"
        >
          Automatiza tus cobros por email con seguimiento inteligente. Más de{' '}
          <span className="text-blue-600 font-bold">
            35% de emails abiertos
          </span>
          .
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.4 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
        >
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Link
              href="/auth/sign-up"
              className="group flex items-center gap-3 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white text-lg font-semibold transition-colors shadow-lg"
            >
              Prueba gratis 14 días
              <motion.div
                animate={{ x: [0, 5, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <ArrowRight className="w-5 h-5" />
              </motion.div>
            </Link>
          </motion.div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-3 px-8 py-4 bg-white text-slate-700 text-lg font-medium border border-slate-200 transition-colors shadow-sm"
          >
            <div className="w-12 h-12 bg-blue-100 flex items-center justify-center">
              <Play className="w-5 h-5 text-blue-600 ml-0.5" />
            </div>
            Ver demo de 2 minutos
          </motion.button>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1.6 }}
          className="grid grid-cols-3 gap-4 max-w-2xl mx-auto"
        >
          {[
            { value: '35%+', label: 'Open rate' },
            { value: '15min', label: 'Setup inicial' },
            { value: '<0.1%', label: 'Tasa spam' },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                delay: 1.8 + i * 0.1,
                type: 'spring',
                stiffness: 200,
              }}
              whileHover={{ scale: 1.05, y: -5 }}
              className="p-6 bg-white border border-slate-200 shadow-md text-center"
            >
              <div className="text-3xl sm:text-4xl font-bold text-blue-600 mb-1">
                {stat.value}
              </div>
              <div className="text-sm text-slate-500 font-medium">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  )
}

// Slide 2: Problem
function ProblemSlide() {
  const problems = [
    {
      icon: Clock,
      text: 'Horas perdidas enviando cobros manualmente',
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
    },
    {
      icon: AlertTriangle,
      text: 'Reputación dañada por envíos descontrolados',
      color: 'text-red-600',
      bg: 'bg-red-50',
      border: 'border-red-200',
    },
    {
      icon: TrendingUp,
      text: 'Sin visibilidad de quién leyó tus notificaciones',
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      border: 'border-orange-200',
    },
  ]

  return (
    <div className="h-full flex flex-col justify-center items-center px-6">
      <div className="max-w-6xl w-full grid lg:grid-cols-2 gap-16 items-center">
        <div>
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 text-red-600 font-semibold text-sm uppercase mb-6"
          >
            <AlertTriangle className="w-4 h-4" />
            El problema real
          </motion.span>

          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 mb-6"
          >
            Tu equipo pierde el{' '}
            <span className="text-slate-300">tiempo valioso</span> en tareas que
            deberían ser automáticas
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-lg text-slate-600"
          >
            Las empresas latinoamericanas pierden en promedio 15 horas semanales
            en procesos manuales de cobranza.
          </motion.p>
        </div>

        <div className="space-y-4">
          {problems.map((problem, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: 100 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{
                duration: 0.6,
                delay: i * 0.15,
                type: 'spring',
                stiffness: 100,
              }}
              viewport={{ once: true }}
              whileHover={{
                scale: 1.02,
                x: 10,
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
              }}
              className={`flex items-start gap-5 p-6 ${problem.bg} border ${problem.border} shadow-md cursor-pointer transition-all`}
            >
              <motion.div
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.5 }}
                className="w-14 h-14 bg-white flex items-center justify-center flex-shrink-0 shadow-sm"
              >
                <problem.icon className={`w-7 h-7 ${problem.color}`} />
              </motion.div>
              <p className="text-slate-800 text-lg font-semibold">
                {problem.text}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Slide 3: Solution
function SolutionSlide() {
  const features = [
    {
      icon: Zap,
      title: 'Wizard de 3 pasos',
      desc: 'Tu primera campaña en 15 minutos.',
      gradient: 'bg-blue-600',
    },
    {
      icon: Shield,
      title: 'Envíos inteligentes',
      desc: 'Batches controlados que protegen tu dominio.',
      gradient: 'bg-blue-700',
    },
    {
      icon: BarChart3,
      title: 'Tracking en tiempo real',
      desc: 'Sabe quién abrió, hizo clic o ignoró.',
      gradient: 'bg-blue-500',
    },
    {
      icon: Mail,
      title: 'Plantillas que convierten',
      desc: 'Diseños optimizados para LatAm.',
      gradient: 'bg-blue-600',
    },
  ]

  return (
    <div
      className="h-full flex flex-col justify-center items-center px-6"
      id="producto"
    >
      <div className="max-w-6xl w-full">
        <div className="text-center mb-12">
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 text-blue-600 font-semibold text-sm uppercase mb-6"
          >
            <Zap className="w-4 h-4" />
            La solución
          </motion.span>

          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 mb-6"
          >
            Automatización que{' '}
            <span className="text-blue-600">genera resultados</span>
          </motion.h2>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.5,
                delay: i * 0.1,
                type: 'spring',
                stiffness: 100,
              }}
              viewport={{ once: true }}
              whileHover={{
                y: -10,
                boxShadow: '0 25px 50px -12px rgba(37, 99, 235, 0.2)',
              }}
              className="group p-8 bg-white border border-slate-200 shadow-md transition-all"
            >
              <motion.div
                whileHover={{ rotate: 360, scale: 1.1 }}
                transition={{ duration: 0.6 }}
                className={`w-16 h-16 ${feature.gradient} flex items-center justify-center mb-6 shadow-lg`}
              >
                <feature.icon className="w-8 h-8 text-white" />
              </motion.div>
              <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-blue-600 transition-colors">
                {feature.title}
              </h3>
              <p className="text-slate-600">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Slide 4: ROI
function ROISlide() {
  const openRate = useCountUp(35)
  const timeSaved = useCountUp(15)
  const satisfaction = useCountUp(98)

  const stats = [
    {
      value: openRate,
      suffix: '%',
      label: 'Open Rate',
      sub: 'vs 21% industria',
      icon: TrendingUp,
    },
    {
      value: timeSaved,
      suffix: 'h',
      label: 'Ahorradas',
      sub: 'semanal',
      icon: Clock,
    },
    {
      value: satisfaction,
      suffix: '%',
      label: 'Satisfacción',
      sub: 'recomiendan',
      icon: Star,
    },
  ]

  return (
    <div className="h-full flex flex-col justify-center items-center px-6">
      <div className="max-w-6xl w-full">
        <div className="text-center mb-16">
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 text-emerald-600 font-semibold text-sm uppercase mb-6"
          >
            <BarChart3 className="w-4 h-4" />
            Resultados medibles
          </motion.span>

          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 mb-6"
          >
            Métricas que <span className="text-blue-600">importan</span>
          </motion.h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.5 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{
                duration: 0.6,
                delay: i * 0.2,
                type: 'spring',
                stiffness: 100,
              }}
              viewport={{ once: true }}
              whileHover={{
                scale: 1.05,
                boxShadow: '0 30px 60px -15px rgba(0, 0, 0, 0.2)',
              }}
              className="relative"
            >
              <motion.div
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 6, repeat: Infinity, delay: i * 0.5 }}
                className="absolute -top-4 -right-4 w-16 h-16 bg-slate-100 transform rotate-12 opacity-50"
              />

              <div className="relative p-10 bg-white border border-slate-200 shadow-xl text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  transition={{ delay: 0.5 + i * 0.2, type: 'spring' }}
                  viewport={{ once: true }}
                  className="absolute top-4 right-4 w-10 h-10 bg-blue-600 flex items-center justify-center"
                >
                  <stat.icon className="w-5 h-5 text-white" />
                </motion.div>

                <div className="text-6xl sm:text-7xl font-bold text-blue-600 mb-4">
                  <span ref={stat.value.ref}>{stat.value.count}</span>
                  {stat.suffix}
                </div>
                <div className="text-slate-900 font-bold text-xl mb-1">
                  {stat.label}
                </div>
                <div className="text-slate-500">{stat.sub}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Slide 5: Pricing
function PricingSlide() {
  const plans = [
    {
      name: 'Starter',
      price: '$49',
      desc: 'Pymes pequeñas',
      emails: '500 emails/mes',
      features: ['1 usuario', 'Plantillas básicas', 'Soporte email'],
      popular: false,
    },
    {
      name: 'Growth',
      price: '$149',
      desc: 'El más popular',
      emails: '2,000 emails/mes',
      features: [
        '5 usuarios',
        'Todas las plantillas',
        'Soporte prioritario',
        'API access',
      ],
      popular: true,
    },
    {
      name: 'Business',
      price: '$399',
      desc: 'Empresas en crecimiento',
      emails: '10,000 emails/mes',
      features: [
        'Usuarios ilimitados',
        'Personalizadas',
        'Soporte 24/7',
        'Integraciones ERP',
      ],
      popular: false,
    },
  ]

  return (
    <div
      className="h-full flex flex-col justify-center items-center px-6"
      id="precios"
    >
      <div className="max-w-6xl w-full">
        <div className="text-center mb-12">
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 text-blue-600 font-semibold text-sm uppercase mb-6"
          >
            <Star className="w-4 h-4" />
            Precios simples
          </motion.span>

          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 mb-6"
          >
            Planes que escalan contigo
          </motion.h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.5,
                delay: i * 0.15,
                type: 'spring',
                stiffness: 100,
              }}
              viewport={{ once: true }}
              whileHover={{
                y: -15,
                boxShadow: plan.popular
                  ? '0 35px 60px -15px rgba(37, 99, 235, 0.4)'
                  : '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
              }}
              className={`relative p-8 border transition-all ${
                plan.popular
                  ? 'bg-blue-600 border-blue-600 text-white shadow-2xl'
                  : 'bg-white border-slate-200 shadow-lg'
              }`}
            >
              {plan.popular && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5, type: 'spring' }}
                  className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-amber-400 text-amber-900 text-sm font-bold shadow-lg"
                >
                  <span className="flex items-center gap-1">
                    <Star className="w-4 h-4" />
                    Más popular
                  </span>
                </motion.div>
              )}

              <div className="mb-6">
                <h3
                  className={`text-2xl font-bold mb-1 ${plan.popular ? 'text-white' : 'text-slate-900'}`}
                >
                  {plan.name}
                </h3>
                <p
                  className={plan.popular ? 'text-blue-100' : 'text-slate-500'}
                >
                  {plan.desc}
                </p>
              </div>

              <div className="mb-6">
                <span
                  className={`text-5xl font-bold ${plan.popular ? 'text-white' : 'text-slate-900'}`}
                >
                  {plan.price}
                </span>
                <span
                  className={plan.popular ? 'text-blue-200' : 'text-slate-400'}
                >
                  /mes
                </span>
              </div>

              <div
                className={`mb-6 pb-6 border-b ${plan.popular ? 'border-blue-400' : 'border-slate-200'}`}
              >
                <span
                  className={`font-bold ${plan.popular ? 'text-blue-200' : 'text-blue-600'}`}
                >
                  {plan.emails}
                </span>
              </div>

              <ul className="space-y-4 mb-8">
                {plan.features.map((f, j) => (
                  <motion.li
                    key={j}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + j * 0.1 }}
                    viewport={{ once: true }}
                    className={`flex items-center gap-3 ${plan.popular ? 'text-blue-50' : 'text-slate-600'}`}
                  >
                    <motion.div
                      whileHover={{ scale: 1.2 }}
                      transition={{ duration: 0.3 }}
                    >
                      <CheckCircle2
                        className={`w-5 h-5 flex-shrink-0 ${plan.popular ? 'text-blue-300' : 'text-blue-500'}`}
                      />
                    </motion.div>
                    {f}
                  </motion.li>
                ))}
              </ul>

              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Link
                  href="/auth/sign-up"
                  className={`group flex items-center justify-center gap-2 w-full py-4 text-center font-bold transition-colors ${
                    plan.popular
                      ? 'bg-white text-blue-600 hover:bg-slate-100 shadow-lg'
                      : 'bg-slate-900 text-white hover:bg-slate-800 shadow-lg'
                  }`}
                >
                  {plan.popular ? 'Prueba gratis' : 'Elegir plan'}
                  <motion.div
                    animate={{ x: [0, 5, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <ArrowRight className="w-5 h-5" />
                  </motion.div>
                </Link>
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Slide 6: CTA
function CTASlide() {
  return (
    <div
      className="h-full flex flex-col justify-center items-center px-6 text-center relative overflow-hidden"
      id="demo"
    >
      <motion.div
        animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-100/50 rounded-full blur-[100px]"
      />

      <div className="relative z-10 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
            className="text-4xl sm:text-5xl lg:text-7xl font-bold text-slate-900 mb-6"
          >
            ¿Listo para{' '}
            <span className="text-blue-600">recuperar tu cartera?</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            viewport={{ once: true }}
            className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto"
          >
            Únete a las empresas latinoamericanas que ya automatizaron sus
            cobros. Prueba gratis por 14 días.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            viewport={{ once: true }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Link
                href="/auth/sign-up"
                className="group flex items-center gap-3 px-10 py-5 bg-blue-600 hover:bg-blue-700 text-white text-lg font-bold transition-colors shadow-xl"
              >
                Crear cuenta gratis
                <motion.div
                  animate={{ x: [0, 5, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <ArrowRight className="w-5 h-5" />
                </motion.div>
              </Link>
            </motion.div>

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Link
                href="/auth/sign-in"
                className="flex items-center gap-3 px-10 py-5 bg-white text-slate-700 text-lg font-bold border-2 border-slate-200 transition-colors hover:border-blue-300 shadow-lg"
              >
                <Lock className="w-5 h-5" />
                Ingresar
              </Link>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            viewport={{ once: true }}
            className="mt-16 pt-8 border-t border-slate-200"
          >
            <p className="text-slate-400 text-sm mb-4 font-medium">
              Confían en nosotros
            </p>
            <div className="flex items-center justify-center gap-8 text-slate-400 text-sm font-medium">
              {['Empresas en Colombia', 'Latinoamérica', 'Soporte 24/7'].map(
                (item, i) => (
                  <motion.span
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1 + i * 0.1 }}
                    viewport={{ once: true }}
                    className="flex items-center gap-2"
                  >
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        delay: i * 0.3,
                      }}
                      className="w-2 h-2 bg-blue-400 rounded-full"
                    />
                    {item}
                  </motion.span>
                )
              )}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}

// Footer
function Footer() {
  return (
    <footer className="bg-slate-900 text-white py-16">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          <div className="md:col-span-2">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="flex items-center gap-3 mb-4"
            >
              <div className="w-10 h-10 bg-blue-600 flex items-center justify-center">
                <span className="text-white font-bold text-xl">A</span>
              </div>
              <span className="font-bold text-xl">APEX</span>
            </motion.div>
            <p className="text-slate-400 max-w-sm mb-6">
              La plataforma de cobranza inteligente para empresas
              latinoamericanas.
            </p>
            <span className="text-sm text-slate-500">
              Hecho con ❤️ en Colombia
            </span>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Producto</h4>
            <ul className="space-y-3">
              {['Cómo funciona', 'Precios', 'Demo'].map((item, i) => (
                <motion.li
                  key={item}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  viewport={{ once: true }}
                >
                  <a
                    href="#"
                    className="text-slate-400 hover:text-white transition-colors text-sm"
                  >
                    {item}
                  </a>
                </motion.li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-3">
              {['Privacidad', 'Términos'].map((item, i) => (
                <motion.li
                  key={item}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.1 }}
                  viewport={{ once: true }}
                >
                  <a
                    href="#"
                    className="text-slate-400 hover:text-white transition-colors text-sm"
                  >
                    {item}
                  </a>
                </motion.li>
              ))}
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-800 text-center">
          <p className="text-slate-500 text-sm">
            © 2026 APEX by BORLS. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  )
}

// Main Component
export function ScrollyLanding() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrolled, setScrolled] = useState(false)
  const [currentSlide, setCurrentSlide] = useState(0)

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  })

  const smoothProgress = useSpring(scrollYProgress, smoothSpring)
  const totalSlides = 6

  useTransform(smoothProgress, (latest) => {
    const newSlide = Math.min(Math.floor(latest * totalSlides), totalSlides - 1)
    if (newSlide !== currentSlide) {
      setCurrentSlide(newSlide)
    }
  })

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const slideOpacities = [
    useTransform(smoothProgress, [0, 0.12, 0.18], [1, 1, 0]),
    useTransform(smoothProgress, [0.16, 0.24, 0.35, 0.42], [0, 1, 1, 0]),
    useTransform(smoothProgress, [0.38, 0.46, 0.57, 0.64], [0, 1, 1, 0]),
    useTransform(smoothProgress, [0.6, 0.68, 0.79, 0.86], [0, 1, 1, 0]),
    useTransform(smoothProgress, [0.82, 0.9, 0.95, 0.98], [0, 1, 1, 0]),
    useTransform(smoothProgress, [0.94, 0.98, 1], [0, 1, 1]),
  ]

  const slides = [
    { Component: HeroSlide },
    { Component: ProblemSlide },
    { Component: SolutionSlide },
    { Component: ROISlide },
    { Component: PricingSlide },
    { Component: CTASlide },
  ]

  return (
    <>
      <Header scrolled={scrolled} />

      <div
        ref={containerRef}
        style={{ height: `${totalSlides * 100}vh` }}
        className="relative"
      >
        <div className="sticky top-0 h-screen w-full overflow-hidden">
          {/* Fixed background */}
          <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-slate-50" />
            <motion.div
              animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
              transition={{ duration: 10, repeat: Infinity }}
              className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-200/50 rounded-full blur-[120px]"
            />
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
              transition={{ duration: 12, repeat: Infinity, delay: 2 }}
              className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-blue-300/40 rounded-full blur-[100px]"
            />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808005_1px,transparent_1px),linear-gradient(to_bottom,#80808005_1px,transparent_1px)] bg-[size:4rem_4rem]" />
          </div>

          {/* Slides */}
          <div className="relative z-10 h-full">
            <AnimatePresence mode="wait">
              {slides.map((slide, index) => {
                const { Component } = slide
                return (
                  <motion.div
                    key={index}
                    style={{ opacity: slideOpacities[index] }}
                    className="absolute inset-0 w-full h-full"
                  >
                    <Component />
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>

          {/* Progress dots */}
          <div className="absolute right-8 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-4">
            {slides.map((_, idx) => (
              <motion.div
                key={idx}
                initial={false}
                animate={{
                  scale: currentSlide === idx ? 1.5 : 1,
                  backgroundColor: currentSlide === idx ? '#2563eb' : '#cbd5e1',
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="w-3 h-3 rounded-full cursor-pointer"
              />
            ))}
          </div>

          {/* Scroll indicator - always visible */}
          <motion.div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-40">
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="flex flex-col items-center gap-2"
            >
              <span className="text-slate-500 text-xs uppercase font-medium bg-white/80 backdrop-blur-sm px-3 py-1">
                Scroll
              </span>
              <div className="w-6 h-10 border-2 border-slate-400 rounded-full flex justify-center pt-2 bg-white/50 backdrop-blur-sm">
                <motion.div
                  animate={{ y: [0, 12, 0], opacity: [1, 0.3, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-1.5 h-3 bg-slate-500 rounded-full"
                />
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      <Footer />
    </>
  )
}
