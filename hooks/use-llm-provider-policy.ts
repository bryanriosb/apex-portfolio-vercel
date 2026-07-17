'use client'

import { useState, useEffect } from 'react'
import { useActiveBusinessStore } from '@/lib/store/active-business-store'
import { getLlmProviderPolicyAction } from '@/lib/actions/agents/llm-provider-policy-actions'

/**
 * Lee la política de proveedores LLM de la cuenta activa.
 * `blockApexProviders === true` → los selectores solo deben ofrecer los
 * proveedores globales configurados por la cuenta.
 */
export function useLlmProviderPolicy() {
  const businessAccountId = useActiveBusinessStore(
    (s) => s.activeBusiness?.business_account_id
  )
  const [blockApexProviders, setBlockApexProviders] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    if (!businessAccountId) {
      setBlockApexProviders(false)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    getLlmProviderPolicyAction(businessAccountId)
      .then((res) => {
        if (!cancelled) setBlockApexProviders(res.blockApexProviders)
      })
      .catch(() => {
        if (!cancelled) setBlockApexProviders(false)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [businessAccountId])

  return { blockApexProviders, isLoading }
}
