export interface Conversation {
  id: string
  users_profile_id: string
  business_id: string
  user_last_read_at: string | null
  business_last_read_at: string | null
  is_muted_by_user: boolean
  is_muted_by_business: boolean
  last_message_at: string | null
  created_at: string
  updated_at: string
}

export interface ConversationWithDetails extends Conversation {
  user_profile?: {
    id: string
    user_id: string
    profile_picture_url: string | null
    name: string | null
    email: string | null
  }
  business?: {
    id: string
    name: string
    logo_url: string | null
  }
  last_message?: {
    id: string
    content: string
    sender_type: 'USER' | 'BUSINESS'
    created_at: string
  }
  unread_count?: number
}

export interface ConversationInsert {
  users_profile_id: string
  business_id: string
  user_last_read_at?: string
  business_last_read_at?: string
  is_muted_by_user?: boolean
  is_muted_by_business?: boolean
  last_message_at?: string
}

export interface ConversationUpdate {
  user_last_read_at?: string
  business_last_read_at?: string
  is_muted_by_user?: boolean
  is_muted_by_business?: boolean
  last_message_at?: string
}

export class Conversation implements Conversation {
  id: string
  users_profile_id: string
  business_id: string
  user_last_read_at: string | null
  business_last_read_at: string | null
  is_muted_by_user: boolean
  is_muted_by_business: boolean
  last_message_at: string | null
  created_at: string
  updated_at: string

  constructor(data: Conversation) {
    this.id = data.id
    this.users_profile_id = data.users_profile_id
    this.business_id = data.business_id
    this.user_last_read_at = data.user_last_read_at
    this.business_last_read_at = data.business_last_read_at
    this.is_muted_by_user = data.is_muted_by_user
    this.is_muted_by_business = data.is_muted_by_business
    this.last_message_at = data.last_message_at
    this.created_at = data.created_at
    this.updated_at = data.updated_at
  }
}
