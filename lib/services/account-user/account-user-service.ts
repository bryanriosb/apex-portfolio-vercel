import {
  fetchAccountUsersAction,
  createAccountUserAction,
  updateAccountUserAction,
  deleteAccountUserAction,
  deleteAccountUsersAction,
} from '@/lib/actions/account-users'
import type {
  AccountUserInsert,
  AccountUserUpdate,
  AccountUserListResponse,
} from '@/lib/models/account-user/account-user'

/**
 * Servicio para gestionar usuarios de la aplicación (auth.users).
 * Consume server actions para comunicarse con Supabase Auth Admin.
 */
export default class AccountUserService {
  async fetchItems(params?: {
    page?: number
    page_size?: number
    search?: string
    role?: string | string[]
    business_account_id?: string
  }): Promise<AccountUserListResponse> {
    try {
      return await fetchAccountUsersAction(params)
    } catch (error) {
      console.error('Error fetching account users:', error)
      return { data: [], total: 0, total_pages: 0 }
    }
  }

  async createUser(
    data: AccountUserInsert
  ): Promise<{ success: boolean; error: string | null }> {
    return await createAccountUserAction(data)
  }

  async updateUser(
    id: string,
    data: AccountUserUpdate
  ): Promise<{ success: boolean; error: string | null }> {
    return await updateAccountUserAction(id, data)
  }

  async deleteUser(
    id: string
  ): Promise<{ success: boolean; error: string | null }> {
    return await deleteAccountUserAction(id)
  }

  async deleteUsers(
    ids: string[]
  ): Promise<{ success: boolean; deletedCount: number; error: string | null }> {
    return await deleteAccountUsersAction(ids)
  }
}
