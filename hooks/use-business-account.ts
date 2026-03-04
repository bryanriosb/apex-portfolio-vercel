'use client'

import { useEffect, useState } from 'react'
import { useCurrentUser } from './use-current-user'
import type { BusinessAccount } from '@/lib/models/business-account/business-account'
import BusinessAccountService from '@/lib/services/business-account/business-account-service'

export function useBusinessAccount() {
  const { user, businessAccountId } = useCurrentUser()
  const [account, setAccount] = useState<BusinessAccount | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastFetchedId, setLastFetchedId] = useState<string | null>(null)
  const [forceRefresh, setForceRefresh] = useState(0)

  useEffect(() => {
    if (!businessAccountId || !user) {
      setAccount(null)
      setIsLoading(false)
      setLastFetchedId(null)
      return
    }

    if (lastFetchedId === businessAccountId && forceRefresh === 0) {
      return
    }

    const fetchAccountData = async () => {
      try {
        setIsLoading(true)
        const service = new BusinessAccountService()

        const accountData = await service.getAccountById(businessAccountId)
        setAccount(accountData)
        setLastFetchedId(businessAccountId)

        setError(null)
      } catch (err: any) {
        console.error('Error fetching business account:', err)
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    fetchAccountData()
  }, [businessAccountId, user?.id, forceRefresh])

  const refetch = () => {
    setLastFetchedId(null)
    setForceRefresh((prev) => prev + 1)
  }

  return {
    account,
    isLoading,
    error,
    refetch,
  }
}
