'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { getTrialInfoAction } from '@/lib/actions/system-settings'
import { getBusinessAccountByIdAction } from '@/lib/actions/business-account'

interface TrialContextType {
  isOnTrial: boolean
  daysRemaining: number | null
  trialEndsAt: string | null
  tutorialStarted: boolean
  isLoading: boolean
}

const TrialContext = createContext<TrialContextType | undefined>(undefined)

interface TrialProviderProps {
  businessAccountId: string | null
  initialData?: {
    isOnTrial?: boolean
    daysRemaining?: number | null
    trialEndsAt?: string | null
    tutorialStarted?: boolean
  }
  children: ReactNode
}

export function TrialProviderClient({ businessAccountId, initialData, children }: TrialProviderProps) {
  const [trialData, setTrialData] = useState<TrialContextType>({
    isOnTrial: initialData?.isOnTrial || false,
    daysRemaining: initialData?.daysRemaining || null,
    trialEndsAt: initialData?.trialEndsAt || null,
    tutorialStarted: initialData?.tutorialStarted || false,
    isLoading: !!initialData, // Loading if we have initial data
  })

  useEffect(() => {
    if (!businessAccountId) return

    const loadTrialData = async () => {
      try {
        // Load trial info
        const trialInfo = await getTrialInfoAction(businessAccountId)
        
        // Load business account for tutorial info
        const businessAccountResult = await getBusinessAccountByIdAction(businessAccountId)

        const newData = {
          isOnTrial: trialInfo.isOnTrial,
          daysRemaining: trialInfo.daysRemaining,
          trialEndsAt: trialInfo.trialEndsAt,
          tutorialStarted: businessAccountResult.data?.tutorial_started || false,
          isLoading: false,
        }

        setTrialData(newData)
      } catch (error) {
        console.error('Error loading trial data:', error)
        setTrialData((prev: TrialContextType) => ({ ...prev, isLoading: false }))
      }
    }

    // If we have initial data, still refresh in background to ensure consistency
    if (initialData) {
      loadTrialData() // Background refresh
    } else {
      setTrialData((prev: TrialContextType) => ({ ...prev, isLoading: true }))
      loadTrialData()
    }
  }, [businessAccountId])

  return (
    <TrialContext.Provider value={trialData}>
      {children}
    </TrialContext.Provider>
  )
}

export function useTrialContext() {
  const context = useContext(TrialContext)
  if (context === undefined) {
    throw new Error('useTrialContext must be used within a TrialProviderClient')
  }
  return context
}