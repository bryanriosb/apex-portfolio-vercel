import {
  fetchBusinessAccountsAction,
  createBusinessAccountAction,
  updateBusinessAccountAction,
  deleteBusinessAccountAction,
  deleteBusinessAccountsAction,
  getBusinessAccountByIdAction,
  getUserBusinessAccountsAction,
  isAccountAdminAction,
  canCreateBusinessInAccountAction,
} from '@/lib/actions/business-account'
import type {
  BusinessAccount,
  BusinessAccountInsert,
  BusinessAccountUpdate,
} from '@/lib/models/business-account/business-account'
import type { BusinessAccountListResponse } from '@/lib/actions/business-account'

export default class BusinessAccountService {
  async fetchItems(params?: {
    page?: number
    page_size?: number
    company_name?: string[]
  }): Promise<BusinessAccountListResponse> {
    try {
      return await fetchBusinessAccountsAction(params)
    } catch (error) {
      console.error('Error fetching business accounts:', error)
      return {
        data: [],
        total: 0,
        total_pages: 0,
      }
    }
  }
  async createAccount(
    data: BusinessAccountInsert
  ): Promise<{ success: boolean; data?: BusinessAccount; error?: string }> {
    try {
      const result = await createBusinessAccountAction(data)
      if (result.error) {
        return { success: false, error: result.error }
      }
      return { success: true, data: result.data! }
    } catch (error: any) {
      console.error('Error creating business account:', error)
      return { success: false, error: error.message }
    }
  }

  async updateAccount(
    id: string,
    data: BusinessAccountUpdate
  ): Promise<{ success: boolean; data?: BusinessAccount; error?: string }> {
    try {
      const result = await updateBusinessAccountAction(id, data)
      if (result.error) {
        return { success: false, error: result.error }
      }
      return { success: true, data: result.data! }
    } catch (error: any) {
      console.error('Error updating business account:', error)
      return { success: false, error: error.message }
    }
  }

  async deleteAccount(
    id: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await deleteBusinessAccountAction(id)
      if (result.error) {
        return { success: false, error: result.error }
      }
      return { success: true }
    } catch (error: any) {
      console.error('Error deleting business account:', error)
      return { success: false, error: error.message }
    }
  }

  async deleteAccounts(
    ids: string[]
  ): Promise<{ success: boolean; deletedCount: number; error?: string }> {
    try {
      const result = await deleteBusinessAccountsAction(ids)
      if (result.error) {
        return { success: false, deletedCount: 0, error: result.error }
      }
      return { success: true, deletedCount: result.deletedCount }
    } catch (error: any) {
      console.error('Error batch deleting business accounts:', error)
      return { success: false, deletedCount: 0, error: error.message }
    }
  }

  async getAccountById(id: string): Promise<BusinessAccount | null> {
    try {
      const result = await getBusinessAccountByIdAction(id)
      return result.data
    } catch (error) {
      console.error('Error fetching business account:', error)
      return null
    }
  }

  async getUserAccounts(userId: string): Promise<BusinessAccount[]> {
    try {
      const result = await getUserBusinessAccountsAction(userId)
      return result.data || []
    } catch (error) {
      console.error('Error fetching user business accounts:', error)
      return []
    }
  }

  async isAccountAdmin(userId: string, accountId: string): Promise<boolean> {
    try {
      const result = await isAccountAdminAction(userId, accountId)
      return result.isAdmin
    } catch (error) {
      console.error('Error checking account admin status:', error)
      return false
    }
  }

  async canCreateBusiness(accountId: string): Promise<boolean> {
    try {
      const result = await canCreateBusinessInAccountAction(accountId)
      return result.canCreate
    } catch (error) {
      console.error('Error checking business creation limit:', error)
      return false
    }
  }

  async createAccountWithOwner(
    accountData: BusinessAccountInsert
  ): Promise<{ success: boolean; data?: BusinessAccount; error?: string }> {
    try {
      const accountResult = await this.createAccount(accountData)
      if (!accountResult.success || !accountResult.data) {
        return accountResult
      }

      return { success: true, data: accountResult.data }
    } catch (error: any) {
      console.error('Error creating account with owner:', error)
      return { success: false, error: error.message }
    }
  }
}
