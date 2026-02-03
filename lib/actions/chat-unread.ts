'use server'

import { getSupabaseAdminClient } from '@/lib/actions/supabase'

export async function getTotalUnreadMessagesAction(params: {
  business_id?: string
  users_profile_id?: string
  reader_type: 'USER' | 'BUSINESS'
}): Promise<number> {
  try {
    const supabase = await getSupabaseAdminClient()

    let conversationsQuery = supabase
      .from('conversations')
      .select('id, user_last_read_at, business_last_read_at')

    if (params.business_id) {
      conversationsQuery = conversationsQuery.eq('business_id', params.business_id)
    }

    if (params.users_profile_id) {
      conversationsQuery = conversationsQuery.eq(
        'users_profile_id',
        params.users_profile_id
      )
    }

    const { data: conversations, error: convError } = await conversationsQuery

    if (convError) {
      console.error('Error fetching conversations:', convError)
      return 0
    }

    if (!conversations || conversations.length === 0) {
      return 0
    }

    let totalUnread = 0

    for (const conversation of conversations) {
      const lastReadAt =
        params.reader_type === 'USER'
          ? conversation.user_last_read_at
          : conversation.business_last_read_at

      const otherSenderType = params.reader_type === 'USER' ? 'BUSINESS' : 'USER'

      let messagesQuery = supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', conversation.id)
        .eq('sender_type', otherSenderType)

      if (lastReadAt) {
        messagesQuery = messagesQuery.gt('created_at', lastReadAt)
      }

      const { count } = await messagesQuery
      totalUnread += count || 0
    }

    return totalUnread
  } catch (error) {
    console.error('Error in getTotalUnreadMessagesAction:', error)
    return 0
  }
}
