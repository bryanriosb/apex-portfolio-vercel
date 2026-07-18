import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { AUTH_ERROR_SESSION_EXPIRED } from '@/const/auth-errors'
import { isAdminRouteAllowed, roleHomePath } from '@/const/route-access'

const SESSION_COOKIE_NAMES = [
  'next-auth.session-token',
  '__Secure-next-auth.session-token',
]

/**
 * Redirige al login eliminando la cookie de sesión, incluidos los
 * fragmentos (`.0`, `.1`, ...) que NextAuth genera cuando el JWT supera
 * ~4KB. Borrar solo el nombre base dejaría fragmentos huérfanos que
 * corrompen la lectura de la sesión en visitas posteriores.
 */
function signOutRedirect(req: NextRequest) {
  const response = NextResponse.redirect(new URL('/auth/sign-in', req.url))
  for (const cookie of req.cookies.getAll()) {
    const isSessionCookie = SESSION_COOKIE_NAMES.some(
      (name) => cookie.name === name || cookie.name.startsWith(`${name}.`)
    )
    if (isSessionCookie) {
      response.cookies.delete(cookie.name)
    }
  }
  return response
}

/**
 * Destino post-login del rol, validado contra el mapa de acceso para que
 * jamás se redirija a una ruta que el propio middleware denegaría (evita
 * loops de redirección). Rol sin destino admin permitido → landing público.
 */
function resolveRoleHome(role: string | undefined): string {
  const home = roleHomePath(role)
  return isAdminRouteAllowed(home, role) ? home : '/'
}

export async function middleware(req: NextRequest) {
  const session: any = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    // El nombre de la cookie depende del protocolo con el que se sirvió la
    // app (`__Secure-*` en HTTPS), NO del entorno lógico. En Vercel tanto
    // production como staging y previews corren sobre HTTPS, así que se
    // deriva de NEXTAUTH_URL con fallback a la detección de Vercel — el
    // mismo default que usa next-auth internamente al emitir la cookie.
    secureCookie:
      process.env.NEXTAUTH_URL?.startsWith('https://') ??
      Boolean(process.env.VERCEL),
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

  // Con sesión activa, el login y la raíz redirigen directo al dashboard
  // del rol. Resolverlo aquí (edge) ahorra el hop intermedio por /admin y
  // el redirect client-side que hacía lento el acceso tras el login.
  if ((pathname === '/auth/sign-in' || pathname === '/') && session) {
    const target = resolveRoleHome(session.role)
    if (target === pathname) {
      return NextResponse.next()
    }
    return NextResponse.redirect(new URL(target, req.url))
  }

  // Rutas protegidas sin sesión → login
  if (pathname.startsWith('/admin') && !session) {
    return NextResponse.redirect(new URL('/auth/sign-in', req.url))
  }

  // Landing /admin: se resuelve el destino por rol en el edge, sin llegar
  // a renderizar la página ni esperar la sesión en el cliente.
  if (pathname === '/admin' && session) {
    return NextResponse.redirect(new URL(resolveRoleHome(session.role), req.url))
  }

  // Gating por rol (AC-3, fail-closed): toda ruta bajo /admin exige un rol
  // permitido según const/route-access.ts. La denegación envía al home del
  // rol (validado como permitido), por lo que no produce loops.
  if (pathname.startsWith('/admin') && session) {
    if (!isAdminRouteAllowed(pathname, session.role)) {
      return NextResponse.redirect(
        new URL(resolveRoleHome(session.role), req.url)
      )
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/auth/sign-in', '/admin/:path*'],
}
