import {
  fetchConversationsAction,
  getConversationByIdAction,
  getOrCreateConversationAction,
  updateConversationAction,
  markConversationAsReadAction,
  deleteConversationAction,
  getUnreadCountAction,
} from '@/lib/actions/conversation'
import type {
  Conversation,
  ConversationInsert,
  ConversationUpdate,
  ConversationWithDetails,
} from '@/lib/models/chat/conversation'

export interface ConversationListResponse {
  data: ConversationWithDetails[]
  total: number
  total_pages: number
}

export default class ConversationService {
  async fetchItems(params?: {
    page?: number
    page_size?: number
    business_id?: string
    users_profile_id?: string
    is_muted?: boolean
  }): Promise<ConversationListResponse> {
    try {
      return await fetchConversationsAction(params)
    } catch (error) {
      console.error('Error fetching conversations:', error)
      throw error
    }
  }

  async getById(id: string): Promise<ConversationWithDetails | null> {
    try {
      return await getConversationByIdAction(id)
    } catch (error) {
      console.error('Error fetching conversation by ID:', error)
      throw error
    }
  }

  async getOrCreate(
    users_profile_id: string,
    business_id: string
  ): Promise<{ success: boolean; data?: Conversation; error?: string }> {
    try {
      return await getOrCreateConversationAction(users_profile_id, business_id)
    } catch (error: any) {
      console.error('Error getting or creating conversation:', error)
      return { success: false, error: error.message }
    }
  }

  async updateItem(
    id: string,
    data: ConversationUpdate
  ): Promise<{ success: boolean; data?: Conversation; error?: string }> {
    try {
      return await updateConversationAction(id, data)
    } catch (error: any) {
      console.error('Error updating conversation:', error)
      return { success: false, error: error.message }
    }
  }

  async markAsRead(
    conversation_id: string,
    reader_type: 'USER' | 'BUSINESS'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      return await markConversationAsReadAction(conversation_id, reader_type)
    } catch (error: any) {
      console.error('Error marking conversation as read:', error)
      return { success: false, error: error.message }
    }
  }

  async deleteItem(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      return await deleteConversationAction(id)
    } catch (error: any) {
      console.error('Error deleting conversation:', error)
      return { success: false, error: error.message }
    }
  }

  async getUnreadCount(
    conversation_id: string,
    reader_type: 'USER' | 'BUSINESS'
  ): Promise<number> {
    try {
      return await getUnreadCountAction(conversation_id, reader_type)
    } catch (error) {
      console.error('Error getting unread count:', error)
      return 0
    }
  }
}
