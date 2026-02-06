'use client'

import { motion, useScroll, useTransform, useSpring } from 'framer-motion'
import { useRef, useState } from 'react'
import { ArrowRight, Terminal, Activity, Shield, Zap, Database, FileSpreadsheet, Server, Mail, Users } from 'lucide-react'
import Link from 'next/link'

// Placeholder video - Replace with your local video path (e.g., '/videos/hero.mp4')
const VIDEO_SRC = "https://assets.mixkit.co/videos/preview/mixkit-digital-animation-of-a-blue-grid-962-large.mp4"

const slides = [
  {
    id: 'hero',
    content: (
      <div className="h-full flex flex-col justify-center max-w-5xl">
        <div className="mb-6 inline-flex items-center gap-2 px-3 py-1 rounded border border-white/20 bg-black/40 backdrop-blur-md text-xs font-mono tracking-wider uppercase text-blue-400">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </span>
          APEX OS v1.0
        </div>
        <h1 className="text-6xl md:text-8xl lg:text-9xl font-bold tracking-tighter leading-none mb-8 text-white">
          APEX <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-blue-200 to-white">
            INTELIGENTE
          </span>
        </h1>
        <p className="text-xl md:text-2xl text-gray-300 max-w-2xl mb-12 font-light leading-relaxed">
          El sistema operativo para la recuperación de cartera. 
          Ejecución implacable mediante arquitectura serverless.
        </p>
      </div>
    )
  },
  {
    id: 'architecture',
    content: (
      <div className="h-full w-full flex flex-col justify-center items-center">
         <div className="mb-8 inline-flex items-center gap-2 px-3 py-1 rounded border border-white/20 bg-black/40 backdrop-blur-md text-xs font-mono tracking-wider uppercase text-purple-400">
          <Activity className="w-3 h-3" />
          ARQUITECTURA DE FLUJO
        </div>
        <h2 className="text-4xl md:text-6xl font-bold tracking-tighter mb-12 text-white text-center">
          FLUJO <span className="text-purple-400">SERVERLESS</span>
        </h2>
        
        {/* Compact Architecture Diagram */}
        <div className="relative w-full max-w-6xl grid grid-cols-1 md:grid-cols-5 gap-4 items-center p-8 rounded-xl border border-white/10 bg-black/40 backdrop-blur-sm">
           
           {/* Node 1 */}
           <div className="flex flex-col items-center text-center gap-2 relative z-10">
              <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800">
                 <FileSpreadsheet className="w-6 h-6 text-blue-400" />
              </div>
              <p className="text-xs font-mono text-gray-400">INPUT</p>
              {/* Connector */}
              <div className="hidden md:block absolute top-1/2 -right-1/2 w-full h-[1px] bg-zinc-800 -z-10" />
           </div>

           {/* Node 2 */}
           <div className="flex flex-col items-center text-center gap-2 relative z-10">
              <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800">
                 <Database className="w-6 h-6 text-purple-400" />
              </div>
              <p className="text-xs font-mono text-gray-400">STORAGE</p>
               <div className="hidden md:block absolute top-1/2 -right-1/2 w-full h-[1px] bg-zinc-800 -z-10" />
           </div>

           {/* Node 3 - Central */}
           <div className="flex flex-col items-center text-center gap-2 relative z-10">
              <div className="p-6 rounded-xl bg-zinc-900 border border-blue-500/50 shadow-[0_0_30px_-10px_rgba(59,130,246,0.2)]">
                 <Server className="w-8 h-8 text-white" />
              </div>
              <p className="text-xs font-mono text-blue-300">LAMBDA WORKER</p>
               <div className="hidden md:block absolute top-1/2 -right-1/2 w-full h-[1px] bg-zinc-800 -z-10" />
           </div>

           {/* Node 4 */}
           <div className="flex flex-col items-center text-center gap-2 relative z-10">
              <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800">
                 <Mail className="w-6 h-6 text-green-400" />
              </div>
              <p className="text-xs font-mono text-gray-400">DELIVERY</p>
               <div className="hidden md:block absolute top-1/2 -right-1/2 w-full h-[1px] bg-zinc-800 -z-10" />
           </div>

            {/* Node 5 */}
           <div className="flex flex-col items-center text-center gap-2 relative z-10">
              <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800">
                 <Users className="w-6 h-6 text-gray-200" />
              </div>
              <p className="text-xs font-mono text-gray-400">CLIENTS</p>
           </div>
        </div>

        <div className="grid grid-cols-3 gap-8 mt-12 w-full max-w-4xl text-center">
            <div>
                <h4 className="text-white font-bold text-lg">Ingesta Masiva</h4>
                <p className="text-gray-500 text-sm">Procesamiento paralelo</p>
            </div>
             <div>
                <h4 className="text-white font-bold text-lg">Orquestación</h4>
                <p className="text-gray-500 text-sm">Decisión en tiempo real</p>
            </div>
             <div>
                <h4 className="text-white font-bold text-lg">Compliance</h4>
                <p className="text-gray-500 text-sm">Traza inmutable</p>
            </div>
        </div>
      </div>
    )
  },
  {
    id: 'cta',
    content: (
      <div className="h-full flex flex-col justify-center items-center text-center">
        <h2 className="text-5xl md:text-8xl font-bold tracking-tighter mb-8 text-white">
          LISTO PARA <br />
          <span className="text-blue-500">ESCALAR?</span>
        </h2>
        <div className="flex flex-col sm:flex-row gap-6 mt-8">
            <Link 
              href="/auth/sign-up"
              className="group flex items-center justify-center gap-3 px-8 py-4 bg-blue-600 text-white text-lg font-semibold tracking-wide hover:bg-blue-500 transition-all rounded-sm"
            >
              INICIAR PRUEBA
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
        </div>
      </div>
    )
  }
]

