'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { Button } from './ui/button'
import { LogOut, User, ChevronUp, Loader2 } from 'lucide-react'
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
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import SpecialistService from '@/lib/services/specialist/specialist-service'
import type { Specialist } from '@/lib/models/specialist/specialist'
import { useTutorialStore } from '@/lib/store/tutorial-store'
import { useActiveBusinessStore } from '@/lib/store/active-business-store'

export default function SidebarFooter() {
  const router = useRouter()
  const { state } = useSidebar()
  const isCollapsed = state === 'collapsed'
  const { user, role, specialistId } = useCurrentUser()
  const [specialist, setSpecialist] = useState<Specialist | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const { reset: resetActiveBusinessStore } = useActiveBusinessStore()

  // Verificar si el tutorial está activo para deshabilitar el dropdown
  const { isActive: isTutorialActive, getCurrentStep } = useTutorialStore()
  const { isMobile } = useSidebar()

  // Cerrar dropdown cuando el tutorial se activa
  useEffect(() => {
    if (isTutorialActive) {
      setDropdownOpen(false)
    }
  }, [isTutorialActive])

  // Determinar si debemos ocultar el footer durante el tutorial en móvil
  // Lo ocultamos cuando el tutorial apunta a elementos del sidebar
  const currentStep = getCurrentStep()
  const shouldHideFooter =
    isTutorialActive && isMobile && currentStep?.target?.includes('-menu')

  const isProfessional = role === USER_ROLES.PROFESSIONAL

  const loadSpecialist = useCallback(async () => {
    if (!specialistId) return
    const service = new SpecialistService()
    try {
      const result = await service.fetchItem(specialistId)
      if (result.success && result.data) {
        setSpecialist(result.data)
      }
    } catch (error) {
      console.error('Error loading specialist:', error)
    }
  }, [specialistId])

  useEffect(() => {
    loadSpecialist()
  }, [loadSpecialist])

  const handleOpenProfile = () => {
    router.push('/admin/profile')
  }

  const handleLogout = async (event: React.MouseEvent) => {
    event.preventDefault()
    setIsLoggingOut(true)
    try {
      // Limpiar el store de negocio activo antes de cerrar sesión
      resetActiveBusinessStore()
      await signOut({ redirect: false })
      router.push('/auth/sign-in')
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
      // Incluso si hay error, redirigir al login
      router.push('/auth/sign-in')
    } finally {
      setIsLoggingOut(false)
    }
  }

  const displayName = specialist
    ? `${specialist.first_name} ${specialist.last_name || ''}`.trim()
    : user?.name || 'Usuario'

  const displayEmail = user?.email || ''

  const avatarUrl = specialist?.profile_picture_url || null

  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  // Handler para controlar apertura del dropdown
  const handleOpenChange = (open: boolean) => {
    // No permitir abrir el dropdown si el tutorial está activo
    if (isTutorialActive && open) {
      return
    }
    setDropdownOpen(open)
  }

  if (isCollapsed) {
    return (
      <footer
        className="flex items-center justify-center p-2"
        data-darkreader-ignore
      >
        <DropdownMenu open={dropdownOpen} onOpenChange={handleOpenChange}>
          <DropdownMenuTrigger asChild disabled={isTutorialActive}>
            <Button variant="ghost" size="icon" title={displayName}>
              <Avatar className="h-8 w-8">
                {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="end" className="w-56">
            <div className="flex items-center gap-2 p-2">
              <Avatar className="h-8 w-8">
                {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0">
                <span className="font-medium text-sm truncate">
                  {displayName}
                </span>
                <span className="text-xs text-muted-foreground truncate">
                  {displayEmail}
                </span>
              </div>
            </div>
            <DropdownMenuSeparator />
            {isProfessional && (
              <DropdownMenuItem onClick={handleOpenProfile}>
                <User className="mr-2 h-4 w-4" />
                Perfil
              </DropdownMenuItem>
            )}
            <DropdownMenuItem 
              onClick={handleLogout}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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
        <DropdownMenuTrigger asChild disabled={isTutorialActive}>
          <button
            className="flex items-center justify-between w-full p-2 rounded-md hover:bg-accent transition-colors"
            style={{ pointerEvents: isTutorialActive ? 'none' : 'auto' }}
          >
            <div className="flex gap-2 items-center min-w-0">
              <Avatar className="h-8 w-8 flex-shrink-0">
                {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0 overflow-hidden text-left">
                <span className="font-medium text-sm truncate">
                  {displayName}
                </span>
                <span className="text-xs text-muted-foreground truncate">
                  {displayEmail}
                </span>
              </div>
            </div>
            <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </button>
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
          <DropdownMenuItem 
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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
