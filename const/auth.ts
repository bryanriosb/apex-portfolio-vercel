import CredentialsProvider from 'next-auth/providers/credentials'
import { AuthOptions } from 'next-auth'
import { authenticate } from '@/lib/services/auth/authentication'

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
      const expiresAt = typeof token.expiresAt === 'number' ? token.expiresAt : 0
      const needsRefresh = expiresAt > 0 && Date.now() / 1000 > expiresAt - 60

      if (!needsRefresh || typeof token.refreshToken !== 'string') {
        return token
      }

      const { refreshSupabaseSession } = await import(
        '@/lib/services/auth/supabase-auth'
      )
      const refreshed = await refreshSupabaseSession(token.refreshToken)

      if (!refreshed) {
        // La sesión de NextAuth se conserva para no romper el resto de la
        // app; solo las llamadas autenticadas con JWT de Supabase caerán al
        // fallback hasta un nuevo login.
        console.error('No fue posible refrescar el access token de Supabase')
        return { ...token, accessToken: null }
      }

      return {
        ...token,
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken,
        expiresAt: refreshed.expiresAt,
      }
    },
    async session({ session, token }) {
      // El refresh token nunca viaja al navegador: solo vive en el JWT
      // cifrado de NextAuth (cookie httpOnly) para la rotación server-side.
      const { refreshToken: _refreshToken, ...user } = token as any
      session.user = user
      return session
    },
  },
  pages: {
    signIn: '/auth/sign-in',
    signOut: '/auth/sign-in', // Redirect to sign-in page on sign out
  },
}
