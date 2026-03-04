'use server'

import { isLocalhost } from '@/lib/utils/is-localhost'

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

export interface TurnstileVerificationResult {
  success: boolean
  error?: string
}

export async function verifyTurnstileToken(
  token: string
): Promise<TurnstileVerificationResult> {
  // Bypass para desarrollo local
  if (isLocalhost()) {
    console.log('[DEV] Bypassing Turnstile verification for localhost')
    return { success: true }
  }

  try {
    const secretKey = process.env.TURNSTILE_SECRET_KEY

    if (!secretKey) {
      console.error('TURNSTILE_SECRET_KEY no está configurado')
      return {
        success: false,
        error: 'Error de configuración del servidor',
      }
    }

    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      body: `secret=${encodeURIComponent(secretKey)}&response=${encodeURIComponent(token)}`,
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
      },
    })

    if (!response.ok) {
      return {
        success: false,
        error: 'Error al verificar el captcha',
      }
    }

    const data = await response.json()

    if (data.success) {
      return { success: true }
    } else {
      console.error('Turnstile verification failed:', data)
      return {
        success: false,
        error: 'Verificación de seguridad fallida. Por favor, intenta de nuevo.',
      }
    }
  } catch (error) {
    console.error('Error verifying turnstile token:', error)
    return {
      success: false,
      error: 'Error al verificar la seguridad. Por favor, intenta de nuevo.',
    }
  }
}
