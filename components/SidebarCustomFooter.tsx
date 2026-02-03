'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { LogOut, User, ChevronUp, Loader2 } from 'lucide-react'
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
import { useTutorialStore } from '@/lib/store/tutorial-store'
import { useActiveBusinessStore } from '@/lib/store/active-business-store'

export default function SidebarFooter() {
  const router = useRouter()
  const { state } = useSidebar()
  const isCollapsed = state === 'collapsed'
  const { user, role, specialistId } = useCurrentUser()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const { reset: resetActiveBusinessStore } = useActiveBusinessStore()

  const { isActive: isTutorialActive, getCurrentStep } = useTutorialStore()
  const { isMobile } = useSidebar()

  useEffect(() => {
    if (isTutorialActive) {
      setDropdownOpen(false)
    }
  }, [isTutorialActive])

  const currentStep = getCurrentStep()
  const shouldHideFooter =
    isTutorialActive && isMobile && currentStep?.target?.includes('-menu')

  const isProfessional = role === USER_ROLES.PROFESSIONAL

  const handleOpenProfile = () => {
    router.push('/admin/profile')
  }

  const handleLogout = async (event: React.MouseEvent) => {
    event.preventDefault()
    setIsLoggingOut(true)
    try {
      resetActiveBusinessStore()
      await signOut({ redirect: false })
      router.push('/auth/sign-in')
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
      router.push('/auth/sign-in')
    } finally {
      setIsLoggingOut(false)
    }
  }

  const displayEmail = user?.email || ''

  const handleOpenChange = (open: boolean) => {
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
            <Button variant="ghost" size="icon" className="h-9 w-9">
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
