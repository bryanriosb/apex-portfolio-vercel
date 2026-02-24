'use client'

import { useEffect, useState } from 'react'
import { useActiveBusinessStore } from '@/lib/store/active-business-store'
import { useBusinessAccount } from './use-business-account'

export function useActiveBusinessAccount() {
  const { activeBusiness } = useActiveBusinessStore()
  const { 
    account, 
    isLoading: businessAccountLoading,
    error 
  } = useBusinessAccount()
  
  const [isLoading, setIsLoading] = useState(true)
  const [isMatch, setIsMatch] = useState(false)

  useEffect(() => {
    // Verificar si el business_account del store coincide con el del business account
    const businessAccountIdMatch = activeBusiness?.business_account_id === account?.id
    
    setIsMatch(businessAccountIdMatch || false)
    
    // Solo considerar cargado cuando ambos estén listos
    const isReady = !businessAccountLoading && activeBusiness !== undefined
    setIsLoading(!isReady)
  }, [activeBusiness, account, businessAccountLoading, error])

  return {
    activeBusiness,
    businessAccount: account,
    isLoading,
    isMatch,
    error,
  }
}