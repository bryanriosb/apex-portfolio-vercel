export interface UserBlock {
  blocker_user_id: string
  blocked_business_id: string
  created_at: string
}

export interface UserBlockInsert {
  blocker_user_id: string
  blocked_business_id: string
}

export class UserBlock implements UserBlock {
  blocker_user_id: string
  blocked_business_id: string
  created_at: string

  constructor(data: UserBlock) {
    this.blocker_user_id = data.blocker_user_id
    this.blocked_business_id = data.blocked_business_id
    this.created_at = data.created_at
  }
}
