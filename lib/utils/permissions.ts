import type { UserRole } from '@/const/roles'

export function canManageBusinessAccount(
  userRole: UserRole,
): boolean {
  if (userRole === 'company_admin') return true
  return false
}

export function canCreateBusinessInAccount(
  userRole: UserRole,
): boolean {
  if (userRole === 'company_admin') return true
  return false
}

export function canInviteMembers(
  userRole: UserRole,
): boolean {
  if (userRole === 'company_admin') return true
  return false
}


export function canViewBusinessAccount(
  userRole: UserRole,
  isMember: boolean
): boolean {
  if (userRole === 'company_admin') return true
  if (userRole === 'business_admin' && isMember) return true
  return false
}
