'use server'

import { getSupabaseAdminClient } from '@/lib/actions/supabase'
import type {
  Conversation,
  ConversationInsert,
  ConversationUpdate,
  ConversationWithDetails,
} from '@/lib/models/chat/conversation'

/**
 * Helper function to get user auth data (name, email) from auth.users
 */
async function getUserAuthData(userId: string) {
  const supabase = await getSupabaseAdminClient()
  const { data, error } = await supabase.auth.admin.getUserById(userId)

  if (error || !data.user) {
    console.error('Error getting user auth data:', error)
    return null
  }

  return {
    name: data.user.user_metadata?.name || data.user.email?.split('@')[0] || null,
    email: data.user.email || null,
  }
}

export interface ConversationListResponse {
  data: ConversationWithDetails[]
  total: number
  total_pages: number
}

export async function fetchConversationsAction(params?: {
  page?: number
  page_size?: number
  business_id?: string
  users_profile_id?: string
  is_muted?: boolean
}): Promise<ConversationListResponse> {
  try {
    const supabase = await getSupabaseAdminClient()
    const page = params?.page || 1
    const pageSize = params?.page_size || 20
    const offset = (page - 1) * pageSize

    let query = supabase
      .from('conversations')
      .select(
        `
        *,
        user_profile:users_profile!conversations_users_profile_id_fkey(
          id,
          user_id,
          profile_picture_url
        ),
        business:businesses(
          id,
          name,
          logo_url
        )
      `,
        { count: 'exact' }
      )
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })

    if (params?.business_id) {
      query = query.eq('business_id', params.business_id)
    }

    if (params?.users_profile_id) {
      query = query.eq('users_profile_id', params.users_profile_id)
    }

    if (params?.is_muted !== undefined) {
      if (params.business_id) {
        query = query.eq('is_muted_by_business', params.is_muted)
      } else if (params.users_profile_id) {
        query = query.eq('is_muted_by_user', params.is_muted)
      }
    }

    const { data, error, count } = await query.range(offset, offset + pageSize - 1)

    if (error) {
      console.error('Error fetching conversations:', error)
      throw new Error(error.message)
    }

    // Enriquecer los datos con información de auth.users y último mensaje
    const enrichedData = await Promise.all(
      (data || []).map(async (conversation: any) => {
        // Obtener datos del usuario de auth.users
        if (conversation.user_profile?.user_id) {
          const authData = await getUserAuthData(conversation.user_profile.user_id)
          if (authData) {
            conversation.user_profile = {
              ...conversation.user_profile,
              ...authData,
            }
          }
        }

        // Obtener el último mensaje de la conversación
        const { data: lastMessage } = await supabase
          .from('messages')
          .select('id, content, sender_type, created_at')
          .eq('conversation_id', conversation.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (lastMessage) {
          conversation.last_message = lastMessage
        }

        return conversation
      })
    )

    const totalPages = count ? Math.ceil(count / pageSize) : 0

    return {
      data: enrichedData,
      total: count || 0,
      total_pages: totalPages,
    }
  } catch (error) {
    console.error('Error in fetchConversationsAction:', error)
    throw error
  }
}

export async function getConversationByIdAction(
  id: string
): Promise<ConversationWithDetails | null> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { data, error } = await supabase
      .from('conversations')
      .select(
        `
        *,
        user_profile:users_profile!conversations_users_profile_id_fkey(
          id,
          user_id,
          profile_picture_url
        ),
        business:businesses(
          id,
          name,
          logo_url
        )
      `
      )
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching conversation by ID:', error)
      throw new Error(error.message)
    }

    // Enriquecer con datos de auth.users
    if (data?.user_profile?.user_id) {
      const authData = await getUserAuthData(data.user_profile.user_id)
      if (authData) {
        data.user_profile = {
          ...data.user_profile,
          ...authData,
        }
      }
    }

    // Obtener el último mensaje de la conversación
    const { data: lastMessage } = await supabase
      .from('messages')
      .select('id, content, sender_type, created_at')
      .eq('conversation_id', data.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (lastMessage) {
      data.last_message = lastMessage
    }

    return data
  } catch (error) {
    console.error('Error in getConversationByIdAction:', error)
    throw error
  }
}

export async function getOrCreateConversationAction(
  users_profile_id: string,
  business_id: string
): Promise<{ success: boolean; data?: Conversation; error?: string }> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { data: existing } = await supabase
      .from('conversations')
      .select('*')
      .eq('users_profile_id', users_profile_id)
      .eq('business_id', business_id)
      .single()

    if (existing) {
      return { success: true, data: existing }
    }

    const conversationData: ConversationInsert = {
      users_profile_id,
      business_id,
    }

    const { data, error } = await supabase
      .from('conversations')
      .insert(conversationData)
      .select()
      .single()

    if (error) {
      console.error('Error creating conversation:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error: any) {
    console.error('Error in getOrCreateConversationAction:', error)
    return { success: false, error: error.message }
  }
}

export async function updateConversationAction(
  id: string,
  data: ConversationUpdate
): Promise<{ success: boolean; data?: Conversation; error?: string }> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { data: updated, error } = await supabase
      .from('conversations')
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating conversation:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data: updated }
  } catch (error: any) {
    console.error('Error in updateConversationAction:', error)
    return { success: false, error: error.message }
  }
}

export async function markConversationAsReadAction(
  conversation_id: string,
  reader_type: 'USER' | 'BUSINESS'
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await getSupabaseAdminClient()
    const now = new Date().toISOString()

    const updateField =
      reader_type === 'USER' ? 'user_last_read_at' : 'business_last_read_at'

    const { error } = await supabase
      .from('conversations')
      .update({ [updateField]: now })
      .eq('id', conversation_id)

    if (error) {
      console.error('Error marking conversation as read:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error in markConversationAsReadAction:', error)
    return { success: false, error: error.message }
  }
}

export async function deleteConversationAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { error } = await supabase.from('conversations').delete().eq('id', id)

    if (error) {
      console.error('Error deleting conversation:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error in deleteConversationAction:', error)
    return { success: false, error: error.message }
  }
}

export async function getUnreadCountAction(
  conversation_id: string,
  reader_type: 'USER' | 'BUSINESS'
): Promise<number> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { data: conversation } = await supabase
      .from('conversations')
      .select('user_last_read_at, business_last_read_at')
      .eq('id', conversation_id)
      .single()

    if (!conversation) return 0

    const lastReadAt =
      reader_type === 'USER'
        ? conversation.user_last_read_at
        : conversation.business_last_read_at

    // Solo contar mensajes del otro remitente (no los propios)
    const otherSenderType = reader_type === 'USER' ? 'BUSINESS' : 'USER'

    let query = supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('conversation_id', conversation_id)
      .eq('sender_type', otherSenderType)

    if (lastReadAt) {
      query = query.gt('created_at', lastReadAt)
    }

    const { count } = await query

    return count || 0
  } catch (error) {
    console.error('Error in getUnreadCountAction:', error)
    return 0
  }
}
