'use client'

import * as React from 'react'
import { AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import {
  Frame0ROI,
  Frame1Seguridad,
  Frame2Telemetria,
  Frame3Integridad,
  Frame4Plataforma,
  Frame5Gobernanza,
  Frame6Cierre,
} from '@/components/landing'
import { Crosshair } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Loading from '@/components/ui/loading'

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
  const router = useRouter()
  const [isLoading, setIsLoading] = React.useState(false)

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
        const newSection = Math.max(0, Math.min(TOTAL_FRAMES - 1, activeSection + direction))
        
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
            behavior: 'smooth'
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
    ]
    const initialLogs = Array.from({ length: 6 }).map(() => ({
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
        ...prev.slice(0, 5),
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
    { label: 'Valor', index: 5 },
  ]

  const sectionNames = [
    'INICIO',
    'SEGURIDAD',
    'ANALYTICS',
    'CALIDAD',
    'PLANES',
    'LEGAL',
    'READY',
  ]

  const goSignUp = (event: React.MouseEvent) => {
    event.preventDefault()
    setIsLoading(true)
    router.push('/auth/sign-up')
  }

  return (
    <div
      ref={containerRef}
      className="relative bg-[#F8FAFC]"
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
                  'radial-gradient(circle at 50% 50%, #0052FF 0%, transparent 50%)',
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
      <nav className="fixed top-0 w-full z-50 px-4 sm:px-6 md:px-12 py-4 sm:py-6 flex items-center justify-between border-b-2 border-gray-900 bg-white/90 backdrop-blur-md">
        <div className="flex items-center gap-3 sm:gap-4 text-left">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#0052FF] flex items-center justify-center shadow-[3px_3px_0px_#000] sm:shadow-[4px_4px_0px_#000] border-2 border-gray-900">
            <Crosshair className="text-white w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="flex flex-col">
            <span className="text-gray-900 font-black text-lg sm:text-xl tracking-tighter leading-none uppercase">
              APEX
            </span>
            <span className="text-[8px] sm:text-[10px] text-gray-500 font-mono tracking-tighter uppercase font-bold hidden sm:block">
              Adaptive Planning & Execution
            </span>
          </div>
        </div>
        <div className="hidden lg:flex gap-10">
          {navItems.map((item) => (
            <button
              key={item.label}
              onClick={() =>
                window.scrollTo({
                  top: item.index * window.innerHeight,
                  behavior: 'smooth',
                })
              }
              className={`text-xs font-black transition-all duration-300 uppercase tracking-widest relative group ${
                (
                  item.index === 1
                    ? [1, 2, 3].includes(activeSection)
                    : activeSection === item.index
                )
                  ? 'text-[#0052FF]'
                  : 'text-gray-900 hover:text-[#0052FF]'
              }`}
            >
              {item.label}
              <span
                className={`absolute -bottom-1 left-0 h-0.5 bg-[#0052FF] transition-all duration-300 ${
                  (
                    item.index === 1
                      ? [1, 2, 3].includes(activeSection)
                      : activeSection === item.index
                  )
                    ? 'w-full'
                    : 'w-0 group-hover:w-full'
                }`}
              />
            </button>
          ))}
        </div>
        <Button
          onClick={goSignUp}
          className="text-white hover:bg-[#0052FF] hover:text-white font-black text-[10px] sm:text-xs uppercase tracking-widest rounded-none px-4 sm:px-8 py-4 sm:py-6 border-2 border-gray-900 shadow-[3px_3px_0px_#000] sm:shadow-[4px_4px_0px_#000] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
        >
          <span className="hidden sm:inline">Agendar Demo</span>
          <span className="sm:hidden">Demo</span>
          {isLoading && <Loading className="w-4 h-4 ml-2 text-white" />}
        </Button>
      </nav>

      {/* Main Content - Desktop: Fixed sections, Mobile: Stacked sections */}
      {isMobile ? (
        // Mobile Layout: Sections stacked vertically
        <div className="relative z-10 pt-20">
          <section className="min-h-screen flex items-center justify-center px-4 py-8">
            <Frame0ROI />
          </section>
          <section className="min-h-screen flex items-center justify-center px-4 py-8">
            <Frame1Seguridad />
          </section>
          <section className="min-h-screen flex items-center justify-center px-4 py-8">
            <Frame2Telemetria logs={logs} />
          </section>
          <section className="min-h-screen flex items-center justify-center px-4 py-8">
            <Frame3Integridad />
          </section>
          <section className="min-h-screen flex items-center justify-center px-4 py-8">
            <Frame4Plataforma />
          </section>
          <section className="min-h-screen flex items-center justify-center px-4 py-8">
            <Frame5Gobernanza />
          </section>
          <section className="min-h-screen flex items-center justify-center px-4 py-8">
            <Frame6Cierre />
          </section>
        </div>
      ) : (
        // Desktop Layout: Fixed position with single section visible
        <div className="fixed inset-0 z-10 flex items-center justify-center overflow-hidden pointer-events-none pt-16 sm:pt-20">
          <div className="w-full h-full max-w-7xl mx-auto px-4 sm:px-6 flex items-start lg:items-center justify-center pointer-events-auto overflow-y-auto lg:overflow-visible py-4">
            <AnimatePresence mode="wait">
              {activeSection === 0 && <Frame0ROI />}
              {activeSection === 1 && <Frame1Seguridad />}
              {activeSection === 2 && <Frame2Telemetria logs={logs} />}
              {activeSection === 3 && <Frame3Integridad />}
              {activeSection === 4 && <Frame4Plataforma />}
              {activeSection === 5 && <Frame5Gobernanza />}
              {activeSection === 6 && <Frame6Cierre />}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Side Progress Indicator - Hidden on mobile */}
      <div className="hidden md:flex fixed right-6 md:right-12 top-1/2 -translate-y-1/2 z-50 flex-col gap-8 items-end">
        {Array.from({ length: TOTAL_FRAMES }).map((_, i) => (
          <button
            key={i}
            onClick={() =>
              window.scrollTo({
                top: i * window.innerHeight,
                behavior: 'smooth',
              })
            }
            className="flex items-center gap-4 group cursor-pointer"
          >
            <span
              className={`text-[10px] font-black tracking-widest uppercase transition-all duration-500 ${activeSection === i ? 'text-[#0052FF] opacity-100' : 'text-gray-400 opacity-0 translate-x-4 group-hover:opacity-100 group-hover:translate-x-0'}`}
            >
              {sectionNames[i]}
            </span>
            <div
              className={`w-1 rounded-none transition-all duration-700 ${activeSection === i ? 'h-10 bg-[#0052FF]' : 'h-3 bg-gray-300 group-hover:bg-[#0052FF] group-hover:h-6'}`}
            />
          </button>
        ))}
      </div>

      {/* Scroll Indicator - Desktop only */}
      {!isMobile && (
        activeSection < TOTAL_FRAMES - 1 ? (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 animate-bounce">
            <span className="text-[10px] font-black text-[#0052FF] uppercase tracking-widest bg-white/90 backdrop-blur-sm px-3 py-1 border-2 border-[#0052FF] shadow-[2px_2px_0px_#0052FF]">
              Scroll
            </span>
            <div className="w-8 h-8 bg-[#0052FF] flex items-center justify-center shadow-[2px_2px_0px_#000] border-2 border-gray-900">
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
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 group cursor-pointer"
          >
            <span className="text-[10px] font-black text-white uppercase tracking-widest bg-[#0052FF] px-3 py-1 border-2 border-gray-900 shadow-[2px_2px_0px_#000] group-hover:shadow-none group-hover:translate-x-[2px] group-hover:translate-y-[2px] transition-all">
              Inicio
            </span>
            <div className="w-8 h-8 bg-white flex items-center justify-center shadow-[2px_2px_0px_#000] border-2 border-gray-900 group-hover:shadow-none group-hover:translate-x-[2px] group-hover:translate-y-[2px] transition-all">
              <svg
                className="w-5 h-5 text-[#0052FF]"
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
        )
      )}

      {/* Bottom Scroll Progress */}
      <div className="fixed bottom-0 left-0 right-0 h-1 bg-gray-200 z-50">
        <div
          className="h-full bg-[#0052FF] transition-all duration-300"
          style={{ width: `${scrollProgress * 100}%` }}
        />
      </div>
    </div>
  )
}
