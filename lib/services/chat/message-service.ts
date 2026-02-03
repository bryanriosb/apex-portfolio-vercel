import {
  fetchMessagesAction,
  getMessageByIdAction,
  createMessageAction,
  deleteMessageAction,
  subscribeToMessagesAction,
} from '@/lib/actions/message'
import type {
  Message,
  MessageInsert,
  MessageWithSender,
} from '@/lib/models/chat/message'

export interface MessageListResponse {
  data: MessageWithSender[]
  total: number
  total_pages: number
}

export default class MessageService {
  async fetchItems(params: {
    conversation_id: string
    page?: number
    page_size?: number
    before_date?: string
  }): Promise<MessageListResponse> {
    try {
      return await fetchMessagesAction(params)
    } catch (error) {
      console.error('Error fetching messages:', error)
      throw error
    }
  }

  async getById(id: string): Promise<Message | null> {
    try {
      return await getMessageByIdAction(id)
    } catch (error) {
      console.error('Error fetching message by ID:', error)
      throw error
    }
  }

  async createItem(
    data: MessageInsert
  ): Promise<{ success: boolean; data?: Message; error?: string }> {
    try {
      return await createMessageAction(data)
    } catch (error: any) {
      console.error('Error creating message:', error)
      return { success: false, error: error.message }
    }
  }

  async deleteItem(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      return await deleteMessageAction(id)
    } catch (error: any) {
      console.error('Error deleting message:', error)
      return { success: false, error: error.message }
    }
  }

  async subscribe(conversation_id: string) {
    try {
      return await subscribeToMessagesAction(conversation_id)
    } catch (error) {
      console.error('Error subscribing to messages:', error)
      throw error
    }
  }
}
