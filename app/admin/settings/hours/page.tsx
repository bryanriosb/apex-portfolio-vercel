'use client'

import { useCurrentUser } from '@/hooks/use-current-user'
import { useActiveBusinessHydrated } from '@/lib/store/active-business-store'
import { OperatingHoursCard } from '@/components/scheduler/OperatingHoursCard'
import { SpecialHoursSection } from '@/components/scheduler/SpecialHoursSection'
import { Loader2 } from 'lucide-react'

export default function SchedulerPage() {
  const { user, isLoading: userLoading, role } = useCurrentUser()
  const { activeBusiness, hydrated } = useActiveBusinessHydrated()

  const isBusinessAdmin = role === 'business_admin'
  const businessId = isBusinessAdmin
    ? activeBusiness?.id || null
    : user?.business_id || null

  const isLoading = userLoading || !hydrated

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 w-full overflow-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Horarios</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Configura los horarios de atención de tu negocio
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <OperatingHoursCard businessId={businessId} />
        <SpecialHoursSection businessId={businessId} />
      </div>
    </div>
  )
}
