'use client'

import { ReactNode } from 'react'
import { useSubscriptionGate } from '@/hooks/use-subscription-status'
import { useCurrentUser } from '@/hooks/use-current-user'
import { USER_ROLES } from '@/const/roles'
import { SubscriptionBlockedScreen } from './SubscriptionBlockedScreen'
import { SubscriptionWarningBanner } from './SubscriptionWarningBanner'
import { Skeleton } from '@/components/ui/skeleton'

interface SubscriptionGateProps {
  children: ReactNode
  showWarningBanner?: boolean
  loadingFallback?: ReactNode
}

export function SubscriptionGate({
  children,
  showWarningBanner = true,
  loadingFallback,
}: SubscriptionGateProps) {
  const { role } = useCurrentUser()
  const {
    isLoading,
    hasAccess,
    shouldBlockAccess,
    shouldShowWarning,
    blockReason,
    warningMessage,
  } = useSubscriptionGate()

  if (role === USER_ROLES.COMPANY_ADMIN) {
    return <>{children}</>
  }

  if (isLoading) {
    return loadingFallback || <SubscriptionGateLoading />
  }

  if (shouldBlockAccess) {
    return <SubscriptionBlockedScreen reason={blockReason} />
  }

  return (
    <>
      {showWarningBanner && shouldShowWarning && warningMessage && (
        <SubscriptionWarningBanner message={warningMessage} />
      )}
      {children}
    </>
  )
}

function SubscriptionGateLoading() {
  return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-full max-w-md" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
}
