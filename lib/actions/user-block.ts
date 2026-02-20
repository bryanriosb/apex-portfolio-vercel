'use server'

import { getSupabaseAdminClient } from '@/lib/actions/supabase'
import type { UserBlock, UserBlockInsert } from '@/lib/models/chat/user-block'

export async function createUserBlockAction(
  data: UserBlockInsert
): Promise<{ success: boolean; data?: UserBlock; error?: string }> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { data: block, error } = await supabase
      .from('user_blocks')
      .insert(data)
      .select()
      .single()

    if (error) {
      console.error('Error creating user block:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data: block }
  } catch (error: any) {
    console.error('Error in createUserBlockAction:', error)
    return { success: false, error: error.message }
  }
}

export async function deleteUserBlockAction(
  blocker_user_id: string,
  blocked_business_id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { error } = await supabase
      .from('user_blocks')
      .delete()
      .eq('blocker_user_id', blocker_user_id)
      .eq('blocked_business_id', blocked_business_id)

    if (error) {
      console.error('Error deleting user block:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error in deleteUserBlockAction:', error)
    return { success: false, error: error.message }
  }
}

export async function isUserBlockedAction(
  blocker_user_id: string,
  blocked_business_id: string
): Promise<boolean> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { data, error } = await supabase
      .from('user_blocks')
      .select('blocker_user_id')
      .eq('blocker_user_id', blocker_user_id)
      .eq('blocked_business_id', blocked_business_id)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking user block:', error)
      return false
    }

    return !!data
  } catch (error) {
    console.error('Error in isUserBlockedAction:', error)
    return false
  }
}

export async function fetchBlockedBusinessesAction(
  blocker_user_id: string
): Promise<{ data: UserBlock[]; error?: string }> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { data, error } = await supabase
      .from('user_blocks')
      .select('*')
      .eq('blocker_user_id', blocker_user_id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching blocked businesses:', error)
      return { data: [], error: error.message }
    }

    return { data: data || [] }
  } catch (error: any) {
    console.error('Error in fetchBlockedBusinessesAction:', error)
    return { data: [], error: error.message }
  }
}
