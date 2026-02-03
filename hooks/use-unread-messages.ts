'use client'

import { useState, useEffect, useRef } from 'react'
import { useCurrentUser } from './use-current-user'
import { getTotalUnreadMessagesAction } from '@/lib/actions/chat-unread'
import { createBrowserClient } from '@supabase/ssr'

export function useUnreadMessages() {
  const [unreadCount, setUnreadCount] = useState(0)
  const { user, role, businesses, userProfileId } = useCurrentUser()
  const firstBusinessId = businesses?.[0]?.id
  const userId = user?.id
  const subscriptionRef = useRef<any>(null)

  useEffect(() => {
    if (!userId || !role) return

    const fetchUnreadCount = async () => {
      try {
        const params: {
          business_id?: string
          users_profile_id?: string
          reader_type: 'USER' | 'BUSINESS'
        } = {
          reader_type: role === 'business_admin' ? 'BUSINESS' : 'USER',
        }

        if (role === 'business_admin' && firstBusinessId) {
          params.business_id = firstBusinessId
        } else if (role === 'customer' && userProfileId) {
          params.users_profile_id = userProfileId
        }

        const count = await getTotalUnreadMessagesAction(params)
        setUnreadCount(count)
      } catch (error) {
        console.error('Error fetching unread count:', error)
      }
    }

    fetchUnreadCount()

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe()
    }

    const otherSenderType = role === 'business_admin' ? 'USER' : 'BUSINESS'

    subscriptionRef.current = supabase
      .channel(`messages-count-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const message = payload.new as any
          if (message.sender_type === otherSenderType) {
            fetchUnreadCount()
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations',
        },
        (payload) => {
          const data = payload.new as any
          const oldData = payload.old as any
          const readField =
            role === 'business_admin' ? 'business_last_read_at' : 'user_last_read_at'

          if (data[readField] !== oldData[readField]) {
            fetchUnreadCount()
          }
        }
      )
      .subscribe()

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe()
      }
    }
  }, [userId, role, firstBusinessId, userProfileId])

  return unreadCount
}
