'use server'

import { getSupabaseAdminClient } from '@/lib/actions/supabase'
import { requireAccountAccess, requireCompanyAdmin } from '@/lib/auth/tenant-guard'
import {
  BLOCK_APEX_PROVIDERS_KEY,
  isApexProvidersBlocked,
} from '@/lib/models/agents/llm-provider-policy'

/**
 * Devuelve la política de proveedores LLM de la cuenta activa.
 *
 * El `business_account_id` se resuelve/valida contra la sesión vía
 * `requireAccountAccess` (fail-closed): un rol no cross-tenant solo puede
 * leer la política de su propia cuenta.
 */
export async function getLlmProviderPolicyAction(
  businessAccountId?: string
): Promise<{ blockApexProviders: boolean }> {
  try {
    const { businessAccountId: accountId } =
      await requireAccountAccess(businessAccountId)

    const client = await getSupabaseAdminClient()
    const { data, error } = await client
      .from('business_accounts')
      .select('settings')
      .eq('id', accountId)
      .single()

    if (error || !data) {
      return { blockApexProviders: false }
    }

    return {
      blockApexProviders: isApexProvidersBlocked(
        data.settings as Record<string, unknown> | null
      ),
    }
  } catch {
    // Fail-open en lectura: ante error no restringimos la UI (el enforcement
    // real, si se añade, debe vivir en el backend).
    return { blockApexProviders: false }
  }
}

/**
 * Activa/desactiva el bloqueo de proveedores de plataforma para una cuenta.
 * Exclusivo de `company_admin` (patrón de `updateAccountEmailLimitAction`).
 */
export async function updateLlmProviderPolicyAction(
  accountId: string,
  block: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireCompanyAdmin()

    const client = await getSupabaseAdminClient()

    const { data: account, error: fetchError } = await client
      .from('business_accounts')
      .select('settings')
      .eq('id', accountId)
      .single()

    if (fetchError || !account) {
      return { success: false, error: 'Cuenta no encontrada' }
    }

    const currentSettings =
      (account.settings as Record<string, unknown> | null) || {}
    const newSettings = {
      ...currentSettings,
      [BLOCK_APEX_PROVIDERS_KEY]: block,
    }

    const { error: updateError } = await client
      .from('business_accounts')
      .update({ settings: newSettings })
      .eq('id', accountId)

    if (updateError) {
      return { success: false, error: updateError.message }
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error updating LLM provider policy:', error)
    return { success: false, error: error.message }
  }
}
