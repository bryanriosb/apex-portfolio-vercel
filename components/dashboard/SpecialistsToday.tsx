'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { formatCurrency } from '@/lib/utils/currency'
import {
  fetchSpecialistsTodayAction,
  type SpecialistTodayStatus,
} from '@/lib/actions/dashboard'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Users, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SpecialistsTodayProps {
  businessId: string
}

function SpecialistRow({ specialist }: { specialist: SpecialistTodayStatus }) {
  const initials = `${specialist.first_name[0]}${
    specialist.last_name?.[0] || ''
  }`.toUpperCase()
  const completionRate =
    specialist.total_appointments > 0
      ? (specialist.completed_appointments / specialist.total_appointments) *
        100
      : 0

  return (
    <div className="flex items-center gap-2 sm:gap-3 py-1.5 sm:py-2">
      <Avatar className="h-7 w-7 sm:h-9 sm:w-9 shrink-0">
        <AvatarImage src={specialist.profile_picture_url || undefined} />
        <AvatarFallback className="bg-primary/10 text-primary text-[10px] sm:text-sm">
          {initials}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1 sm:gap-2">
          <span className="font-medium text-xs sm:text-sm truncate">
            {specialist.first_name}
          </span>
        </div>
        <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs text-muted-foreground">
          <span>
            {specialist.completed_appointments}/{specialist.total_appointments}
          </span>
          {specialist.next_appointment_time && (
            <>
              <span>•</span>
              <span className="flex items-center gap-0.5">
                <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                {format(new Date(specialist.next_appointment_time), 'HH:mm')}
              </span>
            </>
          )}
        </div>
        <Progress value={completionRate} className="h-1 mt-0.5 sm:mt-1" />
      </div>

      <div className="text-right shrink-0">
        <span className="font-semibold text-[10px] sm:text-sm">
          {formatCurrency(specialist.expected_revenue / 100)}
        </span>
      </div>
    </div>
  )
}

function SpecialistSkeleton() {
  return (
    <div className="flex items-center gap-3 py-2">
      <Skeleton className="h-9 w-9 rounded-full" />
      <div className="flex-1">
        <Skeleton className="h-4 w-28 mb-1" />
        <Skeleton className="h-3 w-36 mb-1" />
        <Skeleton className="h-1 w-full" />
      </div>
      <Skeleton className="h-5 w-16" />
    </div>
  )
}

export function SpecialistsToday({ businessId }: SpecialistsTodayProps) {
  const [loading, setLoading] = useState(true)
  const [specialists, setSpecialists] = useState<SpecialistTodayStatus[]>([])

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const data = await fetchSpecialistsTodayAction(businessId)
        setSpecialists(data)
      } catch (error) {
        console.error('Error fetching specialists today:', error)
      } finally {
        setLoading(false)
      }
    }

    if (businessId) {
      fetchData()
    }
  }, [businessId])

  const totalExpectedRevenue = specialists.reduce(
    (sum, s) => sum + s.expected_revenue,
    0
  )

  return (
    <Card className="border h-full flex flex-col">
      <CardHeader className="pb-2 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <Users className="h-4 w-4 shrink-0" />
            <span className="truncate">Equipo de Hoy</span>
          </CardTitle>
          {!loading && specialists.length > 0 && (
            <Badge
              variant="secondary"
              className="font-normal text-[10px] sm:text-xs shrink-0"
            >
              {formatCurrency(totalExpectedRevenue / 100)}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 pt-0">
        {loading ? (
          <div className="divide-y">
            {[...Array(2)].map((_, i) => (
              <SpecialistSkeleton key={i} />
            ))}
          </div>
        ) : specialists.length > 0 ? (
          <div className="divide-y">
            {specialists.slice(0, 4).map((specialist) => (
              <SpecialistRow key={specialist.id} specialist={specialist} />
            ))}
            {specialists.length > 4 && (
              <p className="text-[10px] sm:text-xs text-muted-foreground pt-2">
                +{specialists.length - 4} más
              </p>
            )}
          </div>
        ) : (
          <div className="py-4 sm:py-8 text-center h-full flex flex-col items-center justify-center">
            <Users className="h-8 w-8 sm:h-12 sm:w-12 mx-auto text-muted-foreground/30 mb-2 sm:mb-3" />
            <p className="text-muted-foreground text-xs sm:text-sm">
              Sin citas hoy
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
