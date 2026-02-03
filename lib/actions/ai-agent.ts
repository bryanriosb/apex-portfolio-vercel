'use server'

import { getSupabaseAdminClient } from '@/lib/actions/supabase'
import { v4 as uuidv4 } from 'uuid'
import type {
  AgentLink,
  AgentLinkInsert,
  AgentLinkUpdate,
  AgentConversation,
  AgentConversationInsert,
  AgentMessage,
  AgentMessageInsert,
  AgentLinkStatus,
} from '@/lib/models/ai-conversation'

function generateToken(): string {
  return `ag_${uuidv4().replace(/-/g, '')}`
}

export async function createAgentLinkAction(
  data: AgentLinkInsert
): Promise<{ success: boolean; data?: AgentLink; error?: string }> {
  try {
    const supabase = await getSupabaseAdminClient()

    const token = generateToken()

    const { data: link, error } = await supabase
      .from('agent_links')
      .insert({
        ...data,
        token,
        status: 'active',
        current_uses: 0,
        minutes_used: 0,
        settings: data.settings || {},
      })
      .select()
      .single()

    if (error) throw error

    return { success: true, data: link }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    return { success: false, error: message }
  }
}

export async function fetchAgentLinksAction(
  businessId: string
): Promise<{ success: boolean; data?: AgentLink[]; error?: string }> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { data: links, error } = await supabase
      .from('agent_links')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return { success: true, data: links || [] }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    return { success: false, error: message }
  }
}

export async function getAgentLinkByTokenAction(
  token: string
): Promise<{ success: boolean; data?: AgentLink; error?: string }> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { data: link, error } = await supabase
      .from('agent_links')
      .select('*')
      .eq('token', token)
      .single()

    if (error) throw error

    return { success: true, data: link }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    return { success: false, error: message }
  }
}

export async function updateAgentLinkAction(
  id: string,
  data: AgentLinkUpdate
): Promise<{ success: boolean; data?: AgentLink; error?: string }> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { data: currentLink } = await supabase
      .from('agent_links')
      .select('*')
      .eq('id', id)
      .single()

    if (!currentLink) {
      return { success: false, error: 'Enlace no encontrado' }
    }

    const updatedData = { ...data, updated_at: new Date().toISOString() }

    const newType = data.type || currentLink.type
    const newMaxUses = data.max_uses !== undefined ? data.max_uses : currentLink.max_uses
    const newMaxMinutes = data.max_minutes !== undefined ? data.max_minutes : currentLink.max_minutes
    const currentUses = currentLink.current_uses
    const minutesUsed = currentLink.minutes_used

    if (data.type || data.max_uses !== undefined || data.max_minutes !== undefined) {
      let recalculatedStatus: AgentLinkStatus = 'active'

      if (newType === 'single_use' && currentUses >= 1) {
        recalculatedStatus = 'exhausted'
      } else if (newMaxUses && currentUses >= newMaxUses) {
        recalculatedStatus = 'exhausted'
      } else if (newMaxMinutes && minutesUsed >= newMaxMinutes) {
        recalculatedStatus = 'exhausted'
      } else if (currentLink.expires_at && new Date(currentLink.expires_at) < new Date()) {
        recalculatedStatus = 'expired'
      }

      updatedData.status = recalculatedStatus
    }

    const { data: link, error } = await supabase
      .from('agent_links')
      .update(updatedData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return { success: true, data: link }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    return { success: false, error: message }
  }
}

export async function deleteAgentLinkAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { error } = await supabase.from('agent_links').delete().eq('id', id)

    if (error) throw error

    return { success: true }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    return { success: false, error: message }
  }
}

export async function validateAndConsumeLink(
  token: string
): Promise<{ valid: boolean; link?: AgentLink; error?: string }> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { data: link, error } = await supabase
      .from('agent_links')
      .select('*')
      .eq('token', token)
      .single()

    if (error || !link) {
      return { valid: false, error: 'Enlace no válido' }
    }

    if (link.status !== 'active') {
      return { valid: false, error: `Enlace ${link.status}` }
    }

    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      await supabase
        .from('agent_links')
        .update({ status: 'expired' as AgentLinkStatus })
        .eq('id', link.id)
      return { valid: false, error: 'Enlace expirado' }
    }

    if (link.type === 'single_use' && link.current_uses >= 1) {
      await supabase
        .from('agent_links')
        .update({ status: 'exhausted' as AgentLinkStatus })
        .eq('id', link.id)
      return { valid: false, error: 'Enlace de un solo uso ya utilizado' }
    }

    if (link.max_uses && link.current_uses >= link.max_uses) {
      await supabase
        .from('agent_links')
        .update({ status: 'exhausted' as AgentLinkStatus })
        .eq('id', link.id)
      return { valid: false, error: 'Límite de usos alcanzado' }
    }

    if (link.max_minutes && link.minutes_used >= link.max_minutes) {
      await supabase
        .from('agent_links')
        .update({ status: 'exhausted' as AgentLinkStatus })
        .eq('id', link.id)
      return { valid: false, error: 'Límite de minutos alcanzado' }
    }

    return { valid: true, link }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    return { valid: false, error: message }
  }
}

