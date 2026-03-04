import {
  getSettingByKeyAction,
  getTrialConfigAction,
  updateTrialConfigAction,
  checkAndUpdateExpiredTrialAction,
  startTrialForAccountAction,
  setCustomTrialDaysAction,
  getTrialInfoAction,
  type TrialCheckResult,
  type StartTrialResult,
} from '@/lib/actions/system-settings'
import type { SystemSetting, TrialConfig } from '@/lib/models/system-settings'

export default class SystemSettingsService {
  async getSettingByKey(key: string): Promise<SystemSetting | null> {
    try {
      return await getSettingByKeyAction(key)
    } catch (error) {
      console.error('Error fetching setting:', error)
      throw error
    }
  }

  async getTrialConfig(): Promise<TrialConfig> {
    try {
      return await getTrialConfigAction()
    } catch (error) {
      console.error('Error fetching trial config:', error)
      throw error
    }
  }

  async updateTrialConfig(config: Partial<TrialConfig>): Promise<{ success: boolean; error?: string }> {
    try {
      return await updateTrialConfigAction(config)
    } catch (error) {
      console.error('Error updating trial config:', error)
      throw error
    }
  }

  async checkAndUpdateExpiredTrial(businessAccountId: string): Promise<TrialCheckResult> {
    try {
      return await checkAndUpdateExpiredTrialAction(businessAccountId)
    } catch (error) {
      console.error('Error checking expired trial:', error)
      throw error
    }
  }

  async startTrialForAccount(
    businessAccountId: string,
    customTrialDays?: number
  ): Promise<StartTrialResult> {
    try {
      return await startTrialForAccountAction(businessAccountId, customTrialDays)
    } catch (error) {
      console.error('Error starting trial:', error)
      throw error
    }
  }

  async setCustomTrialDays(
    businessAccountId: string,
    customTrialDays: number | null
  ): Promise<{ success: boolean; error?: string }> {
    try {
      return await setCustomTrialDaysAction(businessAccountId, customTrialDays)
    } catch (error) {
      console.error('Error setting custom trial days:', error)
      throw error
    }
  }

  async getTrialInfo(businessAccountId: string): Promise<{
    isOnTrial: boolean
    trialEndsAt: string | null
    daysRemaining: number | null
    customTrialDays: number | null
  }> {
    try {
      return await getTrialInfoAction(businessAccountId)
    } catch (error) {
      console.error('Error getting trial info:', error)
      throw error
    }
  }
}
