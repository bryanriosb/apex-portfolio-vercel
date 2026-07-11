import { getTrialInfoAction } from '@/lib/actions/system-settings'

export interface TrialServerData {
  isOnTrial: boolean
  daysRemaining: number | null
  trialEndsAt: string | null
}

export async function getTrialDataFromServer(businessAccountId: string | null): Promise<TrialServerData | null> {
  try {
    if (!businessAccountId) {
      return null
    }

    const trialInfo = await getTrialInfoAction(businessAccountId)

    return {
      isOnTrial: trialInfo.isOnTrial,
      daysRemaining: trialInfo.daysRemaining,
      trialEndsAt: trialInfo.trialEndsAt,
    }
  } catch (error) {
    console.error('Error getting trial data from server:', error)
    return null
  }
}