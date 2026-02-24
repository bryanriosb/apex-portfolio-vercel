'use client'

import { deleteClientCookie } from './cookies'

/**
 * Limpia completamente todos los datos de sesión del navegador
 * Debe llamarse al cerrar sesión para evitar contaminación entre cuentas
 */
export function cleanupSession(): void {
  if (typeof window === 'undefined') return

  console.log('[Session Cleanup] Iniciando limpieza completa de sesión...')

  // 1. Limpiar localStorage de la aplicación
  const keysToRemove: string[] = []
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key) {
      // Eliminar todas las claves relacionadas con la app
      if (
        key.includes('active-business') ||
        key.includes('business') ||
        key.includes('user') ||
        key.includes('session') ||
        key.includes('auth') ||
        key.includes('colombia-locations') ||
        key.includes('tutorial') ||
        key.includes('permissions') ||
        key.includes('module-access') ||
        key.startsWith('sb-') // Supabase auth keys
      ) {
        keysToRemove.push(key)
      }
    }
  }

  keysToRemove.forEach(key => {
    localStorage.removeItem(key)
    console.log(`[Session Cleanup] localStorage eliminado: ${key}`)
  })

  // 2. Limpiar sessionStorage
  sessionStorage.clear()
  console.log('[Session Cleanup] sessionStorage limpiado')

  // 3. Limpiar cookies de aplicación
  const cookiesToDelete = [
    'sidebar_state',
    'welcome_modal_shown',
    'next-auth.session-token',
    'next-auth.callback-url',
    'next-auth.csrf-token',
  ]

  cookiesToDelete.forEach(cookieName => {
    deleteClientCookie(cookieName)
    console.log(`[Session Cleanup] Cookie eliminada: ${cookieName}`)
  })

  // 4. Limpiar Supabase auth del localStorage (sb-* keys)
  const supabaseKeys = [
    'sb-access-token',
    'sb-refresh-token',
    'sb-provider-token',
  ]
  
  supabaseKeys.forEach(key => {
    localStorage.removeItem(key)
    console.log(`[Session Cleanup] Supabase auth eliminado: ${key}`)
  })

  console.log('[Session Cleanup] Limpieza completada')
}

/**
 * Verifica si hay datos residuales de otra sesión
 * Útil para depuración
 */
export function checkSessionData(): {
  hasResidualData: boolean
  localStorageKeys: string[]
  cookies: string[]
} {
  if (typeof window === 'undefined') {
    return { hasResidualData: false, localStorageKeys: [], cookies: [] }
  }

  const localStorageKeys: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key) localStorageKeys.push(key)
  }

  const cookies = document.cookie.split(';').map(c => c.trim().split('=')[0])

  return {
    hasResidualData: localStorageKeys.length > 0 || cookies.length > 0,
    localStorageKeys,
    cookies,
  }
}
