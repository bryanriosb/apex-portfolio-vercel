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
      return { ...token, ...user }
    },
    async session({ session, token }) {
      session.user = token as any
      return session
    },
  },
  pages: {
    signIn: '/auth/sign-in',
    signOut: '/auth/sign-in', // Redirect to sign-in page on sign out
  },
}
