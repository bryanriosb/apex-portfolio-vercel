'use client'

import React, { useEffect, useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { ZoomIn, ZoomOut, RefreshCw } from 'lucide-react'
import { t } from '@/lib/i18n'

export function MermaidViewer({ chart }: { chart: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const isDragging = useRef(false)
  const lastMousePos = useRef({ x: 0, y: 0 })

  useEffect(() => {
    if (containerRef.current && chart) {
      import('mermaid').then((mermaidModule) => {
        const mermaid = mermaidModule.default
        mermaid.initialize({ startOnLoad: false, theme: 'default' })
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`
        mermaid.render(id, chart).then(({ svg }) => {
          if (containerRef.current) {
            containerRef.current.innerHTML = svg
            const svgEl = containerRef.current.querySelector('svg')
            if (svgEl) {
              svgEl.style.width = '100%'
              svgEl.style.height = '100%'
              svgEl.style.maxWidth = 'none'
            }
          }
        }).catch((err: any) => {
          console.error('Mermaid parsing error', err)
          if (containerRef.current) {
            containerRef.current.innerHTML = `<p class="text-red-500">${t('ui.errorRenderizandoDiagrama')}</p><pre class="text-xs overflow-auto max-h-[300px]">${chart}</pre>`
          }
        })
      })
    }
  }, [chart])

  useEffect(() => {
    const wrapper = wrapperRef.current
    if (!wrapper) return

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      const zoomFactor = -e.deltaY * 0.001
      setScale((s) => Math.min(Math.max(0.1, s + zoomFactor), 5))
    }

    wrapper.addEventListener('wheel', handleWheel, { passive: false })
    return () => wrapper.removeEventListener('wheel', handleWheel)
  }, [])

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true
    lastMousePos.current = { x: e.clientX, y: e.clientY }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return
    const dx = e.clientX - lastMousePos.current.x
    const dy = e.clientY - lastMousePos.current.y
    setPosition((p) => ({ x: p.x + dx, y: p.y + dy }))
    lastMousePos.current = { x: e.clientX, y: e.clientY }
  }

  const handleMouseUp = () => {
    isDragging.current = false
  }

  return (
    <div
      ref={wrapperRef}
      className="relative w-full h-full overflow-hidden bg-transparent cursor-grab active:cursor-grabbing"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <Button
          variant="secondary"
          size="icon"
          className="h-8 w-8"
          onClick={() => setScale((s) => Math.min(5, s + 0.2))}
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          className="h-8 w-8"
          onClick={() => setScale((s) => Math.max(0.1, s - 0.2))}
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          className="h-8 w-8"
          onClick={() => {
            setScale(1)
            setPosition({ x: 0, y: 0 })
          }}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
      <div
        ref={containerRef}
        className="w-full h-full flex items-center justify-center origin-center transition-transform duration-75"
        style={{
          transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
        }}
      />
    </div>
  )
}