export async function incrementLinkUsage(
  linkId: string,
  minutesUsed: number = 0
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { data: link } = await supabase
      .from('agent_links')
      .select('current_uses, minutes_used, max_uses, max_minutes, type')
      .eq('id', linkId)
      .single()

    if (!link) {
      return { success: false, error: 'Enlace no encontrado' }
    }

    const newUses = link.current_uses + 1
    const newMinutes = link.minutes_used + minutesUsed

    let newStatus: AgentLinkStatus = 'active'

    if (link.type === 'single_use') {
      newStatus = 'exhausted'
    } else if (link.max_uses && newUses >= link.max_uses) {
      newStatus = 'exhausted'
    } else if (link.max_minutes && newMinutes >= link.max_minutes) {
      newStatus = 'exhausted'
    }

    await supabase
      .from('agent_links')
      .update({
        current_uses: newUses,
        minutes_used: newMinutes,
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', linkId)

    return { success: true }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    return { success: false, error: message }
  }
}

export async function createConversationAction(
  data: AgentConversationInsert
): Promise<{ success: boolean; data?: AgentConversation; error?: string }> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { data: conversation, error } = await supabase
      .from('agent_conversations')
      .insert({
        ...data,
        status: 'active',
        started_at: new Date().toISOString(),
        duration_seconds: 0,
        message_count: 0,
        actions_taken: [],
        metadata: {},
      })
      .select()
      .single()

    if (error) throw error

    return { success: true, data: conversation }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    return { success: false, error: message }
  }
}

export async function updateConversationAction(
  id: string,
  updates: Partial<AgentConversation>
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { error } = await supabase
      .from('agent_conversations')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) throw error

    return { success: true }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    return { success: false, error: message }
  }
}

export async function endConversationAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { data: conversation } = await supabase
      .from('agent_conversations')
      .select('started_at, agent_link_id')
      .eq('id', id)
      .single()

    if (!conversation) {
      return { success: false, error: 'Conversación no encontrada' }
    }

    const startedAt = new Date(conversation.started_at)
    const endedAt = new Date()
    const durationSeconds = Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000)
    const minutesUsed = Math.ceil(durationSeconds / 60)

    await supabase
      .from('agent_conversations')
      .update({
        status: 'completed',
        ended_at: endedAt.toISOString(),
        duration_seconds: durationSeconds,
        updated_at: endedAt.toISOString(),
      })
      .eq('id', id)

    if (conversation.agent_link_id) {
      // Solo actualizar minutos usados (el uso ya se contó al iniciar sesión)
      const { data: currentLink } = await supabase
        .from('agent_links')
        .select('minutes_used, max_minutes')
        .eq('id', conversation.agent_link_id)
        .single()

      if (currentLink) {
        const newMinutes = (currentLink.minutes_used || 0) + minutesUsed
        const updates: Record<string, unknown> = {
          minutes_used: newMinutes,
          updated_at: new Date().toISOString(),
        }

        // Si excede el límite de minutos, marcar como exhausted
        if (currentLink.max_minutes && newMinutes >= currentLink.max_minutes) {
          updates.status = 'exhausted'
        }

        await supabase
          .from('agent_links')
          .update(updates)
          .eq('id', conversation.agent_link_id)
      }
    }

    return { success: true }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    return { success: false, error: message }
  }
}

export async function addMessageAction(
  data: AgentMessageInsert
): Promise<{ success: boolean; data?: AgentMessage; error?: string }> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { data: message, error } = await supabase
      .from('agent_messages')
      .insert({
        ...data,
        tokens_used: data.tokens_used || 0,
      })
      .select()
      .single()

    if (error) throw error

    await supabase.rpc('increment_message_count', {
      conv_id: data.conversation_id,
    })

    return { success: true, data: message }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    return { success: false, error: message }
  }
}

export async function fetchConversationMessagesAction(
  conversationId: string
): Promise<{ success: boolean; data?: AgentMessage[]; error?: string }> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { data: messages, error } = await supabase
      .from('agent_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (error) throw error

    return { success: true, data: messages || [] }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    return { success: false, error: message }
  }
}

export async function fetchConversationsAction(
  businessId: string,
  options?: { limit?: number; status?: string }
): Promise<{ success: boolean; data?: AgentConversation[]; error?: string }> {
  try {
    const supabase = await getSupabaseAdminClient()

    let query = supabase
      .from('agent_conversations')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })

    if (options?.status) {
      query = query.eq('status', options.status)
    }

    if (options?.limit) {
      query = query.limit(options.limit)
    }

    const { data: conversations, error } = await query

    if (error) throw error

    return { success: true, data: conversations || [] }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    return { success: false, error: message }
  }
}
