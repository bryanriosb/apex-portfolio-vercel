'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { LogOut, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSidebar } from './ui/sidebar'
import { useCurrentUser } from '@/hooks/use-current-user'
import { USER_ROLES } from '@/const/roles'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { useActiveBusinessStore } from '@/lib/store/active-business-store'
import { cleanupSession } from '@/lib/utils/session-cleanup'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import Loading from './ui/loading'

export default function SidebarFooter() {
  const router = useRouter()
  const { state } = useSidebar()
  const isCollapsed = state === 'collapsed'
  const { user, role } = useCurrentUser()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const { reset: resetActiveBusinessStore } = useActiveBusinessStore()

  const isProfessional = role === USER_ROLES.PROFESSIONAL

  const handleOpenProfile = () => {
    router.push('/admin/profile')
  }

  const handleLogout = async (event: React.MouseEvent) => {
    event.preventDefault()
    setIsLoggingOut(true)
    
    try {
      console.log('[Logout] Iniciando proceso de cierre de sesión...')
      
      // 1. Cerrar sesión en Supabase Auth primero
      const supabase = getSupabaseBrowserClient()
      await supabase.auth.signOut()
      console.log('[Logout] Sesión de Supabase cerrada')
      
      // 2. Resetear stores en memoria
      resetActiveBusinessStore()
      console.log('[Logout] Stores reseteados')
      
      // 3. Limpiar TODO del navegador (localStorage, cookies, etc.)
      cleanupSession()
      
      // 4. Cerrar sesión en NextAuth
      await signOut({ redirect: false })
      console.log('[Logout] Sesión de NextAuth cerrada')
      
      // 5. Redirigir
      router.push('/auth/sign-in')
      
      // 6. Forzar recarga para limpiar completamente cualquier estado residual
      window.location.href = '/auth/sign-in'
    } catch (error) {
      console.error('[Logout] Error al cerrar sesión:', error)
      // Aún así intentar limpiar y redirigir
      cleanupSession()
      window.location.href = '/auth/sign-in'
    } finally {
      setIsLoggingOut(false)
    }
  }

  const displayEmail = user?.email || ''

  const handleOpenChange = (open: boolean) => {
    setDropdownOpen(open)
  }

  if (isCollapsed) {
    return (
      <footer
        className="flex items-center justify-center p-2"
        data-darkreader-ignore
      >
        <DropdownMenu open={dropdownOpen} onOpenChange={handleOpenChange}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 flex items-center gap-2 truncate text-foreground-50">
              <User className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="end" className="w-56">
            {isProfessional && (
              <DropdownMenuItem onClick={handleOpenProfile}>
                <User className="mr-2 h-4 w-4" />
                Perfil
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={handleLogout} disabled={isLoggingOut}>
              {isLoggingOut ? (
                <Loading />
              ) : (
                <LogOut className="mr-2 h-4 w-4" />
              )}
              {isLoggingOut ? 'Cerrando...' : 'Cerrar Sesión'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </footer>
    )
  }

  return (
    <footer className="p-2 border-t">
      <DropdownMenu open={dropdownOpen} onOpenChange={handleOpenChange}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="w-full justify-start gap-2 h-9 px-2">
            <User className="h-4 w-4" />
            <span className="truncate text-sm">{displayEmail}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start" className="w-56">
          {isProfessional && (
            <>
              <DropdownMenuItem onClick={handleOpenProfile}>
                <User className="mr-2 h-4 w-4" />
                Perfil
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem onClick={handleLogout} disabled={isLoggingOut}>
            {isLoggingOut ? (
              <Loading />
            ) : (
              <LogOut className="mr-2 h-4 w-4" />
            )}
            {isLoggingOut ? 'Cerrando...' : 'Cerrar Sesión'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </footer>
  )
}
