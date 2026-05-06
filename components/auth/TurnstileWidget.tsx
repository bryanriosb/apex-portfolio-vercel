'use client'

import { Turnstile } from '@marsidev/react-turnstile'
import { useEffect, useRef, useImperativeHandle, forwardRef, useState } from 'react'

export interface TurnstileWidgetRef {
  reset: () => void
}

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

  return (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  )
}

export const TurnstileWidget = forwardRef<
  TurnstileWidgetRef,
  TurnstileWidgetProps
>(function TurnstileWidget({ onSuccess, onError, onLoad, className }, ref) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
  const turnstileRef = useRef<any>(null)
  const [isLocal, setIsLocal] = useState<boolean | null>(null)

  useImperativeHandle(ref, () => ({
    reset: () => {
      if (turnstileRef.current) {
        turnstileRef.current.reset()
      }
    },
  }))

  useEffect(() => {
    setIsLocal(isLocalhost())
  }, [])

  useEffect(() => {
    if (isLocal) {
      onLoad?.()
      const timer = setTimeout(() => {
        onSuccess('localhost-bypass-token')
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [isLocal, onSuccess, onLoad])

  if (isLocal === null) {
    return null
  }

  if (isLocal) {
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
        ref={turnstileRef}
        siteKey={siteKey}
        onSuccess={onSuccess}
        onError={onError}
        onLoad={onLoad}
      />
    </div>
  )
})
