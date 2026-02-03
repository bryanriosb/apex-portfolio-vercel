'use client'

import { useRef, useEffect, useState } from 'react'
import Lottie, { LottieRefCurrentProps } from 'lottie-react'
import animationData from '@/public/ai-voice-2.json'

interface VoiceVisualizerProps {
  state: 'idle' | 'listening' | 'speech-detected' | 'processing' | 'error'
  volume: number
  size?: number
  className?: string
  outputVolume?: number
}

export function VoiceVisualizer({
  state,
  volume,
  size = 80,
  className = '',
  outputVolume = 0,
}: VoiceVisualizerProps) {
  const lottieRef = useRef<LottieRefCurrentProps>(null)
  const [, setAnimationSpeed] = useState(1)

  const combinedVolume = Math.max(volume, outputVolume)
  const isActive = state === 'speech-detected' || outputVolume > 0.1

  useEffect(() => {
    if (!lottieRef.current) return

    // Solo cambia velocidad: más volumen = más rápido
    const speed = isActive ? 1 + combinedVolume * 3 : 0.5
    setAnimationSpeed(speed)
    lottieRef.current.setSpeed(speed)
  }, [combinedVolume, isActive])

  return (
    <div
      className={`flex items-center justify-center transition-all duration-300 ${className}`}
      style={{ width: size, height: size }}
    >
      <div
        className={`transition-all duration-500 ${
          isActive
            ? 'grayscale-0 brightness-100 saturate-100'
            : 'grayscale brightness-75 saturate-0'
        }`}
        style={{ width: '100%', height: '100%' }}
      >
        <Lottie
          lottieRef={lottieRef}
          animationData={animationData}
          loop
          autoplay
          style={{
            width: '100%',
            height: '100%',
          }}
        />
      </div>
    </div>
  )
}
