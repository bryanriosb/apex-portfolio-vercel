'use server'

/**
 * Acción server para verificar que los message_ids estén correctamente guardados
 * Solo verifica, no modifica (ya que usamos solo custom_data->>message_id)
 */

import { getSupabaseAdminClient } from '@/lib/actions/supabase'

export async function checkMessageIdStorage(): Promise<{
  success: boolean
  totalWithMessageId: number
  withoutBrackets: number
  error?: string
}> {
  const supabase = await getSupabaseAdminClient()

  try {
    // Contar clientes con message_id
    const { count: totalWithMessageId, error: countError } = await supabase
      .from('collection_clients')
      .select('*', { count: 'exact', head: true })
      .not('custom_data->>message_id', 'is', null)

    if (countError) {
      console.error('Error counting clients:', countError)
      return { success: false, totalWithMessageId: 0, withoutBrackets: 0, error: countError.message }
    }

    // Contar message_ids sin brackets (formato incorrecto)
    const { data: invalidFormats, error: invalidError } = await supabase
      .from('collection_clients')
      .select('id, custom_data->>message_id')
      .not('custom_data->>message_id', 'is', null)
      .not('custom_data->>message_id', 'like', '<%')

    if (invalidError) {
      console.error('Error checking formats:', invalidError)
      return { success: false, totalWithMessageId: totalWithMessageId || 0, withoutBrackets: 0, error: invalidError.message }
    }

    const withoutBrackets = invalidFormats?.length || 0

    console.log(`[CHECK] ${totalWithMessageId} clients with message_id, ${withoutBrackets} without brackets`)
    
    return { 
      success: true, 
      totalWithMessageId: totalWithMessageId || 0, 
      withoutBrackets 
    }
  } catch (error) {
    console.error('Error checking message_ids:', error)
    return { 
      success: false, 
      totalWithMessageId: 0, 
      withoutBrackets: 0,
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}
