import { AUTH_OPTIONS } from '@/const/auth'
import NextAuth from 'next-auth'

const handler = NextAuth(AUTH_OPTIONS)
export { handler as GET, handler as POST }
