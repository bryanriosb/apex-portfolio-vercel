'use server'

import { verifyTurnstileToken } from '@/lib/services/turnstile/turnstile-service'

export async function verifyTurnstileAction(token: string) {
  return verifyTurnstileToken(token)
}
