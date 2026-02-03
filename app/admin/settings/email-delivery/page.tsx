import { getServerSession } from 'next-auth'
import { AUTH_OPTIONS } from '@/const/auth'
import { BatchStrategyService } from '@/lib/services/collection/batch-strategy-service'
import EmailDeliveryClient from './email-delivery-client'

export default async function EmailDeliveryPage() {
  const session = await getServerSession(AUTH_OPTIONS)
  const businessId = (session?.user as any)?.business_id

  if (!businessId) {
    return <EmailDeliveryClient initialStrategies={[]} businessId="" />
  }

  const strategies = await BatchStrategyService.getBusinessStrategies(businessId)
  
  return <EmailDeliveryClient initialStrategies={strategies} businessId={businessId} />
}
