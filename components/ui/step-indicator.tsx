'use client'

import { CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface WizardStep {
  id: number
  title: string
  description?: string
}

interface StepIndicatorProps {
  currentStep: number
  steps: WizardStep[]
}

export function StepIndicator({ currentStep, steps }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-4">
      {steps.map((step, index) => {
        const isActive = currentStep === step.id
        const isCompleted = currentStep > step.id
        const isLast = index === steps.length - 1

        return (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'w-7 h-7 flex items-center justify-center border-2 transition-colors text-xs',
                  isActive && 'border-primary bg-primary text-primary-foreground',
                  isCompleted && 'border-green-500 bg-green-500 text-white',
                  !isActive && !isCompleted && 'border-gray-300 bg-white text-gray-400'
                )}
              >
                {isCompleted ? (
                  <CheckCircle className="h-3.5 w-3.5" />
                ) : (
                  <span className="font-semibold">{step.id}</span>
                )}
              </div>
              <div className="text-center mt-1.5 hidden sm:block">
                <p
                  className={cn(
                    'text-xs font-medium whitespace-nowrap',
                    isActive && 'text-primary',
                    isCompleted && 'text-green-600',
                    !isActive && !isCompleted && 'text-gray-500'
                  )}
                >
                  {step.title}
                </p>
              </div>
            </div>
            {!isLast && (
              <div
                className={cn(
                  'h-0.5 w-12 mx-3',
                  isCompleted ? 'bg-green-500' : 'bg-gray-300'
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
