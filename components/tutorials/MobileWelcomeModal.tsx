'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Clock,
  Settings,
  Scissors,
  UserCheck,
  Calendar,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  ChevronRight,
} from 'lucide-react'
import { getClientCookie, setClientCookie } from '@/lib/utils/cookies'
import { updateTutorialStartedAction } from '@/lib/actions/business-account'
import { useCurrentUser } from '@/hooks/use-current-user'
import { useRouter } from 'next/navigation'

interface MobileWelcomeModalProps {
  isOpen: boolean
  onClose: () => void
}

interface Step {
  id: number
  title: string
  description: string
  icon: React.ReactNode
  action?: {
    label: string
    path?: string
  }
}

const WELCOME_MODAL_COOKIE = 'welcome_modal_shown' // Usar la misma cookie que el WelcomeModal original

export function MobileWelcomeModal({
  isOpen,
  onClose,
}: MobileWelcomeModalProps) {
  const { businessAccountId } = useCurrentUser()
  const router = useRouter()
  const [dontShowAgain, setDontShowAgain] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)

  const steps: Step[] = [
    {
      id: 1,
      title: 'Ajusta tu horario',
      description:
        'Ve a Configuración y establece tus días y horas de atención. Esto es fundamental para que tus clientes puedan reservar citas.',
      icon: <Settings className="h-6 w-6" />,
      action: {
        label: 'Ir a Configuración → Horarios',
        path: '/admin/settings/hours',
      },
    },
    {
      id: 2,
      title: 'Crea tus servicios',
      description:
        'Agrega los tratamientos que ofreces con sus precios, duración y descripción. Estos serán tu catálogo principal.',
      icon: <Scissors className="h-6 w-6" />,
      action: {
        label: 'Ir a Servicios',
        path: '/admin/services',
      },
    },
    {
      id: 3,
      title: 'Registra especialistas',
      description:
        'Añade los profesionales que trabajarán contigo. Asigna las categorías de servicios que cada uno puede realizar.',
      icon: <UserCheck className="h-6 w-6" />,
      action: {
        label: 'Ir a Especialistas → Equipo',
        path: '/admin/specialists',
      },
    },
    {
      id: 4,
      title: 'Crea tu primera cita',
      description:
        'Programa una cita y añade un nuevo cliente. Configura el servicio, especialista, fecha y hora para completar el proceso.',
      icon: <Calendar className="h-6 w-6" />,
      action: {
        label: 'Ir a Citas',
        path: '/admin/appointments',
      },
    },
  ]

  useEffect(() => {
    // Marcar que ya se mostró
    if (isOpen) {
      setClientCookie(WELCOME_MODAL_COOKIE, 'true', {
        maxAge: 365 * 24 * 60 * 60, // 1 year
      })
    }
  }, [isOpen])

  const handleCompleteSetup = async () => {
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

    // Guardar en sessionStorage para prevenir reaparición en la misma sesión
    sessionStorage.setItem('not_show_welcome', 'true')
    onClose()
  }

  const handleSkipSetup = async () => {
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

  const handleStepAction = (step: Step) => {
    if (step.action?.path) {
      router.push(step.action.path)
      onClose()
    }
  }

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const currentStepData = steps[currentStep]

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="min-w-[320px] max-w-md max-h-full overflow-hidden border-0 shadow-2xl"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Header con gradiente */}
        <div className="flex items-center justify-center bg-gradient-to-br from-[var(--primary)] via-[var(--secondary)] to-[var(--accent)] p-4 text-white">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-white/20 rounded-full backdrop-blur-sm">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-lg font-bold text-white mb-1 truncate">
                Configura tu Negocio
              </DialogTitle>
              <p className="text-white/90 text-sm">
                Sigue estos pasos para empezar
              </p>
            </div>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-1 px-4 pt-4">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`h-1 flex-1 rounded-full transition-colors ${
                index === currentStep
                  ? 'bg-primary'
                  : index < currentStep
                  ? 'bg-primary/30'
                  : 'bg-muted'
              }`}
            />
          ))}
        </div>

        {/* Contenido principal */}
        <div className="p-4 space-y-4 overflow-y-auto">
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold text-[var(--foreground)]">
              Paso {currentStep + 1} de {steps.length}
            </h3>
            <p className="text-sm text-[var(--muted-foreground)]">
              {currentStepData.title}
            </p>
          </div>

          {/* Card del paso actual */}
          <div className="bg-gradient-to-r from-[var(--muted)]/50 to-[var(--secondary)]/10 rounded-xl p-4 border border-[var(--border)]">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-full bg-[var(--primary)]/20 flex-shrink-0">
                {currentStepData.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-[var(--foreground)]">
                  {currentStepData.title}
                </h4>
              </div>
              <Badge variant="secondary" className="text-xs">
                {currentStep + 1}
              </Badge>
            </div>

            <p className="text-sm text-[var(--muted-foreground)] leading-relaxed mb-4">
              {currentStepData.description}
            </p>

            {currentStepData.action && (
              <Button
                variant="outline"
                size="sm"
                // onClick={() => handleStepAction(currentStepData)}
                className="w-full justify-between text-sm"
              >
                {currentStepData.action.label}
                {/* <ChevronRight className="h-4 w-4" /> */}
              </Button>
            )}
          </div>

          {/* Progress indicators */}
          <div className="flex items-center justify-center gap-2 py-2">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentStep
                    ? 'w-6 bg-primary'
                    : index < currentStep
                    ? 'bg-primary/50'
                    : 'bg-muted'
                }`}
              />
            ))}
          </div>

          {/* Checkbox para no volver a mostrar */}
          <div className="flex items-center gap-2 p-3 bg-[var(--muted)]/30 rounded-lg">
            <input
              type="checkbox"
              id="dont-show-mobile"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)] w-4 h-4"
            />
            <label
              htmlFor="dont-show-mobile"
              className="text-xs text-[var(--muted-foreground)] leading-tight"
            >
              No volver a mostrar este mensaje
            </label>
          </div>

          {/* Botones de navegación */}
          <div className="flex gap-2 pt-2">
            {currentStep > 0 && (
              <Button
                variant="outline"
                onClick={prevStep}
                className="flex-1"
                size="sm"
              >
                Anterior
              </Button>
            )}

            {currentStep < steps.length - 1 ? (
              <Button
                onClick={nextStep}
                className="flex-1 bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] hover:from-[var(--primary)]/90 hover:to-[var(--secondary)]/90 text-white border-0"
                size="sm"
              >
                Siguiente
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleCompleteSetup}
                className="flex-1 bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] hover:from-[var(--primary)]/90 hover:to-[var(--secondary)]/90 text-white border-0"
                size="sm"
              >
                ¡Completado!
                <CheckCircle2 className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Botón para saltar */}
          <div className="pt-2 border-t border-[var(--border)]">
            <Button
              variant="ghost"
              onClick={handleSkipSetup}
              className="w-full text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              size="sm"
            >
              Saltar configuración
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
