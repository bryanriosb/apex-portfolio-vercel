'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useActiveBusinessStore } from '@/lib/store/active-business-store'
import {
  checkSubscriptionAccessAction,
  getSubscriptionStatusAction,
} from '@/lib/actions/subscription'
import type {
  SubscriptionAccess,
  SubscriptionStatusInfo,
} from '@/lib/models/subscription/subscription'

const GRACE_PERIOD_DAYS = 2

export function useSubscriptionAccess() {
  const { activeBusiness } = useActiveBusinessStore()
  const [access, setAccess] = useState<SubscriptionAccess | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const checkAccess = useCallback(async () => {
    if (!activeBusiness?.business_account_id) {
      setAccess(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)

    try {
      const result = await checkSubscriptionAccessAction(
        activeBusiness.business_account_id
      )
      console.log('Subscription access check result:', result)
      setAccess(result)
    } catch (error) {
      console.error('Error checking subscription access:', error)
      setAccess(null)
    } finally {
      setIsLoading(false)
    }
  }, [activeBusiness?.business_account_id])

  const recheckAccess = useCallback(() => {
    console.log('Forcing subscription recheck...')
    checkAccess()
  }, [checkAccess])

  useEffect(() => {
    // Solo hacer la consulta fresh al cargar la página
    checkAccess()
  }, [checkAccess])

  return {
    access,
    isLoading,
    recheckAccess, // Usar la función optimizada
    hasAccess: access?.hasAccess ?? false,
    isInGracePeriod: access?.isInGracePeriod ?? false,
    daysUntilExpiry: access?.daysUntilExpiry ?? null,
    subscriptionStatus: access?.subscriptionStatus ?? 'not_found',
  }
}

export function useSubscriptionStatus() {
  const { activeBusiness } = useActiveBusinessStore()
  const [status, setStatus] = useState<SubscriptionStatusInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchStatus = useCallback(async () => {
    if (!activeBusiness?.business_account_id) {
      setStatus(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const result = await getSubscriptionStatusAction(
        activeBusiness.business_account_id
      )
      setStatus(result)
    } catch (error) {
      console.error('Error fetching subscription status:', error)
      setStatus(null)
    } finally {
      setIsLoading(false)
    }
  }, [activeBusiness?.business_account_id])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  const isExpired = useCallback(() => {
    if (!status?.expiresAt) return false
    const expiresAt = new Date(status.expiresAt)
    const graceEnd = new Date(expiresAt)
    graceEnd.setDate(graceEnd.getDate() + GRACE_PERIOD_DAYS)
    return new Date() > graceEnd
  }, [status?.expiresAt])

  const isAboutToExpire = useCallback((daysThreshold = 7) => {
    if (!status?.daysRemaining) return false
    return status.daysRemaining <= daysThreshold && status.daysRemaining > 0
  }, [status?.daysRemaining])

  return {
    status,
    isLoading,
    refetch: fetchStatus,
    isExpired: isExpired(),
    isAboutToExpire: isAboutToExpire(),
    isInGracePeriod: status?.isInGracePeriod ?? false,
    daysRemaining: status?.daysRemaining ?? null,
    paymentStatus: status?.status ?? 'none',
    billingCycle: status?.billingCycle ?? null,
  }
}

export function useSubscriptionGate() {
  const { hasAccess, isLoading, isInGracePeriod, daysUntilExpiry, subscriptionStatus, recheckAccess } =
    useSubscriptionAccess()

  const shouldBlockAccess = !isLoading && !hasAccess
  const shouldShowWarning = !isLoading && isInGracePeriod

  const getBlockReason = useCallback(() => {
    switch (subscriptionStatus) {
      case 'expired':
        return 'Tu suscripción ha expirado. Por favor, renueva tu plan para continuar.'
      case 'trial_expired':
        return 'Tu período de prueba ha terminado. Suscríbete a un plan para continuar.'
      case 'no_subscription':
        return 'No tienes una suscripción activa. Por favor, selecciona un plan.'
      case 'not_found':
        return 'No se encontró información de la cuenta.'
      default:
        return 'Acceso restringido. Por favor, verifica tu suscripción.'
    }
  }, [subscriptionStatus])

  const getWarningMessage = useCallback(() => {
    if (!isInGracePeriod) return null
    return `Tu suscripción ha vencido. Tienes ${daysUntilExpiry} día(s) de gracia para renovar antes de perder el acceso.`
  }, [isInGracePeriod, daysUntilExpiry])

  return {
    isLoading,
    hasAccess,
    shouldBlockAccess,
    shouldShowWarning,
    blockReason: getBlockReason(),
    warningMessage: getWarningMessage(),
    subscriptionStatus,
    daysUntilExpiry,
    recheckAccess, // Método para forzar recarga del estado de suscripción
  }
}
