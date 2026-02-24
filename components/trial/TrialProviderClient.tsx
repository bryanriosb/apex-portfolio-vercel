'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { getTrialInfoAction } from '@/lib/actions/system-settings'
import { getBusinessAccountByIdAction } from '@/lib/actions/business-account'

interface TrialContextType {
  isOnTrial: boolean
  daysRemaining: number | null
  trialEndsAt: string | null
  isLoading: boolean
}

const TrialContext = createContext<TrialContextType | undefined>(undefined)

interface TrialProviderProps {
  businessAccountId: string | null
  initialData?: {
    isOnTrial?: boolean
    daysRemaining?: number | null
    trialEndsAt?: string | null
  }
  children: ReactNode
}

export function TrialProviderClient({ businessAccountId, initialData, children }: TrialProviderProps) {
  const [trialData, setTrialData] = useState<TrialContextType>({
    isOnTrial: initialData?.isOnTrial || false,
    daysRemaining: initialData?.daysRemaining || null,
    trialEndsAt: initialData?.trialEndsAt || null,
    isLoading: !!initialData,
  })

  useEffect(() => {
    if (!businessAccountId) return

    const loadTrialData = async () => {
      try {
        const trialInfo = await getTrialInfoAction(businessAccountId)

        const newData = {
          isOnTrial: trialInfo.isOnTrial,
          daysRemaining: trialInfo.daysRemaining,
          trialEndsAt: trialInfo.trialEndsAt,
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