import { getSupabaseAdminClient } from '@/lib/actions/supabase'
import type {
  EmailBlacklist,
  EmailBlacklistInsert,
  EmailBlacklistUpdate,
  FilteredEmail,
  BlacklistStats,
  BounceType,
} from '@/lib/models/collection/email-blacklist'

/**
 * Service for managing email blacklist
 * Tracks bounced emails and prevents future sends
 */
export class EmailBlacklistService {
  /**
   * Add an email to the blacklist
   * Uses RPC function for idempotent insert
   */
  static async addToBlacklist(
    businessId: string,
    email: string,
    bounceType: BounceType = 'hard',
    bounceReason?: string,
    sourceCustomerId?: string,
    sourceExecutionId?: string,
    sourceClientId?: string,
    provider: string = 'brevo'
  ): Promise<{ success: boolean; data?: EmailBlacklist; error?: string }> {
    try {
      const supabase = await getSupabaseAdminClient()

      const { data, error } = await supabase.rpc('add_to_blacklist', {
        p_business_id: businessId,
        p_email: email,
        p_bounce_type: bounceType,
        p_bounce_reason: bounceReason || null,
        p_source_customer_id: sourceCustomerId || null,
        p_source_execution_id: sourceExecutionId || null,
        p_source_client_id: sourceClientId || null,
        p_provider: provider,
      })

      if (error) {
        console.error('Error adding to blacklist:', error)
        return { success: false, error: error.message }
      }

      // Fetch the inserted/updated record
      const { data: record, error: fetchError } = await supabase
        .from('email_blacklist')
        .select('*')
        .eq('id', data)
        .single()

      if (fetchError) {
        console.error('Error fetching blacklist record:', fetchError)
        return { success: true }
      }

      return { success: true, data: record }
    } catch (error: any) {
      console.error('Exception adding to blacklist:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Check if an email is blacklisted for a business
   */
  static async isEmailBlacklisted(
    businessId: string,
    email: string
  ): Promise<boolean> {
    try {
      const supabase = await getSupabaseAdminClient()

      const { data, error } = await supabase.rpc('is_email_blacklisted', {
        p_business_id: businessId,
        p_email: email,
      })

      if (error) {
        console.error('Error checking blacklist:', error)
        return false
      }

      return data || false
    } catch (error) {
      console.error('Exception checking blacklist:', error)
      return false
    }
  }

  /**
   * Filter an array of emails and return which ones are blacklisted
   */
  static async filterBlacklistedEmails(
    businessId: string,
    emails: string[]
  ): Promise<FilteredEmail[]> {
    try {
      const supabase = await getSupabaseAdminClient()

      const { data, error } = await supabase.rpc('filter_blacklisted_emails', {
        p_business_id: businessId,
        p_emails: emails,
      })

      if (error) {
        console.error('Error filtering emails:', error)
        return emails.map((email) => ({ email, is_blacklisted: false }))
      }

      return data || []
    } catch (error) {
      console.error('Exception filtering emails:', error)
      return emails.map((email) => ({ email, is_blacklisted: false }))
    }
  }

  /**
   * Get all blacklisted emails for a business with pagination
   */
  static async getBlacklist(
    businessId: string,
    options?: {
      page?: number
      pageSize?: number
      bounceType?: BounceType
      search?: string
    }
  ): Promise<{ data: EmailBlacklist[]; total: number }> {
    try {
      const supabase = await getSupabaseAdminClient()

      let query = supabase
        .from('email_blacklist')
        .select('*', { count: 'exact' })
        .eq('business_id', businessId)

      if (options?.bounceType) {
        query = query.eq('bounce_type', options.bounceType)
      }

      if (options?.search) {
        query = query.ilike('email', `%${options.search}%`)
      }

      const page = options?.page || 1
      const pageSize = options?.pageSize || 20
      const start = (page - 1) * pageSize
      const end = start + pageSize - 1

      query = query.order('bounced_at', { ascending: false }).range(start, end)

      const { data, error, count } = await query

      if (error) {
        console.error('Error fetching blacklist:', error)
        return { data: [], total: 0 }
      }

      return { data: data || [], total: count || 0 }
    } catch (error) {
      console.error('Exception fetching blacklist:', error)
      return { data: [], total: 0 }
    }
  }

  /**
   * Remove an email from the blacklist
   */
  static async removeFromBlacklist(
    id: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = await getSupabaseAdminClient()

      const { error } = await supabase.from('email_blacklist').delete().eq('id', id)

      if (error) {
        console.error('Error removing from blacklist:', error)
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error: any) {
      console.error('Exception removing from blacklist:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Remove multiple emails from the blacklist
   */
  static async removeManyFromBlacklist(
    ids: string[]
  ): Promise<{ success: boolean; deletedCount: number; error?: string }> {
    try {
      const supabase = await getSupabaseAdminClient()

      const { error } = await supabase
        .from('email_blacklist')
        .delete()
        .in('id', ids)

      if (error) {
        console.error('Error batch removing from blacklist:', error)
        return { success: false, deletedCount: 0, error: error.message }
      }

      return { success: true, deletedCount: ids.length }
    } catch (error: any) {
      console.error('Exception batch removing from blacklist:', error)
      return { success: false, deletedCount: 0, error: error.message }
    }
  }

  /**
   * Get blacklist statistics for a business
   */
  static async getBlacklistStats(businessId: string): Promise<BlacklistStats> {
    try {
      const supabase = await getSupabaseAdminClient()

      const { data, error } = await supabase
        .from('email_blacklist')
        .select('bounce_type, bounced_at')
        .eq('business_id', businessId)

      if (error) {
        console.error('Error fetching blacklist stats:', error)
        return {
          total: 0,
          hard_bounces: 0,
          soft_bounces: 0,
          complaints: 0,
          last_30_days: 0,
        }
      }

      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const stats = {
        total: data.length,
        hard_bounces: data.filter((item) => item.bounce_type === 'hard').length,
        soft_bounces: data.filter((item) => item.bounce_type === 'soft').length,
        complaints: data.filter((item) => item.bounce_type === 'complaint').length,
        last_30_days: data.filter((item) => new Date(item.bounced_at) >= thirtyDaysAgo)
          .length,
      }

      return stats
    } catch (error) {
      console.error('Exception fetching blacklist stats:', error)
      return {
        total: 0,
        hard_bounces: 0,
        soft_bounces: 0,
        complaints: 0,
        last_30_days: 0,
      }
    }
  }

  /**
   * Get blacklist with customer information (joined with business_customers)
   */
  static async getBlacklistWithCustomerInfo(
    businessId: string,
    options?: {
      page?: number
      pageSize?: number
      bounceType?: BounceType
      search?: string
    }
  ): Promise<{
    data: Array<EmailBlacklist & {
      customer_name: string | null
      customer_company: string | null
      customer_nit: string | null
    }>
    total: number
  }> {
    try {
      const supabase = await getSupabaseAdminClient()

      let query = supabase
        .from('email_blacklist')
        .select(
          `*,
          business_customers:source_customer_id(full_name, company_name, nit)`,
          { count: 'exact' }
        )
        .eq('business_id', businessId)

      if (options?.bounceType) {
        query = query.eq('bounce_type', options.bounceType)
      }

      if (options?.search) {
        query = query.or(`email.ilike.%${options.search}%,business_customers.full_name.ilike.%${options.search}%`)
      }

      const page = options?.page || 1
      const pageSize = options?.pageSize || 20
      const start = (page - 1) * pageSize
      const end = start + pageSize - 1

      query = query.order('bounced_at', { ascending: false }).range(start, end)

      const { data, error, count } = await query

      if (error) {
        console.error('Error fetching blacklist with customer info:', error)
        return { data: [], total: 0 }
      }

      const formattedData = (data || []).map((item: any) => ({
        ...item,
        customer_name: item.business_customers?.full_name || null,
        customer_company: item.business_customers?.company_name || null,
        customer_nit: item.business_customers?.nit || null,
      }))

      return { data: formattedData, total: count || 0 }
    } catch (error) {
      console.error('Exception fetching blacklist with customer info:', error)
      return { data: [], total: 0 }
    }
  }

  /**
   * Clean email address (lowercase and trim)
   */
  static normalizeEmail(email: string): string {
    return email.toLowerCase().trim()
  }
}
