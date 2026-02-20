'use server'

import {
  getRecordById,
  insertRecord,
  updateRecord,
  getSupabaseAdminClient,
} from '@/lib/actions/supabase'
import type {
  SystemSetting,
  SystemSettingInsert,
  SystemSettingUpdate,
  TrialConfig,
} from '@/lib/models/system-settings'
import { DEFAULT_TRIAL_CONFIG, SYSTEM_SETTING_KEYS } from '@/lib/models/system-settings'

export async function getSettingByKeyAction(key: string): Promise<SystemSetting | null> {
  try {
    const supabase = await getSupabaseAdminClient()
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .eq('key', key)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }

    return data as SystemSetting
  } catch (error) {
    console.error('Error fetching setting by key:', error)
    throw error
  }
}

export async function getTrialConfigAction(): Promise<TrialConfig> {
  try {
    const setting = await getSettingByKeyAction(SYSTEM_SETTING_KEYS.TRIAL_CONFIG)
    if (!setting) {
      return DEFAULT_TRIAL_CONFIG
    }
    return setting.value as unknown as TrialConfig
  } catch (error) {
    console.error('Error fetching trial config:', error)
    return DEFAULT_TRIAL_CONFIG
  }
}

export async function updateTrialConfigAction(
  config: Partial<TrialConfig>
): Promise<{ success: boolean; error?: string }> {
  try {
    const currentConfig = await getTrialConfigAction()
    const newConfig = { ...currentConfig, ...config }

    const supabase = await getSupabaseAdminClient()
    const { error } = await supabase
      .from('system_settings')
      .upsert({
        key: SYSTEM_SETTING_KEYS.TRIAL_CONFIG,
        value: newConfig,
        description: 'Configuración del período de prueba para nuevas cuentas',
      }, { onConflict: 'key' })

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error('Error updating trial config:', error)
    return { success: false, error: 'Error al actualizar la configuración' }
  }
}

export async function createSettingAction(
  data: SystemSettingInsert
): Promise<{ success: boolean; data?: SystemSetting; error?: string }> {
  try {
    const supabase = await getSupabaseAdminClient()
    const { data: existing } = await supabase
      .from('system_settings')
      .select('id')
      .eq('key', data.key)
      .single()

    if (existing) {
      return { success: false, error: 'La configuración ya existe' }
    }

    const result = await insertRecord<SystemSetting>('system_settings', data)
    return { success: true, data: result ?? undefined }
  } catch (error) {
    console.error('Error creating setting:', error)
    return { success: false, error: 'Error al crear la configuración' }
  }
}

export async function updateSettingAction(
  id: string,
  data: SystemSettingUpdate
): Promise<{ success: boolean; data?: SystemSetting; error?: string }> {
  try {
    const result = await updateRecord<SystemSetting>('system_settings', id, data)
    return { success: true, data: result ?? undefined }
  } catch (error) {
    console.error('Error updating setting:', error)
    return { success: false, error: 'Error al actualizar la configuración' }
  }
}

export interface TrialCheckResult {
  wasExpired: boolean
  newPlanId: string | null
  newPlanCode: string | null
  newStatus: string | null
}

export async function checkAndUpdateExpiredTrialAction(
  businessAccountId: string
): Promise<TrialCheckResult> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { data, error } = await supabase.rpc('check_and_update_expired_trial', {
      p_business_account_id: businessAccountId,
    })

    if (error) throw error

    if (data && data.length > 0) {
      const result = data[0]
      return {
        wasExpired: result.was_expired,
        newPlanId: result.new_plan_id,
        newPlanCode: result.new_plan_code,
        newStatus: result.new_status,
      }
    }

    return {
      wasExpired: false,
      newPlanId: null,
      newPlanCode: null,
      newStatus: null,
    }
  } catch (error) {
    console.error('Error checking expired trial:', error)
    return {
      wasExpired: false,
      newPlanId: null,
      newPlanCode: null,
      newStatus: null,
    }
  }
}

export interface StartTrialResult {
  success: boolean
  trialEndsAt: string | null
  planId: string | null
  error?: string
}

export async function startTrialForAccountAction(
  businessAccountId: string,
  customTrialDays?: number
): Promise<StartTrialResult> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { data, error } = await supabase.rpc('start_trial_for_account', {
      p_business_account_id: businessAccountId,
      p_custom_trial_days: customTrialDays ?? null,
    })

    if (error) throw error

    if (data && data.length > 0) {
      const result = data[0]
      return {
        success: result.success,
        trialEndsAt: result.trial_ends_at,
        planId: result.plan_id,
      }
    }

    return {
      success: false,
      trialEndsAt: null,
      planId: null,
      error: 'No se pudo iniciar el período de prueba',
    }
  } catch (error) {
    console.error('Error starting trial:', error)
    return {
      success: false,
      trialEndsAt: null,
      planId: null,
      error: 'Error al iniciar el período de prueba',
    }
  }
}

export async function setCustomTrialDaysAction(
  businessAccountId: string,
  customTrialDays: number | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { error } = await supabase
      .from('business_accounts')
      .update({ custom_trial_days: customTrialDays })
      .eq('id', businessAccountId)

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error('Error setting custom trial days:', error)
    return { success: false, error: 'Error al configurar días de prueba personalizados' }
  }
}

export async function getTrialInfoAction(businessAccountId: string): Promise<{
  isOnTrial: boolean
  trialEndsAt: string | null
  daysRemaining: number | null
  customTrialDays: number | null
}> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { data, error } = await supabase
      .from('business_accounts')
      .select('status, trial_ends_at, custom_trial_days')
      .eq('id', businessAccountId)
      .single()

    if (error) throw error

    const isOnTrial = data.status === 'trial' && data.trial_ends_at !== null
    let daysRemaining: number | null = null

    if (isOnTrial && data.trial_ends_at) {
      const endDate = new Date(data.trial_ends_at)
      const now = new Date()
      daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    }

    return {
      isOnTrial,
      trialEndsAt: data.trial_ends_at,
      daysRemaining,
      customTrialDays: data.custom_trial_days,
    }
  } catch (error) {
    console.error('Error getting trial info:', error)
    return {
      isOnTrial: false,
      trialEndsAt: null,
      daysRemaining: null,
      customTrialDays: null,
    }
  }
}
