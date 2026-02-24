/**
 * Utilidades para detectar el entorno de ejecución
 * Este archivo NO tiene 'use server' para poder ser usado en ambos lados
 */

/**
 * Verifica si estamos ejecutando en localhost o desarrollo
 * Funciona tanto en cliente como en servidor
 */
export function isLocalhost(): boolean {
  // En cliente, usamos window.location
  if (typeof window !== 'undefined') {
    return window.location.hostname === 'localhost' || 
           window.location.hostname === '127.0.0.1'
  }
  
  // En servidor, usamos la variable de entorno
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
  return appUrl.includes('localhost') || 
         appUrl.includes('127.0.0.1')
}
