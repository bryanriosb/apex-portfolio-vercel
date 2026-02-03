import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

// This function can be marked `async` if using `await` inside
export async function middleware(req: NextRequest) {
  const session: any = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    secureCookie: process.env.ENVIRONTMENT === 'production',
  })

  const { pathname } = req.nextUrl

  // Si intenta acceder al login o raíz y ya tiene sesión, redirigir a /admin
  if ((pathname === '/auth/sign-in' || pathname === '/') && session) {
    return NextResponse.redirect(new URL('/admin', req.url))
  }

  // Si intenta acceder a rutas protegidas sin sesión, redirigir al login
  if (pathname.startsWith('/admin') && !session) {
    return NextResponse.redirect(new URL('/auth/sign-in', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/auth/sign-in', '/admin/:path*'],
}
