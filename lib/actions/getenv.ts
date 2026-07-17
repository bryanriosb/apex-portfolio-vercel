'use server'

import { requireUser } from '@/lib/auth/tenant-guard'

/**
 * Allowlist explícita de variables de entorno que pueden exponerse al
 * cliente. Cualquier otra variable (secrets, service keys, credenciales)
 * devuelve null. NO añadir variables sensibles a esta lista.
 */
const ALLOWED_ENV_VARS = ['WEBSOCKET_URL', 'WEBSOCKET_API_KEY'] as const

export async function getEnv(env: string) {
  await requireUser()

  if (!ALLOWED_ENV_VARS.includes(env as (typeof ALLOWED_ENV_VARS)[number])) {
    return null
  }

  const value = process.env[env]
  return value
}
