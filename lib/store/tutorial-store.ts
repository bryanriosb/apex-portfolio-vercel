import { create } from 'zustand'
import { TutorialStep, TutorialSubStep } from '@/const/tutorials'

export interface TutorialNavigationStep extends TutorialStep {
  page?: string // La página donde debe aparecer este paso
  navigation?: {
    // Navegación automática al siguiente paso
    to?: string // URL a navegar
    delay?: number // Delay antes de navegar (ms)
    condition?: () => boolean // Condición para navegar
  }
}

export interface TutorialNavigation {
  id: string
  name: string
  description: string
  steps: TutorialNavigationStep[]
  runCondition?: () => boolean
  onComplete?: () => void
}

interface TutorialState {
  // Estado actual del tutorial
  isActive: boolean
  tutorialId: string | null
  stepIndex: number
  isPaused: boolean

  // Estado de sub-pasos (modales anidados)
  isInSubSteps: boolean
  subStepIndex: number

  // Configuración
  navigationStepDelay: number

  // Acciones
  startTutorial: (tutorialId: string, startIndex?: number) => void
  stopTutorial: () => void
  pauseTutorial: () => void
  resumeTutorial: () => void
  nextStep: () => void
  previousStep: () => void
  setStepIndex: (index: number) => void

  // Acciones para sub-pasos
  enterSubSteps: () => void
  exitSubSteps: () => void
  nextSubStep: () => void
  previousSubStep: () => void
  setSubStepIndex: (index: number) => void

  // Utilidades
  getCurrentStep: () => TutorialNavigationStep | null
  getCurrentSubStep: () => TutorialSubStep | null
  shouldNavigateToPage: (currentPage: string) => boolean
  getPageForStep: (stepIndex: number) => string | null
  getTotalSubSteps: () => number
}

// Store SIN persistencia - el estado del tutorial es efímero
export const useTutorialStore = create<TutorialState>()((set, get) => ({
  isActive: false,
  tutorialId: null,
  stepIndex: 0,
  isPaused: false,
  isInSubSteps: false,
  subStepIndex: 0,
  navigationStepDelay: 800, // 800ms delay por defecto para navegación

  startTutorial: (tutorialId, startIndex = 0) => {
    set({
      isActive: true,
      tutorialId,
      stepIndex: startIndex,
      isPaused: false,
      isInSubSteps: false,
      subStepIndex: 0,
    })
  },

  stopTutorial: () => {
    set({
      isActive: false,
      tutorialId: null,
      stepIndex: 0,
      isPaused: false,
      isInSubSteps: false,
      subStepIndex: 0,
    })
  },

  pauseTutorial: () => {
    set({ isPaused: true })
  },

  resumeTutorial: () => {
    set({ isPaused: false })
  },

  nextStep: () => {
    const currentState = get()
    const newIndex = currentState.stepIndex + 1
    set({ stepIndex: newIndex, isInSubSteps: false, subStepIndex: 0 })
  },

  previousStep: () => {
    const currentState = get()
    const newIndex = Math.max(0, currentState.stepIndex - 1)
    set({ stepIndex: newIndex, isInSubSteps: false, subStepIndex: 0 })
  },

  setStepIndex: (index) => {
    set({ stepIndex: index, isInSubSteps: false, subStepIndex: 0 })
  },

  // Acciones para sub-pasos
  enterSubSteps: () => {
    set({ isInSubSteps: true, subStepIndex: 0 })
  },

  exitSubSteps: () => {
    set({ isInSubSteps: false, subStepIndex: 0 })
  },

  nextSubStep: () => {
    const { subStepIndex, getCurrentStep } = get()
    const currentStep = getCurrentStep()
    const totalSubSteps = currentStep?.subSteps?.steps.length || 0

    if (subStepIndex + 1 >= totalSubSteps) {
      // Si completamos todos los sub-pasos, salir y avanzar al siguiente paso principal
      set({ isInSubSteps: false, subStepIndex: 0 })
    } else {
      set({ subStepIndex: subStepIndex + 1 })
    }
  },

  previousSubStep: () => {
    const { subStepIndex } = get()
    if (subStepIndex <= 0) {
      // Si estamos en el primer sub-paso, salir de los sub-pasos
      set({ isInSubSteps: false, subStepIndex: 0 })
    } else {
      set({ subStepIndex: subStepIndex - 1 })
    }
  },

  setSubStepIndex: (index) => {
    set({ subStepIndex: index })
  },

  getCurrentStep: () => {
    const { tutorialId, stepIndex } = get()
    if (!tutorialId) return null

    // Importamos dinámicamente para evitar ciclos
    const { TUTORIALS } = require('@/const/tutorials')
    const tutorial = TUTORIALS[tutorialId] as TutorialNavigation

    if (!tutorial || !tutorial.steps || stepIndex >= tutorial.steps.length) {
      return null
    }

    return tutorial.steps[stepIndex] || null
  },

  getCurrentSubStep: () => {
    const { isInSubSteps, subStepIndex, getCurrentStep } = get()
    if (!isInSubSteps) return null

    const currentStep = getCurrentStep()
    if (!currentStep?.subSteps?.steps) return null

    return currentStep.subSteps.steps[subStepIndex] || null
  },

  getTotalSubSteps: () => {
    const currentStep = get().getCurrentStep()
    return currentStep?.subSteps?.steps.length || 0
  },

  shouldNavigateToPage: (currentPage: string) => {
    const currentStep = get().getCurrentStep()
    if (!currentStep?.page) return false

    return currentStep.page !== currentPage
  },

  getPageForStep: (stepIndex: number) => {
    const { tutorialId } = get()
    if (!tutorialId) return null

    const { TUTORIALS } = require('@/const/tutorials')
    const tutorial = TUTORIALS[tutorialId] as TutorialNavigation

    if (!tutorial || !tutorial.steps || stepIndex >= tutorial.steps.length) {
      return null
    }

    return tutorial.steps[stepIndex]?.page ?? null
  },
}))

// Hook simplificado para tutoriales - la navegación se maneja en el TutorialProvider
export function useTutorialNavigation() {
  return useTutorialStore()
}
