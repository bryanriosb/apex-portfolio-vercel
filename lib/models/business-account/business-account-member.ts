export type MemberRole = 'owner' | 'admin' | 'member'
export type MemberStatus = 'active' | 'inactive'

export interface BusinessAccountMember {
  id: string
  business_account_id: string
  user_profile_id: string
  role: MemberRole
  status: MemberStatus
  created_at: string
  updated_at: string
}

export class BusinessAccountMember implements BusinessAccountMember {
  id: string
  business_account_id: string
  user_profile_id: string
  role: MemberRole
  status: MemberStatus
  created_at: string
  updated_at: string

  constructor(data: BusinessAccountMember) {
    this.id = data.id
    this.business_account_id = data.business_account_id
    this.user_profile_id = data.user_profile_id
    this.role = data.role
    this.status = data.status
    this.created_at = data.created_at
    this.updated_at = data.updated_at
  }

  isOwner(): boolean {
    return this.role === 'owner'
  }

  isAdmin(): boolean {
    return this.role === 'admin' || this.role === 'owner'
  }

  isActive(): boolean {
    return this.status === 'active'
  }
}

export interface BusinessAccountMemberInsert {
  business_account_id: string
  user_profile_id: string
  role?: MemberRole
  status?: MemberStatus
}

export interface BusinessAccountMemberUpdate {
  role?: MemberRole
  status?: MemberStatus
}
