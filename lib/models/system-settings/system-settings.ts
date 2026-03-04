export interface SystemSetting {
  id: string
  key: string
  value: Record<string, unknown>
  description: string | null
  created_at: string
  updated_at: string
}

export interface TrialConfig {
  default_trial_days: number
  post_trial_plan_code: string
  trial_plan_code: string
  allow_trial_extension: boolean
  max_trial_extensions: number
  extension_days: number
}

export interface SystemSettingInsert {
  key: string
  value: Record<string, unknown>
  description?: string | null
}

export interface SystemSettingUpdate {
  value?: Record<string, unknown>
  description?: string | null
}

export const DEFAULT_TRIAL_CONFIG: TrialConfig = {
  default_trial_days: 14,
  post_trial_plan_code: 'free',
  trial_plan_code: 'trial',
  allow_trial_extension: true,
  max_trial_extensions: 1,
  extension_days: 7,
}

export const SYSTEM_SETTING_KEYS = {
  TRIAL_CONFIG: 'trial_config',
} as const

export type SystemSettingKey = (typeof SYSTEM_SETTING_KEYS)[keyof typeof SYSTEM_SETTING_KEYS]
