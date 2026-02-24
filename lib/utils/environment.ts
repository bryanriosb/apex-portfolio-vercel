/**
 * Hook para determinar si estamos en localhost
 * Esto permite hacer bypass del captcha en desarrollo
 */
export function useIsLocalhost(): boolean {
  if (typeof window === 'undefined') {
    // En SSR, asumimos que no es localhost (el servidor puede estar en cualquier lado)
    return false
  }
  
  return window.location.hostname === 'localhost' || 
         window.location.hostname === '127.0.0.1'
}

/**
 * Función síncrona para verificar si es localhost
 * Útil para lógica condicional en componentes
 */
export function isLocalhost(): boolean {
  if (typeof window === 'undefined') {
    return false
  }
  
  return window.location.hostname === 'localhost' || 
         window.location.hostname === '127.0.0.1'
}
