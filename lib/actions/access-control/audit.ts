'use server'

import { getSupabaseAdminClient } from '@/lib/actions/supabase'
import { USER_ROLES } from '@/const/roles'
import {
  requireRole,
  resolveAccountScope,
} from '@/lib/auth/tenant-guard'

import type { RbacAuditEntry } from '@/lib/models/access-control/access-control'

/**
 * Auditoría de cambios RBAC (AC-2): company_admin ve toda la plataforma;
 * business_admin solo los eventos de su cuenta.
 */
export async function fetchRbacAuditAction(params?: {
  businessAccountId?: string
  limit?: number
}): Promise<{ data: RbacAuditEntry[]; error: string | null }> {
  try {
    await requireRole(USER_ROLES.COMPANY_ADMIN, USER_ROLES.BUSINESS_ADMIN)
    const { businessAccountId } = await resolveAccountScope(
      params?.businessAccountId
    )

    const client = await getSupabaseAdminClient()
    let query = client
      .from('rbac_audit_log')
      .select('*')
      .order('occurred_at', { ascending: false })
      .limit(Math.min(params?.limit ?? 100, 500))

    if (businessAccountId) {
      query = query.eq('business_account_id', businessAccountId)
    }

    const { data, error } = await query
    if (error) throw error

    return { data: data ?? [], error: null }
  } catch (error: any) {
    console.error('Error fetching RBAC audit log:', error)
    return { data: [], error: error.message }
  }
}
