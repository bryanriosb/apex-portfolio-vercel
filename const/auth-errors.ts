/**
 * Constantes de error de autenticación seguras para el Edge Runtime.
 *
 * Viven aparte de `const/auth.ts` porque ese módulo importa `next-auth`
 * (y su cadena hacia Supabase), que usa evaluación dinámica de código no
 * permitida en el Edge Runtime del middleware. El middleware solo necesita
 * este string, así que lo aísla aquí para no arrastrar todo next-auth al
 * bundle edge.
 */

/** Marca en el JWT/sesión de que el access token ya no es utilizable. */
export const AUTH_ERROR_SESSION_EXPIRED = 'SessionExpired'
