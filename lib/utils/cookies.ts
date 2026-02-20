// Client-side cookie utilities for browser usage
export function getClientCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift()
  }
  return undefined
}

export function setClientCookie(name: string, value: string, options: {
  maxAge?: number
  expires?: Date
  path?: string
  domain?: string
  secure?: boolean
  sameSite?: 'strict' | 'lax' | 'none'
} = {}) {
  if (typeof document === 'undefined') return

  const defaultOptions = {
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    ...options
  }

  let cookieString = `${name}=${value}`

  if (defaultOptions.maxAge) {
    cookieString += `; max-age=${defaultOptions.maxAge}`
  }

  if (defaultOptions.expires) {
    cookieString += `; expires=${defaultOptions.expires.toUTCString()}`
  }

  if (defaultOptions.path) {
    cookieString += `; path=${defaultOptions.path}`
  }

  if (defaultOptions.domain) {
    cookieString += `; domain=${defaultOptions.domain}`
  }

  if (defaultOptions.secure) {
    cookieString += `; secure`
  }

  if (defaultOptions.sameSite) {
    cookieString += `; samesite=${defaultOptions.sameSite}`
  }

  document.cookie = cookieString
}

export function deleteClientCookie(name: string) {
  if (typeof document === 'undefined') return
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
}