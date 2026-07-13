import axios, { AxiosInstance } from 'axios'
import { cookies } from 'next/headers'
import { selectedEnvironment } from '.'

const config = {
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
}

// Request to api without authentication
export const apiApexAi: AxiosInstance = axios.create(config)

apiApexAi.interceptors.request.use((request) => {
  request.baseURL = selectedEnvironment.API_BASE_URL
  return request
})

// Request to api with authentication and refresh token
const apiApexAiAuth: AxiosInstance = axios.create(config)

/**
 * Obtiene el access token de Supabase desde la sesión NextAuth del usuario.
 *
 * @returns El JWT de Supabase o null si no hay sesión de usuario (p. ej.
 * flujos de sistema como el aprovisionamiento durante el registro).
 */
async function getSessionSupabaseToken(): Promise<string | null> {
  try {
    const { getServerSession } = await import('next-auth')
    const { AUTH_OPTIONS } = await import('@/const/auth')
    const session = await getServerSession(AUTH_OPTIONS)
    return session?.user?.accessToken ?? null
  } catch {
    // Fuera de un contexto de request de Next.js no hay sesión disponible
    return null
  }
}

apiApexAiAuth.interceptors.request.use(
  async (request) => {
    request.baseURL = selectedEnvironment.API_BASE_URL

    if (!request.headers['Authorization']) {
      // SSO: el usuario autenticado se identifica ante apex-ai con su JWT de
      // Supabase; el backend resuelve business_id/business_account_id desde
      // el token (app/user_metadata o lookup en Supabase).
      const userToken = await getSessionSupabaseToken()

      // Fallback para flujos sin sesión de usuario (registro, tareas de
      // sistema): secret key programática con alcance de negocio fijo.
      const token = userToken ?? process.env.APEX_AI_SECRET

      if (token) {
        request.headers['Authorization'] = `Bearer ${token}`
      }
    }

    try {
      const cookieStore = cookies()
      const businessAccountId = cookieStore.get('x-business-account-id')?.value
      if (businessAccountId && !request.headers['x-business-account-id']) {
        request.headers['x-business-account-id'] = businessAccountId
      }
    } catch (e) {
      // Ignore if used outside of Next.js server context
    }

    const fullUrl = request.baseURL
      ? request.baseURL + request.url
      : request.url
    console.log('URL completa:', fullUrl)

    return request
  },
  (err) => err
)

export default apiApexAiAuth
