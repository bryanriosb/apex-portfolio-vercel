'use client'

import { useSession } from 'next-auth/react'
import type { AuthUser } from '@/lib/services/auth/supabase-auth'
import type { UserRole } from '@/const/roles'

export function useCurrentUser() {
  const { data: session, status } = useSession()

  const user: AuthUser | null = session?.user
    ? {
      id: (session.user as any).id,
      username: (session.user as any).usermame,
      email: session.user.email || '',
      name: session.user.name || null,
      role: ((session.user as any).role as UserRole) || 'customer',
      business_id: (session.user as any).business_id,
      business_account_id: (session.user as any).business_account_id,
      businesses: (session.user as any).businesses,
      timezone: (session.user as any).timezone || 'America/Bogota',
    }
    : null

  return {
    user,
    isLoading: status === 'loading',
    isAuthenticated: status === 'authenticated',
    role: user?.role || null,
    businessId: user?.business_id || null,
    businessAccountId: user?.business_account_id || null,
    businesses: user?.businesses || null,
  }
}
