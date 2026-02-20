'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useCurrentUser } from './use-current-user'
import {
  checkAndUpdateExpiredTrialAction,
  getTrialInfoAction,
} from '@/lib/actions/system-settings'

interface TrialStatus {
  isOnTrial: boolean
  trialEndsAt: string | null
  daysRemaining: number | null
  wasJustExpired: boolean
  newPlanCode: string | null
}

export function useTrialCheck() {
  const { businessAccountId, isAuthenticated, isLoading } = useCurrentUser()
  const [trialStatus, setTrialStatus] = useState<TrialStatus>({
    isOnTrial: false,
    trialEndsAt: null,
    daysRemaining: null,
    wasJustExpired: false,
    newPlanCode: null,
  })
  const [isChecking, setIsChecking] = useState(false)
  const hasChecked = useRef(false)

  const checkTrial = useCallback(async () => {
    if (!businessAccountId || hasChecked.current) return

    setIsChecking(true)
    hasChecked.current = true

    try {
      const expiredResult = await checkAndUpdateExpiredTrialAction(businessAccountId)

      if (expiredResult.wasExpired) {
        setTrialStatus({
          isOnTrial: false,
          trialEndsAt: null,
          daysRemaining: null,
          wasJustExpired: true,
          newPlanCode: expiredResult.newPlanCode,
        })
        return
      }

      const trialInfo = await getTrialInfoAction(businessAccountId)
      setTrialStatus({
        isOnTrial: trialInfo.isOnTrial,
        trialEndsAt: trialInfo.trialEndsAt,
        daysRemaining: trialInfo.daysRemaining,
        wasJustExpired: false,
        newPlanCode: null,
      })
    } catch (error) {
      console.error('Error checking trial:', error)
    } finally {
      setIsChecking(false)
    }
  }, [businessAccountId])

  useEffect(() => {
    if (isAuthenticated && !isLoading && businessAccountId) {
      checkTrial()
    }
  }, [isAuthenticated, isLoading, businessAccountId, checkTrial])

  const resetExpiredFlag = useCallback(() => {
    setTrialStatus((prev) => ({ ...prev, wasJustExpired: false }))
  }, [])

  return {
    ...trialStatus,
    isChecking,
    resetExpiredFlag,
    recheckTrial: () => {
      hasChecked.current = false
      checkTrial()
    },
  }
}
