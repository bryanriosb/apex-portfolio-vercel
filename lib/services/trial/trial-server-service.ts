import { getServerSession } from 'next-auth'
import { AUTH_OPTIONS } from '@/const/auth'
import { getTrialInfoAction } from '@/lib/actions/system-settings'

export interface TrialServerData {
  isOnTrial: boolean
  daysRemaining: number | null
  trialEndsAt: string | null
}

export async function getTrialDataFromServer(): Promise<TrialServerData | null> {
  try {
    const session = await getServerSession(AUTH_OPTIONS)
    const businessAccountId = (session?.user as any)?.business_account_id

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