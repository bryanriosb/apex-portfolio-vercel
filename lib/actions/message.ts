'use server'

import { getSupabaseAdminClient } from '@/lib/actions/supabase'
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

export async function fetchMessagesAction(params: {
  conversation_id: string
  page?: number
  page_size?: number
  before_date?: string
}): Promise<MessageListResponse> {
  try {
    const supabase = await getSupabaseAdminClient()
    const page = params.page || 1
    const pageSize = params.page_size || 50
    const offset = (page - 1) * pageSize

    let query = supabase
      .from('messages')
      .select('*', { count: 'exact' })
      .eq('conversation_id', params.conversation_id)
      .order('created_at', { ascending: false })

    if (params.before_date) {
      query = query.lt('created_at', params.before_date)
    }

    const { data, error, count } = await query.range(offset, offset + pageSize - 1)

    if (error) {
      console.error('Error fetching messages:', error)
      throw new Error(error.message)
    }

    const totalPages = count ? Math.ceil(count / pageSize) : 0

    return {
      data: data || [],
      total: count || 0,
      total_pages: totalPages,
    }
  } catch (error) {
    console.error('Error in fetchMessagesAction:', error)
    throw error
  }
}

export async function getMessageByIdAction(id: string): Promise<Message | null> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching message by ID:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error in getMessageByIdAction:', error)
    throw error
  }
}

export async function createMessageAction(
  data: MessageInsert
): Promise<{ success: boolean; data?: Message; error?: string }> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert(data)
      .select()
      .single()

    if (messageError) {
      console.error('Error creating message:', messageError)
      return { success: false, error: messageError.message }
    }

    const { error: updateError } = await supabase
      .from('conversations')
      .update({
        last_message_at: message.created_at,
      })
      .eq('id', data.conversation_id)

    if (updateError) {
      console.error('Error updating conversation last_message_at:', updateError)
    }

    return { success: true, data: message }
  } catch (error: any) {
    console.error('Error in createMessageAction:', error)
    return { success: false, error: error.message }
  }
}

export async function deleteMessageAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { error } = await supabase.from('messages').delete().eq('id', id)

    if (error) {
      console.error('Error deleting message:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error in deleteMessageAction:', error)
    return { success: false, error: error.message }
  }
}

export async function subscribeToMessagesAction(conversation_id: string) {
  const supabase = await getSupabaseAdminClient()

  return supabase
    .channel(`messages:${conversation_id}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversation_id}`,
      },
      (payload) => {
        return payload
      }
    )
    .subscribe()
}
