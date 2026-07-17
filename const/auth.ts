import CredentialsProvider from 'next-auth/providers/credentials'
import { AuthOptions } from 'next-auth'
import { authenticate } from '@/lib/services/auth/authentication'

// Se re-exporta desde el módulo edge-safe para mantener compatibilidad con
// los imports existentes (tests, callbacks) sin duplicar la constante.
export { AUTH_ERROR_SESSION_EXPIRED } from '@/const/auth-errors'
import { AUTH_ERROR_SESSION_EXPIRED } from '@/const/auth-errors'

/**
 * Lee el claim `exp` de un JWT sin verificar firma (solo para decidir
 * rotación server-side; la verificación real la hace el backend).
 * Permite recuperar la expiración en sesiones acuñadas antes de que el
 * login guardara `expiresAt`.
 */
function jwtExpSeconds(token: unknown): number | null {
  if (typeof token !== 'string') return null
  try {
    const payload = JSON.parse(
      Buffer.from(token.split('.')[1], 'base64url').toString('utf8')
    )
    return typeof payload.exp === 'number' ? payload.exp : null
  } catch {
    return null
  }
}

export const AUTH_OPTIONS: AuthOptions = {
  // Configure one or more authentication providers
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      credentials: {
        username: {
          label: 'Username',
          type: 'text',
        },
        password: {
          label: 'Password',
          type: 'password',
        },
        turnstileToken: {
          label: 'Turnstile Token',
          type: 'text',
        },
      },
      async authorize(credentials) {
        const userSessionData = await authenticate(credentials)
        return userSessionData ?? null
      },
    }),
  ],

  session: { strategy: 'jwt', maxAge: 28800 }, // Seconds - 8 hours
  callbacks: {
    async jwt({ token, user }) {
      // Login inicial: los datos del usuario (incluidos los tokens de
      // Supabase) entran al JWT de NextAuth.
      if (user) {
        return { ...token, ...user }
      }

      // Rotación del access token de Supabase: los access tokens expiran
      // antes que la sesión de NextAuth (8 h), y las llamadas al API de
      // apex-ai se autentican con este JWT. Margen de 60 s para no usar un
      // token que expire en vuelo.
      //
      // Sesiones legacy (previas al SSO): si el JWT no guardó `expiresAt`,
      // se recupera del propio access token — un JWT sin expiración
      // conocible jamás debe servirse como válido indefinidamente.
      const expiresAt =
        typeof token.expiresAt === 'number' && token.expiresAt > 0
          ? token.expiresAt
          : (jwtExpSeconds(token.accessToken) ?? 0)
      const hasAccessToken = typeof token.accessToken === 'string'
      const isStale = expiresAt === 0 || Date.now() / 1000 > expiresAt - 60

      if (!hasAccessToken || !isStale) {
        return token
      }

      if (typeof token.refreshToken !== 'string') {
        // Access token vencido (o de expiración desconocida) sin refresh
        // token: la sesión no puede sostenerse. Se marca para que el
        // middleware fuerce un nuevo login en la siguiente navegación.
        console.error(
          'Access token de Supabase vencido sin refresh token (sesión legacy); se requiere re-login'
        )
        return { ...token, accessToken: null, authError: AUTH_ERROR_SESSION_EXPIRED }
      }

      const { refreshSupabaseSession } = await import(
        '@/lib/services/auth/supabase-auth'
      )
      const refreshed = await refreshSupabaseSession(token.refreshToken)

      if (!refreshed) {
        // Refresh imposible (token rotado/revocado): mismo tratamiento que
        // la sesión legacy — nunca servir un access token muerto.
        console.error('No fue posible refrescar el access token de Supabase')
        return { ...token, accessToken: null, authError: AUTH_ERROR_SESSION_EXPIRED }
      }

      return {
        ...token,
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken,
        expiresAt: refreshed.expiresAt,
        authError: undefined,
      }
    },
    async session({ session, token }) {
      // El refresh token nunca viaja al navegador: solo vive en el JWT
      // cifrado de NextAuth (cookie httpOnly) para la rotación server-side.
      const user = { ...(token as Record<string, unknown>) }
      delete user.refreshToken
      session.user = user as unknown as typeof session.user
      return session
    },
  },
  pages: {
    signIn: '/auth/sign-in',
    signOut: '/auth/sign-in', // Redirect to sign-in page on sign out
  },
}