export function ScrollyLanding() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  })

  // Smooth out the scroll progress
  const smoothProgress = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 })

  const [currentSlide, setCurrentSlide] = useState(0)

  // Map scroll progress to slide index
  useTransform(smoothProgress, (latest) => {
    const slideCount = slides.length
    const newSlide = Math.min(Math.floor(latest * slideCount), slideCount - 1)
    if (newSlide !== currentSlide) {
      setCurrentSlide(newSlide)
    }
  })

  // Opacity transforms for each slide based on scroll position
  const opacity0 = useTransform(smoothProgress, [0, 0.25, 0.3], [1, 1, 0])
  const scale0 = useTransform(smoothProgress, [0, 0.3], [1, 0.8])
  
  const opacity1 = useTransform(smoothProgress, [0.3, 0.4, 0.6, 0.7], [0, 1, 1, 0])
  const y1 = useTransform(smoothProgress, [0.3, 0.4], [50, 0])
  
  const opacity2 = useTransform(smoothProgress, [0.7, 0.8, 1], [0, 1, 1])
  const scale2 = useTransform(smoothProgress, [0.7, 0.8], [0.9, 1])

  return (
    <div ref={containerRef} className="relative h-[400vh] bg-black">
      {/* Sticky Container */}
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        
        {/* Background Video */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-black/60 z-10" /> {/* Overlay for text contrast */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] z-20 opacity-20"></div>
          
          <video 
            autoPlay 
            muted 
            loop 
            playsInline 
            className="w-full h-full object-cover opacity-60"
          >
            <source src={VIDEO_SRC} type="video/mp4" />
            {/* Fallback if video fails to load */}
            <div className="w-full h-full bg-gradient-to-br from-gray-900 to-black" />
          </video>
        </div>

        {/* Content Layers */}
        <div className="relative z-30 container mx-auto px-6 h-full">
          
          {/* Slide 1: Hero */}
          <motion.div 
            style={{ opacity: opacity0, scale: scale0 }}
            className="absolute inset-0 w-full h-full pointer-events-none"
          >
             <div className="h-full w-full flex items-center pointer-events-auto">
                {slides[0].content}
             </div>
          </motion.div>

          {/* Slide 2: Architecture */}
          <motion.div 
            style={{ opacity: opacity1, y: y1 }}
            className="absolute inset-0 w-full h-full pointer-events-none"
          >
            <div className="h-full w-full flex items-center pointer-events-auto">
                {slides[1].content}
            </div>
          </motion.div>

          {/* Slide 3: CTA */}
          <motion.div 
             style={{ opacity: opacity2, scale: scale2 }}
             className="absolute inset-0 w-full h-full pointer-events-none"
          >
            <div className="h-full w-full flex items-center justify-center pointer-events-auto">
                {slides[2].content}
            </div>
          </motion.div>

        </div>

        {/* Progress Bar / Navigation Dots */}
        <div className="absolute right-8 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-4">
          {slides.map((_, idx) => (
            <div 
              key={idx}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                currentSlide === idx ? 'bg-blue-500 scale-125' : 'bg-white/20'
              }`}
            />
          ))}
        </div>

        {/* Scroll Indicator */}
        <motion.div 
          style={{ opacity: useTransform(smoothProgress, [0.9, 1], [1, 0]) }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 text-white/50 text-xs tracking-[0.2em] z-40 animate-pulse"
        >
          SCROLL TO EXPLORE
        </motion.div>

      </div>
    </div>
  )
}
