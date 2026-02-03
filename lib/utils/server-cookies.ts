import { cookies } from 'next/headers'

export function getServerCookie(name: string): string | undefined {
  const cookieStore = cookies()
  return cookieStore.get(name)?.value
}

export function setServerCookie(name: string, value: string, options: {
  maxAge?: number
  expires?: Date
  path?: string
  domain?: string
  httpOnly?: boolean
  secure?: boolean
  sameSite?: 'strict' | 'lax' | 'none'
} = {}) {
  const cookieStore = cookies()
  const defaultOptions = {
    path: '/',
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    ...options
  }
  
  cookieStore.set(name, value, defaultOptions)
}

export function deleteServerCookie(name: string) {
  const cookieStore = cookies()
  cookieStore.delete(name)
}