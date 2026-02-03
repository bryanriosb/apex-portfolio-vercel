'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatCurrency } from '@/lib/utils/currency'
import {
  fetchUpcomingAppointmentsAction,
  type UpcomingAppointment,
} from '@/lib/actions/dashboard'
import { format, differenceInMinutes } from 'date-fns'
import { es } from 'date-fns/locale'
import { Clock, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

interface UpcomingAppointmentsProps {
  businessId: string
}

function AppointmentItem({
  appointment,
}: {
  appointment: UpcomingAppointment
}) {
  const now = new Date()
  const startTime = new Date(appointment.start_time)
  const minutesUntil = differenceInMinutes(startTime, now)

  const isImminent = minutesUntil <= 60 && minutesUntil > 0
  const isNow = minutesUntil <= 0 && minutesUntil > -60

  const specialistInitials = `${appointment.specialist.first_name[0]}${
    appointment.specialist.last_name?.[0] || ''
  }`.toUpperCase()

  const statusColors = {
    PENDING:
      'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    CONFIRMED:
      'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  }

  return (
    <div
      className={cn(
        'flex items-start gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg transition-colors',
        isNow && 'bg-primary/5 border border-primary/20',
        isImminent && !isNow && 'bg-amber-50/50 dark:bg-amber-950/20'
      )}
    >
      <div className="flex flex-col items-center min-w-[40px] sm:min-w-[50px]">
        <span
          className={cn(
            'text-base sm:text-lg font-bold',
            isNow && 'text-primary',
            isImminent && !isNow && 'text-amber-600'
          )}
        >
          {format(startTime, 'HH:mm')}
        </span>
        {isNow && (
          <Badge
            variant="default"
            className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0"
          >
            AHORA
          </Badge>
        )}
        {isImminent && !isNow && (
          <span className="text-[9px] sm:text-[10px] text-amber-600 font-medium">
            {minutesUntil}m
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
          <span className="font-medium text-sm truncate max-w-[120px] sm:max-w-none">
            {appointment.customer_name}
          </span>
          <Badge
            variant="secondary"
            className={cn(
              'text-[9px] sm:text-[10px] px-1 sm:px-1.5',
              statusColors[appointment.status as keyof typeof statusColors]
            )}
          >
            {appointment.status === 'PENDING' ? 'Pend.' : 'Conf.'}
          </Badge>
        </div>
        <div className="text-xs sm:text-sm text-muted-foreground truncate">
          {appointment.services.map((s) => s.name).join(', ')}
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 mt-1">
          <Avatar className="h-4 w-4 sm:h-5 sm:w-5">
            <AvatarImage
              src={appointment.specialist.profile_picture_url || undefined}
            />
            <AvatarFallback className="text-[8px] sm:text-[10px] bg-primary/10 text-primary">
              {specialistInitials}
            </AvatarFallback>
          </Avatar>
          <span className="text-[10px] sm:text-xs text-muted-foreground">
            {appointment.specialist.first_name}
          </span>
        </div>
      </div>

      <div className="text-right shrink-0">
        <span className="font-semibold text-xs sm:text-sm">
          {formatCurrency(appointment.total_price_cents / 100)}
        </span>
      </div>
    </div>
  )
}

function AppointmentSkeleton() {
  return (
    <div className="flex items-start gap-3 p-3">
      <Skeleton className="h-10 w-[50px]" />
      <div className="flex-1">
        <Skeleton className="h-5 w-32 mb-1" />
        <Skeleton className="h-4 w-48 mb-1" />
        <Skeleton className="h-4 w-24" />
      </div>
      <Skeleton className="h-5 w-16" />
    </div>
  )
}

export function UpcomingAppointments({
  businessId,
}: UpcomingAppointmentsProps) {
  const [loading, setLoading] = useState(true)
  const [appointments, setAppointments] = useState<UpcomingAppointment[]>([])

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const data = await fetchUpcomingAppointmentsAction(businessId)
        setAppointments(data)
      } catch (error) {
        console.error('Error fetching upcoming appointments:', error)
      } finally {
        setLoading(false)
      }
    }

    if (businessId) {
      fetchData()
    }

    // Refresh every 5 minutes
    const interval = setInterval(fetchData, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [businessId])

  return (
    <Card className="border h-full flex flex-col">
      <CardHeader className="pb-2 shrink-0">
        <CardTitle className="text-sm sm:text-base flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Próximas Citas
        </CardTitle>
        <p className="text-[10px] sm:text-xs text-muted-foreground">
          Citas restantes del día · Se destacan las próximas
        </p>
      </CardHeader>
      <CardContent className="p-0 flex-1 min-h-0">
        <ScrollArea className="h-full max-h-[300px] sm:max-h-[400px] lg:max-h-none">
          <div className="px-3 sm:px-4 pb-4 space-y-1">
            {loading ? (
              [...Array(4)].map((_, i) => <AppointmentSkeleton key={i} />)
            ) : appointments.length > 0 ? (
              appointments.map((apt) => (
                <AppointmentItem key={apt.id} appointment={apt} />
              ))
            ) : (
              <div className="py-8 sm:py-12 text-center">
                <Calendar className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">
                  No hay más citas programadas para hoy
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
