'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTutorialStore } from '@/lib/store/tutorial-store'
import { useCurrentUser } from './use-current-user'
import { useTrialCheck } from './use-trial-check'
import { useBusinessAccount } from './use-business-account'
import { updateTutorialStartedAction } from '@/lib/actions/business-account'
import { getClientCookie, setClientCookie } from '@/lib/utils/cookies'
import { TUTORIALS, Tutorial } from '@/const/tutorials'



export function useTutorial() {
  const {
    businessAccountId,
    isAuthenticated,
    isLoading: authLoading,
  } = useCurrentUser()
  const { isOnTrial, isChecking: trialLoading } = useTrialCheck()
  const { tutorialStarted, isLoading: businessAccountLoading } =
    useBusinessAccount()

  const {
    isActive,
    tutorialId,
    stepIndex,
    isPaused,
    startTutorial: storeStartTutorial,
    stopTutorial,
    pauseTutorial,
    resumeTutorial,
    nextStep,
    previousStep,
    setStepIndex,
    getCurrentStep,
  } = useTutorialStore()

  const [isLoading, setIsLoading] = useState(true)

  const currentTutorial = tutorialId ? TUTORIALS[tutorialId] : null



  // Start a specific tutorial
  const startTutorial = useCallback(
    (tutorialId: string, startIndex = 0) => {
      const tutorial = TUTORIALS[tutorialId]
      if (!tutorial) {
        console.log('❌ Tutorial not found:', tutorialId)
        return false
      }

      // Check if tutorial should run (condition function)
      if (tutorial.runCondition && !tutorial.runCondition()) {
        console.log('❌ Tutorial condition failed:', tutorialId)
        return false
      }

    console.log('✅ Starting tutorial:', tutorialId, { isOnTrial })

      storeStartTutorial(tutorialId, startIndex)
      return true
    },
    [storeStartTutorial, businessAccountId]
  )

  // Restart tutorial
  const restartTutorial = useCallback(
    (tutorialId: string) => {
      startTutorial(tutorialId, 0)
    },
    [startTutorial]
  )

  // Get available tutorials (not completed)
  const getAvailableTutorials = useCallback((): Tutorial[] => {
    return Object.values(TUTORIALS).filter((tutorial) => {
      // Aplicar condición específica para appointment-start (solo trial)
      if (tutorial.id === 'appointment-start') {
        // Solo mostrar si está en trial y no ha iniciado el tutorial
        if (!isOnTrial || tutorialStarted) return false
      }
    })
  }, [isOnTrial, tutorialStarted])

  // Get all tutorials for dropdown (regardless of completion status)
  const getAllTutorialsForDropdown = useCallback((): Tutorial[] => {
    return Object.values(TUTORIALS).filter((tutorial) => {
      // Para el dropdown, appointment-start siempre debe estar disponible si se cumplen las condiciones básicas
      if (tutorial.id === 'appointment-start') {
        // Mostrar si está en trial (independientemente de tutorial_started)
        if (!isOnTrial) return false
      }

      if (tutorial.runCondition && !tutorial.runCondition()) {
        return false
      }
      // No filtrar por completion status - incluir todos
      return true
    })
  }, [isOnTrial])

  // Get Joyride steps (mantener compatibilidad con componentes existentes)
  const getJoyrideSteps = useCallback(() => {
    if (!currentTutorial) return []

    const steps = currentTutorial.steps.map((step) => {
      // Try direct selector first, then data-tutorial selector
      let targetSelector = step.target
      if (
        step.target &&
        !step.target.startsWith('[') &&
        !step.target.startsWith('#') &&
        !step.target.startsWith('.')
      ) {
        targetSelector = `[data-tutorial="${step.target}"]`
      }

      // Check if element exists, fallback to body
      const element = document.querySelector(targetSelector)
      const finalTarget = element ? targetSelector : 'body'

      return {
        ...step,
        target: finalTarget,
        content: step.content,
        // Disable beacon for modal elements until they are visible
        disableBeacon: step.disableBeacon || !element,
      }
    })

    return steps
  }, [currentTutorial])

  // Auto-start logic for trial users - ahora muestra modal de bienvenida primero
  useEffect(() => {
    if (authLoading || trialLoading || businessAccountLoading) {
      setIsLoading(true)
      return
    }

    setIsLoading(false)

    // Only auto-start for authenticated users with business account
    if (!isAuthenticated || !businessAccountId) {
      return
    }

    // Auto-start tutorial for trial users que no han empezado el tutorial
    if (isOnTrial && !tutorialStarted && !isActive) {
      const appointmentTutorial = TUTORIALS['appointment-start']
    }
  }, [
    authLoading,
    trialLoading,
    businessAccountLoading,
    isAuthenticated,
    businessAccountId,
    isOnTrial,
    tutorialStarted,
    startTutorial,
    isActive,
  ])

  // Función para iniciar tutorial después del modal
  const startTutorialAfterWelcome = useCallback(() => {
    console.log('🎯 startTutorialAfterWelcome called')
    const appointmentTutorial = TUTORIALS['appointment-start']

    if (appointmentTutorial) {
      // Small delay para asegurar transición suave
      setTimeout(() => {
        console.log('🚀 Actually calling startTutorial...')
        const result = startTutorial('appointment-start')
        console.log('🎯 startTutorial result:', result)
      }, 500)
    } else {
      console.log('❌ Tutorial not available:', {
        tutorialExists: !!appointmentTutorial,
        isOnTrial,
        tutorialStarted
      })
    }
  }, [startTutorial, isOnTrial, tutorialStarted])

  return {
    // Estado del tutorial (compatible con código existente)
    runTutorial: isActive && !isPaused,
    tutorialId,
    tutorialIndex: stepIndex,
    currentTutorial,
    isLoading: isLoading || authLoading || trialLoading,

    // Acciones básicas
    startTutorial,
    stopTutorial,
    restartTutorial,
    pauseTutorial,
    resumeTutorial,
    nextStep,
    previousStep,
    setStepIndex,

    // Utilidades
    getAvailableTutorials,
    getAllTutorialsForDropdown,
    getJoyrideSteps,
    getCurrentStep,
    startTutorialAfterWelcome,
  }
}
