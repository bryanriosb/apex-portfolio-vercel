'use client'

import { Turnstile } from '@marsidev/react-turnstile'
import { useEffect } from 'react'

interface TurnstileWidgetProps {
  onSuccess: (token: string) => void
  onError?: () => void
  onLoad?: () => void
  className?: string
}

/**
 * Verifica si estamos en localhost
 */
function isLocalhost(): boolean {
  if (typeof window === 'undefined') {
    return false
  }
  
  return window.location.hostname === 'localhost' || 
         window.location.hostname === '127.0.0.1'
}

export function TurnstileWidget({
  onSuccess,
  onError,
  onLoad,
  className,
}: TurnstileWidgetProps) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

  // Bypass para desarrollo local
  useEffect(() => {
    if (isLocalhost()) {
      console.log('[DEV] Bypassing Turnstile widget for localhost')
      // Llamar onLoad inmediatamente para simular inicio de carga
      onLoad?.()
      // Llamar onSuccess con un token dummy después de un pequeño delay
      // para simular la carga del widget
      const timer = setTimeout(() => {
        onSuccess('localhost-bypass-token')
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [onSuccess, onLoad])

  // Si es localhost, no mostrar el widget
  if (isLocalhost()) {
    return (
      <div className={className}>
        <div className="text-xs text-muted-foreground text-center py-2">
          [Modo desarrollo] Verificación de seguridad omitida
        </div>
      </div>
    )
  }

  if (!siteKey) {
    console.error('NEXT_PUBLIC_TURNSTILE_SITE_KEY no está configurado')
    return null
  }

  return (
    <div className={className}>
      <Turnstile
        siteKey={siteKey}
        onSuccess={onSuccess}
        onError={onError}
        onLoad={onLoad}
      />
    </div>
  )
}
