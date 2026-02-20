import type { UserRole } from '@/const/roles'
import type { MemberRole } from '@/lib/models/business-account/business-account-member'

export function canManageBusinessAccount(
  userRole: UserRole,
  memberRole?: MemberRole | null
): boolean {
  if (userRole === 'company_admin') return true
  if (userRole === 'business_admin' && (memberRole === 'owner' || memberRole === 'admin')) {
    return true
  }
  return false
}

export function canCreateBusinessInAccount(
  userRole: UserRole,
  memberRole?: MemberRole | null
): boolean {
  if (userRole === 'company_admin') return true
  if (userRole === 'business_admin' && (memberRole === 'owner' || memberRole === 'admin')) {
    return true
  }
  return false
}

export function canInviteMembers(
  userRole: UserRole,
  memberRole?: MemberRole | null
): boolean {
  if (userRole === 'company_admin') return true
  if (userRole === 'business_admin' && (memberRole === 'owner' || memberRole === 'admin')) {
    return true
  }
  return false
}

export function canRemoveMembers(
  userRole: UserRole,
  memberRole?: MemberRole | null,
  targetMemberRole?: MemberRole
): boolean {
  if (userRole === 'company_admin') return true

  if (memberRole === 'owner') {
    return targetMemberRole !== 'owner'
  }

  if (memberRole === 'admin') {
    return targetMemberRole !== 'owner' && targetMemberRole !== 'admin'
  }

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
