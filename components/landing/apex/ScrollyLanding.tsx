'use client'

import * as React from 'react'
import { AnimatePresence } from 'framer-motion'
import {
  Frame0ROI,
} from '@/components/landing/frames/Frame0ROI'
import {
  Frame1Security,
} from '@/components/landing/frames/Frame1Security'
import {
  Frame2Telemetry,
} from '@/components/landing/frames/Frame2Telemetry'
import {
  Frame3Integrity,
} from '@/components/landing/frames/Frame3Integrity'
import {
  Frame4Plataform,
} from '@/components/landing/frames/Frame4Plataform'
import {
  Frame5Gobernance,
} from '@/components/landing/frames/Frame5Gobernance'
import {
  Frame6Close,
} from '@/components/landing/frames/Frame6Close'
import { LandingHeader } from '../LandingHeader'

interface TelemetryLog {
  time: string
  type: string
  id: string
}

export const ScrollyLanding: React.FC = () => {
  const [scrollProgress, setScrollProgress] = React.useState(0)
  const [logs, setLogs] = React.useState<TelemetryLog[]>([])
  const [mounted, setMounted] = React.useState(false)
  const [activeSection, setActiveSection] = React.useState(0)
  const [isMobile, setIsMobile] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)

  const TOTAL_FRAMES = 7

  React.useEffect(() => {
    setMounted(true)

    // Detectar dispositivos móviles o de bajos recursos
    const checkMobile = () => {
      const isTouchDevice = window.matchMedia('(pointer: coarse)').matches
      const isSmallScreen = window.innerWidth < 768
      const isLowMemory =
        (navigator as any).deviceMemory && (navigator as any).deviceMemory < 4
      setIsMobile(isTouchDevice || isSmallScreen || isLowMemory)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)

    // Sistema de scroll: Desktop usa secciones fijas, móvil usa scroll libre
    let isScrolling = false
    let scrollTimeout: NodeJS.Timeout
    let scrollAccumulator = 0
    const SCROLL_THRESHOLD = 150 // Acumular 150 unidades de scroll antes de cambiar
    const SCROLL_COOLDOWN = 1200 // 1.2 segundos de cooldown entre secciones

    const handleWheel = (e: WheelEvent) => {
      // Solo aplicar snap en desktop (no en móvil)
      if (isMobile) return

      e.preventDefault()

      if (isScrolling) return

      // Acumular el scroll
      scrollAccumulator += e.deltaY

      // Solo cambiar si se acumuló suficiente scroll
      if (Math.abs(scrollAccumulator) >= SCROLL_THRESHOLD) {
        const direction = scrollAccumulator > 0 ? 1 : -1
        const newSection = Math.max(
          0,
          Math.min(TOTAL_FRAMES - 1, activeSection + direction)
        )

        if (newSection !== activeSection) {
          isScrolling = true
          scrollAccumulator = 0 // Resetear acumulador

          setActiveSection(newSection)

          // Calcular progreso basado en sección
          const progress = newSection / (TOTAL_FRAMES - 1)
          setScrollProgress(progress)

          // Scroll a la posición exacta de la sección
          window.scrollTo({
            top: newSection * window.innerHeight,
            behavior: 'smooth',
          })

          // Prevenir múltiples scrolls rápidos
          scrollTimeout = setTimeout(() => {
            isScrolling = false
          }, SCROLL_COOLDOWN)
        } else {
          // Resetear si estamos en los límites
          scrollAccumulator = 0
        }
      }
    }

    const handleScroll = () => {
      if (!containerRef.current) return
      const scrollY = window.scrollY
      const totalHeight = containerRef.current.scrollHeight - window.innerHeight
      const progress = Math.min(scrollY / totalHeight, 1)
      setScrollProgress(progress)

      // En móvil, actualizar la sección activa basada en scroll posición
      if (isMobile) {
        const sectionHeight = window.innerHeight
        const currentSection = Math.min(
          Math.floor(scrollY / sectionHeight),
          TOTAL_FRAMES - 1
        )
        setActiveSection(currentSection)
      }
    }

    const types = [
      'PATTERN_MATCHED',
      'AGENT_SCAN',
      'INBOX_SUCCESS',
      'COMPLIANCE_OK',
      'ROI_UPDATED',
      'INBOX_REGISTERED',
      'COMPLIANCE_CHECK',
      'PATTERN_ERROR',
      'MCP_UPDATED',
      'SKILL_EXECUTED',
    ]
    const initialLogs = Array.from({ length: 10 }).map(() => ({
      time: new Date().toLocaleTimeString(),
      type: types[Math.floor(Math.random() * types.length)],
      id: Math.floor(10000 + Math.random() * 90000).toString(),
    }))
    setLogs(initialLogs)

    // Reducir frecuencia de actualización en móvil
    const intervalTime = isMobile ? 5000 : 3000
    const interval = setInterval(() => {
      setLogs((prev) => [
        {
          time: new Date().toLocaleTimeString(),
          type: types[Math.floor(Math.random() * types.length)],
          id: Math.floor(10000 + Math.random() * 90000).toString(),
        },
        ...prev.slice(0, 9),
      ])
    }, intervalTime)

    window.addEventListener('wheel', handleWheel, { passive: false })
    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('wheel', handleWheel)
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', checkMobile)
      clearInterval(interval)
      clearTimeout(scrollTimeout)
    }
  }, [isMobile, activeSection])

  if (!mounted) return <div className="min-h-screen bg-[#F8FAFC]" />

  const navItems = [
    { label: 'ROI', index: 0 },
    { label: 'Estrategia', index: 1 },
    { label: 'Plataforma', index: 4 },
    {
      label: 'Soluciones',
      dropdown: [{ label: 'APEX Collection', href: '/modules/collection' }],
    },
    { label: 'Valor', index: 5 },
  ]

  const sectionNames = [
    'INICIO',
    'SEGURIDAD',
    'ANÁLISIS',
    'CALIDAD',
    'PLATAFORMA',
    'GOVERNANZA',
    'SOLUCIONES',
  ]

  return (
    <div
      ref={containerRef}
      className="relative bg-[#F8FAFC] overflow-x-hidden"
      style={isMobile ? undefined : { height: `${TOTAL_FRAMES * 100}vh` }}
    >
      {/* Background - Video en desktop, estático en móvil */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        {isMobile ? (
          <div className="w-full h-full bg-gradient-to-br from-[#F8FAFC] via-[#E2E8F0] to-[#CBD5E1]">
            <div
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 50% 50%, #1dcd9f 0%, transparent 50%)',
              }}
            />
          </div>
        ) : (
          <video
            autoPlay
            loop
            muted
            playsInline
            className="w-screen h-screen object-contain"
            poster="/videos/apex-background-poster.jpg"
          >
            <source src="/videos/apex-background.mp4" type="video/mp4" />
          </video>
        )}
      </div>

      {/* Navbar */}
      <LandingHeader
        navItems={navItems}
        activeSection={activeSection}
        onNavClick={(index) => {
          setActiveSection(index)
          const progress = index / (TOTAL_FRAMES - 1)
          setScrollProgress(progress)
          if (!isMobile) {
            window.scrollTo({
              top: index * window.innerHeight,
              behavior: 'smooth',
            })
          }
        }}
      />

      {/* Main Content - Desktop: Fixed sections, Mobile: Stacked sections */}
      {isMobile ? (
        // Mobile Layout: Sections stacked vertically
        <div className="relative z-10 pt-20 overflow-x-hidden">
          <section className="min-h-screen flex items-center justify-center px-4 py-8">
            <Frame0ROI />
          </section>
          <section className="min-h-screen flex items-center justify-center px-4 py-8">
            <Frame1Security />
          </section>
          <section className="min-h-screen flex items-center justify-center px-4 py-8">
            <Frame2Telemetry logs={logs} />
          </section>
          <section className="min-h-screen flex items-center justify-center px-4 py-8">
            <Frame3Integrity />
          </section>
          <section className="min-h-screen flex items-center justify-center px-4 py-8">
            <Frame4Plataform />
          </section>
          <section className="min-h-screen flex items-center justify-center px-4 py-8">
            <Frame5Gobernance />
          </section>
          <section className="min-h-screen flex items-center justify-center px-4 py-8">
            <Frame6Close />
          </section>
        </div>
      ) : (
        // Desktop Layout: Fixed position with single section visible
        <div className="fixed inset-0 z-10 flex items-center justify-center overflow-hidden pointer-events-none pt-16 sm:pt-20">
          <div className="w-full h-full max-w-7xl mx-auto px-4 sm:px-6 flex items-start lg:items-center justify-center pointer-events-auto overflow-y-auto lg:overflow-visible py-4">
            <AnimatePresence mode="wait">
              {activeSection === 0 && <Frame0ROI />}
              {activeSection === 1 && <Frame1Security />}
              {activeSection === 2 && <Frame2Telemetry logs={logs} />}
              {activeSection === 3 && <Frame3Integrity />}
              {activeSection === 4 && <Frame4Plataform />}
              {activeSection === 5 && <Frame5Gobernance />}
              {activeSection === 6 && <Frame6Close />}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Side Progress Indicator - Hidden on mobile */}
      <div className="hidden md:flex fixed right-6 md:right-12 top-1/2 -translate-y-1/2 z-50 flex-col gap-8 items-end">
        {Array.from({ length: TOTAL_FRAMES }).map((_, i) => (
          <button
            key={i}
            onClick={() => {
              setActiveSection(i)
              const progress = i / (TOTAL_FRAMES - 1)
              setScrollProgress(progress)
              if (!isMobile) {
                window.scrollTo({
                  top: i * window.innerHeight,
                  behavior: 'smooth',
                })
              }
            }}
            className="flex items-center gap-4 group cursor-pointer"
          >
            <span
              className={`text-[10px] font-black tracking-widest uppercase transition-all duration-500 ${activeSection === i ? 'text-primary opacity-100' : 'text-gray-400 opacity-0 translate-x-4 group-hover:opacity-100 group-hover:translate-x-0'}`}
            >
              {sectionNames[i]}
            </span>
            <div
              className={`w-1 rounded-none transition-all duration-700 ${activeSection === i ? 'h-10 bg-primary' : 'h-3 bg-gray-300 group-hover:bg-primary group-hover:h-6'}`}
            />
          </button>
        ))}
      </div>

      {/* Scroll Indicator - Desktop only */}
      {!isMobile &&
        (activeSection < TOTAL_FRAMES - 1 ? (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 animate-bounce">
            <span className="text-[10px] font-black text-primary uppercase tracking-widest bg-white/90 backdrop-blur-sm px-3 py-1 border-2 border-primary shadow-[2px_2px_0px_#1dcd9f]">
              HAZ SCROLL PARA DESCUBRIR
            </span>
            <div className="w-8 h-8 bg-primary flex items-center justify-center shadow-[2px_2px_0px_#000] border-2 border-gray-900">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                />
              </svg>
            </div>
          </div>
        ) : (
          <button
            onClick={() => {
              setActiveSection(0)
              setScrollProgress(0)
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 group cursor-pointer"
          >
            <span className="text-[10px] font-black text-white uppercase tracking-widest bg-primary px-3 py-1 border-2 border-gray-900 shadow-[2px_2px_0px_#000] group-hover:shadow-none group-hover:translate-x-[2px] group-hover:translate-y-[2px] transition-all">
              Inicio
            </span>
            <div className="w-8 h-8 bg-white flex items-center justify-center shadow-[2px_2px_0px_#000] border-2 border-gray-900 group-hover:shadow-none group-hover:translate-x-[2px] group-hover:translate-y-[2px] transition-all">
              <svg
                className="w-5 h-5 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 10l7-7m0 0l7 7m-7-7v18"
                />
              </svg>
            </div>
          </button>
        ))}

      {/* Bottom Scroll Progress */}
      <div className="fixed bottom-0 left-0 right-0 h-1 bg-gray-200 z-50">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${scrollProgress * 100}%` }}
        />
      </div>
    </div>
  )
}
