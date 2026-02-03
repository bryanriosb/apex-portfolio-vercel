'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Clock,
  BookOpen,
  CheckCircle,
  ArrowRight,
  Sparkles,
} from 'lucide-react'
import { getClientCookie, setClientCookie } from '@/lib/utils/cookies'
import { updateTutorialStartedAction } from '@/lib/actions/business-account'
import { useCurrentUser } from '@/hooks/use-current-user'
import { useBusinessAccount } from '@/hooks/use-business-account'

interface WelcomeModalProps {
  isOpen: boolean
  onClose: () => void
  onStartTutorial: () => void
}

const WELCOME_MODAL_COOKIE = 'welcome_modal_shown'

export function WelcomeModal({
  isOpen,
  onClose,
  onStartTutorial,
}: WelcomeModalProps) {
  const { businessAccountId } = useCurrentUser()
  const [dontShowAgain, setDontShowAgain] = useState(false)

  useEffect(() => {
    // Marcar que ya se mostró
    if (isOpen) {
      setClientCookie(WELCOME_MODAL_COOKIE, 'true', {
        maxAge: 365 * 24 * 60 * 60, // 1 year
      })
    }
  }, [isOpen])

  const handleStartTutorial = async () => {
    // Marcar tutorial como iniciado en la DB
    if (businessAccountId) {
      const result = await updateTutorialStartedAction(businessAccountId, true)
      if (!result.success) {
        console.error('Error al marcar tutorial como iniciado:', result.error)
        return
      }
    }

    if (dontShowAgain) {
      setClientCookie(WELCOME_MODAL_COOKIE, 'true', {
        maxAge: 365 * 24 * 60 * 60, // 1 year
      })
    }
    onStartTutorial()
    onClose()
  }

  const handleSkipTutorial = async () => {
    // Marcar tutorial como iniciado (aunque se saltó) en la DB
    if (businessAccountId) {
      const result = await updateTutorialStartedAction(businessAccountId, true)
      if (!result.success) {
        console.error('Error al marcar tutorial como iniciado:', result.error)
        return
      }
    }

    // Guardar cookie para no volver a mostrar (independientemente del checkbox)
    setClientCookie(WELCOME_MODAL_COOKIE, 'true', {
      maxAge: 365 * 24 * 60 * 60, // 1 year
    })

    // Guardar en sessionStorage para prevenir reaparición en la misma sesión
    sessionStorage.setItem('not_show_welcome', 'true')

    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="min-w-[360px] sm:max-w-2xl max-h-screen sm:max-h-[85vh] overflow-hidden border-0 shadow-2xl "
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Header con gradiente usando colores de la marca */}
        <div className="flex items-center justify-center bg-gradient-to-br from-[var(--primary)] via-[var(--secondary)] to-[var(--accent)] p-4 text-white h-32">
          <div className="flex items-center gap-2 sm:gap-3 mb-2">
            <div className="p-2 sm:p-3 bg-white/20 rounded-full backdrop-blur-sm">
              <Sparkles className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-sm sm:text-2xl font-bold text-white mb-1 truncate">
                ¡Bienvenido a tu Gestor de Belleza!
              </DialogTitle>
              <p className="text-white/90 text-sm sm:text-base">
                Estamos emocionados de acompañarte en este nuevo viaje
              </p>
            </div>
          </div>
        </div>

        {/* Contenido principal con scroll */}
        <div className="p-4 space-y-4 sm:space-y-6 overflow-y-auto h-full">
          <div className="text-center space-y-2">
            <h3 className="text-lg sm:text-xl font-semibold text-[var(--foreground)]">
              ¿Listo para configurar tu negocio?
            </h3>
            <p className="text-sm sm:text-base text-[var(--muted-foreground)]">
              Te guiaremos paso a paso en la configuración inicial y la creación
              de una cita. Tan solo debes dar al botón de{' '}
              <span className="text-secondary font-bold">Siguiente</span> y
              diligenciar los datos que se te soliciten.
            </p>
          </div>

          {/* Sección de beneficios del tutorial */}
          <div className="bg-gradient-to-r from-[var(--muted)]/50 to-[var(--secondary)]/10 rounded-xl p-4 sm:p-6 border border-[var(--border)]">
            <div className="flex items-center gap-2 mb-3 sm:mb-4">
              <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-[var(--secondary)]" />
              <h4 className="text-sm sm:text-base font-semibold text-[var(--foreground)]">
                ¿Qué aprenderás en el tutorial?
              </h4>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="flex items-start gap-2 sm:gap-3">
                <div className="p-1 sm:p-1.5 rounded-full bg-[var(--primary)]/20 mt-0.5 flex-shrink-0">
                  <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-[var(--primary)]" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-[var(--foreground)] text-xs sm:text-sm">
                    Crear tus primeros servicios
                  </p>
                  <p className="text-[var(--muted-foreground)] text-xs">
                    Configura tu catálogo de tratamientos
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2 sm:gap-3">
                <div className="p-1 sm:p-1.5 rounded-full bg-[var(--primary)]/20 mt-0.5 flex-shrink-0">
                  <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-[var(--primary)]" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-[var(--foreground)] text-xs sm:text-sm">
                    Registrar a tus especialistas
                  </p>
                  <p className="text-[var(--muted-foreground)] text-xs">
                    Añade los profesionales de tu equipo
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2 sm:gap-3">
                <div className="p-1 sm:p-1.5 rounded-full bg-[var(--primary)]/20 mt-0.5 flex-shrink-0">
                  <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-[var(--primary)]" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-[var(--foreground)] text-xs sm:text-sm">
                    Gestionar tu primer cita
                  </p>
                  <p className="text-[var(--muted-foreground)] text-xs">
                    Programa atendimientos para clientes
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2 sm:gap-3">
                <div className="p-1 sm:p-1.5 rounded-full bg-[var(--primary)]/20 mt-0.5 flex-shrink-0">
                  <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-[var(--primary)]" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-[var(--foreground)] text-xs sm:text-sm">
                    Solo 5 minutos
                  </p>
                  <p className="text-[var(--muted-foreground)] text-xs">
                    Configuración rápida y sencilla
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Checkbox para no volver a mostrar */}
          <div className="flex items-center gap-2 p-2 sm:p-3 bg-[var(--muted)]/30 rounded-lg">
            <input
              type="checkbox"
              id="dont-show"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)] w-4 h-4 sm:w-auto sm:h-auto"
            />
            <label
              htmlFor="dont-show"
              className="text-xs sm:text-sm text-[var(--muted-foreground)] leading-tight"
            >
              No volver a mostrar este mensaje
            </label>
          </div>

          {/* Botones de acción */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2 sm:pt-4">
            <Button
              variant="outline"
              onClick={handleSkipTutorial}
              className="w-full sm:flex-1 border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] text-sm sm:text-base"
            >
              Saltar tutorial
            </Button>
            <Button
              onClick={handleStartTutorial}
              className="w-full sm:flex-1 bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] hover:from-[var(--primary)]/90 hover:to-[var(--secondary)]/90 text-white border-0 font-medium text-sm sm:text-base"
            >
              Comenzar tutorial
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Hook para controlar si mostrar el modal
export function useWelcomeModal() {
  const [shouldShow, setShouldShow] = useState(false)

  const checkShouldShow = () => {
    const wasShown = getClientCookie(WELCOME_MODAL_COOKIE) === 'true'
    return !wasShown
  }

  const showModal = () => setShouldShow(true)
  const hideModal = () => setShouldShow(false)

  return {
    shouldShow,
    checkShouldShow,
    showModal,
    hideModal,
  }
}
