import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { AUTH_OPTIONS } from '@/const/auth'
import { isAdminRouteAllowed, roleHomePath } from '@/const/route-access'

/**
 * Landing de /admin resuelto 100% en servidor.
 *
 * En condiciones normales el middleware ya redirige /admin al dashboard del
 * rol en el edge, así que esta página actúa solo como fallback (por ejemplo,
 * si el matcher del middleware cambia). Al ser un Server Component con
 * `redirect()`, se elimina el ciclo anterior de: render cliente → fetch de
 * /api/auth/session → useEffect → segundo redirect, que era lo que hacía
 * lento el acceso tras el login.
 */
export default async function AdminPage() {
  const session = await getServerSession(AUTH_OPTIONS)
  const role = (session?.user as { role?: string } | undefined)?.role

  if (!role) {
    redirect('/auth/sign-in')
  }

  const home = roleHomePath(role)
  redirect(isAdminRouteAllowed(home, role) ? home : '/')
}
