'use server'

import { EmailBlacklistService } from '@/lib/services/collection/email-blacklist-service'
import type {
  EmailBlacklist,
  BounceType,
} from '@/lib/models/collection/email-blacklist'

export interface BlacklistListResponse {
  data: EmailBlacklist[]
  total: number
  total_pages: number
}

export interface BlacklistWithCustomerInfo extends EmailBlacklist {
  customer_name: string | null
  customer_company: string | null
  customer_nit: string | null
}

export interface BlacklistWithCustomerResponse {
  data: BlacklistWithCustomerInfo[]
  total: number
  total_pages: number
}

/**
 * Fetch blacklist entries for a business with pagination
 */
export async function fetchBlacklistAction(params: {
  businessId: string
  page?: number
  pageSize?: number
  bounceType?: BounceType
  search?: string
}): Promise<BlacklistListResponse> {
  try {
    const { businessId, page = 1, pageSize = 20, bounceType, search } = params

    const result = await EmailBlacklistService.getBlacklist(businessId, {
      page,
      pageSize,
      bounceType,
      search,
    })

    const total_pages = Math.ceil(result.total / pageSize)

    return {
      data: result.data,
      total: result.total,
      total_pages,
    }
  } catch (error) {
    console.error('Error fetching blacklist:', error)
    return { data: [], total: 0, total_pages: 0 }
  }
}

/**
 * Check if an email is blacklisted
 */
export async function isEmailBlacklistedAction(
  businessId: string,
  email: string
): Promise<boolean> {
  try {
    return await EmailBlacklistService.isEmailBlacklisted(businessId, email)
  } catch (error) {
    console.error('Error checking blacklist:', error)
    return false
  }
}

/**
 * Remove an email from the blacklist
 */
export async function removeFromBlacklistAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    return await EmailBlacklistService.removeFromBlacklist(id)
  } catch (error: any) {
    console.error('Error removing from blacklist:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Remove multiple emails from the blacklist
 */
export async function removeManyFromBlacklistAction(
  ids: string[]
): Promise<{ success: boolean; deletedCount: number; error?: string }> {
  try {
    return await EmailBlacklistService.removeManyFromBlacklist(ids)
  } catch (error: any) {
    console.error('Error batch removing from blacklist:', error)
    return { success: false, deletedCount: 0, error: error.message }
  }
}

/**
 * Get blacklist statistics
 */
export async function getBlacklistStatsAction(businessId: string): Promise<{
  total: number
  hard_bounces: number
  soft_bounces: number
  complaints: number
  last_30_days: number
}> {
  try {
    return await EmailBlacklistService.getBlacklistStats(businessId)
  } catch (error) {
    console.error('Error fetching blacklist stats:', error)
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
 * Add an email to the blacklist manually
 */
export async function addToBlacklistAction(
  businessId: string,
  email: string,
  bounceType: BounceType = 'hard',
  bounceReason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await EmailBlacklistService.addToBlacklist(
      businessId,
      email,
      bounceType,
      bounceReason || 'Manual addition'
    )

    return {
      success: result.success,
      error: result.error,
    }
  } catch (error: any) {
    console.error('Error adding to blacklist:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Fetch blacklist entries with customer information
 * Joins with business_customers to show client details
 */
export async function getBlacklistWithCustomerInfoAction(params: {
  businessId: string
  page?: number
  pageSize?: number
  bounceType?: BounceType
  search?: string
}): Promise<BlacklistWithCustomerResponse> {
  try {
    const { businessId, page = 1, pageSize = 20, bounceType, search } = params

    const result = await EmailBlacklistService.getBlacklistWithCustomerInfo(businessId, {
      page,
      pageSize,
      bounceType,
      search,
    })

    const total_pages = Math.ceil(result.total / pageSize)

    return {
      data: result.data,
      total: result.total,
      total_pages,
    }
  } catch (error) {
    console.error('Error fetching blacklist with customer info:', error)
    return { data: [], total: 0, total_pages: 0 }
  }
}
