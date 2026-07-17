import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { AUTH_ERROR_SESSION_EXPIRED } from '@/const/auth-errors'
import { isAdminRouteAllowed } from '@/const/route-access'

/** Redirige al login eliminando la cookie de sesión (variantes http/https). */
function signOutRedirect(req: NextRequest) {
  const response = NextResponse.redirect(new URL('/auth/sign-in', req.url))
  response.cookies.delete('next-auth.session-token')
  response.cookies.delete('__Secure-next-auth.session-token')
  return response
}

// This function can be marked `async` if using `await` inside
export async function middleware(req: NextRequest) {
  const session: any = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    secureCookie: process.env.ENVIRONMENT === 'production',
  })

  const { pathname } = req.nextUrl

  // Sesión irrecuperable (access token vencido sin refresh posible): se
  // limpia la cookie y se fuerza un nuevo login en vez de dejar que las
  // llamadas al API fallen con 401 silenciosos.
  if (session?.authError === AUTH_ERROR_SESSION_EXPIRED) {
    if (pathname === '/auth/sign-in') {
      return NextResponse.next()
    }
    return signOutRedirect(req)
  }

  // Si intenta acceder al login o raíz y ya tiene sesión, redirigir a /admin
  if ((pathname === '/auth/sign-in' || pathname === '/') && session) {
    return NextResponse.redirect(new URL('/admin', req.url))
  }

  // Si intenta acceder a rutas protegidas sin sesión, redirigir al login
  if (pathname.startsWith('/admin') && !session) {
    return NextResponse.redirect(new URL('/auth/sign-in', req.url))
  }

  // Gating por rol (AC-3, fail-closed): toda ruta bajo /admin exige un rol
  // permitido según const/route-access.ts. El landing /admin queda accesible
  // para todos los roles y su página redirige al destino correcto, por lo
  // que denegar aquí no produce loops de redirección.
  if (pathname.startsWith('/admin') && pathname !== '/admin' && session) {
    if (!isAdminRouteAllowed(pathname, session.role)) {
      return NextResponse.redirect(new URL('/admin', req.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/auth/sign-in', '/admin/:path*'],
}
