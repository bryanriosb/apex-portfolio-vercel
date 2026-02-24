'use server'

import { authenticateWithSupabase } from './supabase-auth'
import { verifyTurnstileToken } from '@/lib/services/turnstile/turnstile-service'
import { isLocalhost } from '@/lib/utils/is-localhost'

export async function authenticate(
  credentials: Record<'username' | 'password' | 'turnstileToken', string> | undefined
) {
  try {
    if (!credentials) return null

    const { username, password, turnstileToken } = credentials

    // Validate Turnstile token solo en producción
    if (!isLocalhost()) {
      if (!turnstileToken) {
        console.error('Turnstile token is missing')
        return null
      }

      const turnstileResult = await verifyTurnstileToken(turnstileToken)
      if (!turnstileResult.success) {
        console.error('Turnstile verification failed:', turnstileResult.error)
        return null
      }
    } else {
      console.log('[DEV] Bypassing Turnstile validation for localhost sign-in')
    }

    // Authenticate with Supabase
    const user = await authenticateWithSupabase({
      email: username,
      password,
    })

    if (!user) return null

    // Return user session data in the format expected by NextAuth
    const userSessionData = {
      id: user.id,
      username: user.email,
      email: user.email,
      name: user.name || 'Admin',
      role: user.role,
      business_id: user.business_id || user.businesses?.[0]?.id || null,
      business_account_id: user.business_account_id,
      business_type: user.business_type,
      subscription_plan: user.subscription_plan,
      email_verified: user.email_verified,
      tenant_name: user.tenant_name,
      instance_id: user.instance_id,
      businesses: user.businesses,
      accessToken: user.accessToken,
    }

    return userSessionData
  } catch (err) {
    console.error('Cannot sign in:', err)
    return null
  }
}
