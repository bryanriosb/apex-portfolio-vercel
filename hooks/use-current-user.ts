'use client'

import { useSession } from 'next-auth/react'
import type { AuthUser } from '@/lib/services/auth/supabase-auth'
import type { UserRole } from '@/const/roles'

export function useCurrentUser() {
  const { data: session, status } = useSession()

  const user: AuthUser | null = session?.user
    ? {
        id: (session.user as any).id,
        email: session.user.email || '',
        name: session.user.name || null,
        role: ((session.user as any).role as UserRole) || 'customer',
        business_id: (session.user as any).business_id,
        business_account_id: (session.user as any).business_account_id,
        user_profile_id: (session.user as any).user_profile_id,
        specialist_id: (session.user as any).specialist_id,
        businesses: (session.user as any).businesses,
      }
    : null

  return {
    user,
    isLoading: status === 'loading',
    isAuthenticated: status === 'authenticated',
    role: user?.role || null,
    businessId: user?.business_id || null,
    businessAccountId: user?.business_account_id || null,
    userProfileId: user?.user_profile_id || null,
    specialistId: user?.specialist_id || null,
    businesses: user?.businesses || null,
  }
}
