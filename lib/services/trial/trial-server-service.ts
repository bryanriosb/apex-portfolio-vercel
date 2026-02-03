import { getServerSession } from 'next-auth'
import { AUTH_OPTIONS } from '@/const/auth'
import { getTrialInfoAction } from '@/lib/actions/system-settings'
import { getBusinessAccountByIdAction } from '@/lib/actions/business-account'

export interface TrialServerData {
  isOnTrial: boolean
  daysRemaining: number | null
  trialEndsAt: string | null
  tutorialStarted: boolean
}

export async function getTrialDataFromServer(): Promise<TrialServerData | null> {
  try {
    const session = await getServerSession(AUTH_OPTIONS)
    const businessAccountId = (session?.user as any)?.business_account_id

    if (!businessAccountId) {
      return null
    }

    // Get trial info
    const trialInfo = await getTrialInfoAction(businessAccountId)
    
    // Get business account for tutorial info
    const businessAccountResult = await getBusinessAccountByIdAction(businessAccountId)

    const result = {
      isOnTrial: trialInfo.isOnTrial,
      daysRemaining: trialInfo.daysRemaining,
      trialEndsAt: trialInfo.trialEndsAt,
      tutorialStarted: businessAccountResult.data?.tutorial_started || false,
    }

    return result
  } catch (error) {
    console.error('Error getting trial data from server:', error)
    return null
  }
}