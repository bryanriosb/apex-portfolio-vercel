'use client'

import {
  Calendar,
  dateFnsLocalizer,
  Event,
  Components,
  View,
  NavigateAction,
} from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { es } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const locales = {
  es: es,
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
})

interface BigCalendarProps {
  events: Event[]
  onSelectEvent?: (event: Event) => void
  onSelectSlot?: (slotInfo: { start: Date; end: Date }) => void
  onNavigate?: (date: Date) => void
  onView?: (view: string) => void
  onDrillDown?: (date: Date) => void
  defaultView?: 'month' | 'week' | 'day'
  defaultDate?: Date
}

const CustomToolbar = (toolbar: any) => {
  const goToBack = () => {
    toolbar.onNavigate('PREV')
  }

  const goToNext = () => {
    toolbar.onNavigate('NEXT')
  }

  const label = () => {
    const date = toolbar.date
    return (
      format(date, 'MMMM yyyy', { locale: es }).charAt(0).toUpperCase() +
      format(date, 'MMMM yyyy', { locale: es }).slice(1)
    )
  }

  return (
    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2 mb-4">
      <div className="flex items-center justify-between md:justify-start gap-2">
        <Button variant="outline" size="sm" onClick={goToBack} className="h-9">
          <ChevronLeft className="h-4 w-4 md:mr-1" />
          <span className="hidden md:inline">Anterior</span>
        </Button>

        <p className="font-semibold text-sm md:text-base min-w-[180px] text-center">
          {label()}
        </p>

        <Button variant="outline" size="sm" onClick={goToNext} className="h-9">
          <span className="hidden md:inline">Siguiente</span>
          <ChevronRight className="h-4 w-4 md:ml-1" />
        </Button>
      </div>

      <ButtonGroup>
        <Button
          variant={toolbar.view === 'day' ? 'default' : 'outline'}
          size="sm"
          onClick={() => toolbar.onView('day')}
          title="Vista por día"
        >
          Día
        </Button>
        <Button
          variant={toolbar.view === 'week' ? 'default' : 'outline'}
          size="sm"
          onClick={() => toolbar.onView('week')}
          title="Vista por semana"
        >
          Semana
        </Button>
        <Button
          variant={toolbar.view === 'month' ? 'default' : 'outline'}
          size="sm"
          onClick={() => toolbar.onView('month')}
          title="Vista por mes"
        >
          Mes
        </Button>
      </ButtonGroup>
    </div>
  )
}

const CustomDateHeader = ({ date, label, onDrillDown }: any) => {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <button
            className="w-full h-full text-center font-semibold hover:text-primary hover:bg-primary/10 hover:border hover:border-primary transition-all rounded-sm py-1 border border-transparent"
            onClick={() => onDrillDown && onDrillDown(date)}
          >
            {label}
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Ver todas las citas del día</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

const CustomEvent = ({ event }: { event: Event }) => {
  const appointment = event.resource as any

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Get unique specialists from appointment_services
  const uniqueSpecialists =
    appointment?.appointment_services
      ?.filter((as: any) => as.specialist)
      .reduce((acc: any[], as: any) => {
        if (!acc.find((s: any) => s.id === as.specialist.id)) {
          acc.push(as.specialist)
        }
        return acc
      }, []) || []

  // Fallback to main specialist
  const specialists =
    uniqueSpecialists.length > 0
      ? uniqueSpecialists
      : appointment?.specialist
      ? [appointment.specialist]
      : []

  const isMultiple = specialists.length > 1
  const totalServices = appointment?.appointment_services?.length || 0

  return (
    <div className="flex gap-1.5 md:gap-2 h-full overflow-hidden p-0.5">
      <div className="flex-shrink-0">
        {isMultiple ? (
          <div className="flex -space-x-1.5">
            {specialists.slice(0, 3).map((specialist: any, idx: number) => (
              <div
                key={specialist.id}
                className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-white/30 ring-1 ring-white/50 flex items-center justify-center text-[0.5rem] md:text-[0.55rem] font-semibold overflow-hidden"
                style={{ zIndex: 3 - idx }}
              >
                {specialist.profile_picture_url ? (
                  <img
                    src={specialist.profile_picture_url}
                    alt={specialist.first_name?.[0] || 'E'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{specialist.first_name?.[0] || 'E'}</span>
                )}
              </div>
            ))}
            {specialists.length > 3 && (
              <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-white/40 ring-1 ring-white/50 flex items-center justify-center text-[0.45rem] md:text-[0.5rem] font-medium">
                +{specialists.length - 3}
              </div>
            )}
          </div>
        ) : (
          <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-white/20 flex items-center justify-center text-[0.55rem] md:text-[0.6rem] font-semibold overflow-hidden">
            {specialists[0]?.profile_picture_url ? (
              <img
                src={specialists[0].profile_picture_url}
                alt={specialists[0]?.first_name?.[0] || 'E'}
                className="w-full h-full object-cover"
              />
            ) : (
              <span>{specialists[0]?.first_name?.[0] || 'E'}</span>
            )}
          </div>
        )}
      </div>
      <div className="flex-1 flex flex-col gap-0.5 min-w-0">
        <div className="font-semibold truncate text-[0.65rem] md:text-xs leading-tight">
          {isMultiple
            ? specialists.map((s: any) => s.first_name).join(', ')
            : specialists[0]?.first_name || 'Especialista'}
        </div>
        <div className="flex items-center justify-between gap-1">
          <div className="truncate text-[0.6rem] md:text-[0.7rem] leading-tight opacity-90">
            {formatTime(event.start as Date)}
          </div>
          {totalServices > 0 && (
            <div className="hidden md:flex flex-shrink-0 text-[0.65rem] leading-tight opacity-75 font-medium">
              {totalServices}/{totalServices}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function BigCalendar({
  events,
  onSelectEvent,
  onSelectSlot,
  onNavigate,
  onView,
  onDrillDown,
  defaultView = 'month',
  defaultDate = new Date(),
}: BigCalendarProps) {
  const eventStyleGetter = (event: Event) => {
    const appointment = event.resource as any
    let backgroundColor = '#a3b4f7'
    let textColor = '#1e293b'
    let borderColor = 'transparent'

    if (appointment?.status === 'CANCELLED') {
      backgroundColor = '#e2e8f0'
      textColor = '#475569'
      borderColor = 'transparent'
    } else if (appointment?.status === 'CONFIRMED') {
      backgroundColor = '#a3b4f7'
      textColor = '#1e293b'
      borderColor = 'transparent'
    } else if (appointment?.status === 'COMPLETED') {
      backgroundColor = '#86efac'
      textColor = '#1e293b'
      borderColor = 'transparent'
    } else if (appointment?.status === 'PENDING') {
      backgroundColor = '#fde68a'
      textColor = '#1e293b'
      borderColor = 'transparent'
    } else if (appointment?.status === 'NO_SHOW') {
      backgroundColor = '#c4b5fd'
      textColor = '#1e293b'
      borderColor = 'transparent'
    }

    return {
      style: {
        backgroundColor,
        color: textColor,
        borderColor,
        borderWidth: '0px',
        borderStyle: 'solid',
        borderRadius: '8px',
        padding: '6px',
        fontSize: '0.875rem',
        fontWeight: '500',
        display: 'block',
        overflow: 'hidden',
        boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      },
    }
  }

  const components: Components<Event> = {
    event: CustomEvent,
    toolbar: CustomToolbar,
    month: {
      dateHeader: (props: any) => (
        <CustomDateHeader {...props} onDrillDown={onDrillDown} />
      ),
    },
  }

  return (
    <div className="h-[calc(100vh-12rem)] w-full [&_.rbc-event]:!p-1 [&_.rbc-event]:min-h-[2.5rem] [&_.rbc-event]:md:min-h-[3rem] [&_.rbc-show-more]:!text-primary [&_.rbc-show-more]:!font-bold [&_.rbc-show-more]:text-xs [&_.rbc-show-more]:md:text-sm [&_.rbc-show-more:hover]:!underline [&_.rbc-date-cell]:cursor-pointer [&_.rbc-date-cell:hover]:bg-accent [&_.rbc-date-cell]:transition-colors [&_.rbc-date-cell]:rounded-sm [&_.rbc-button-link]:font-semibold [&_.rbc-button-link]:text-xs [&_.rbc-button-link]:md:text-sm [&_.rbc-button-link:hover]:text-primary [&_.rbc-button-link]:transition-colors [&_.rbc-header]:text-xs [&_.rbc-header]:md:text-sm [&_.rbc-header]:font-semibold [&_.rbc-header]:py-2 [&_.rbc-month-view]:text-xs [&_.rbc-month-view]:md:text-sm [&_.rbc-time-header-content]:text-xs [&_.rbc-time-header-content]:md:text-sm [&_.rbc-time-slot]:text-xs [&_.rbc-time-slot]:md:text-sm [&_.rbc-time-content]:overflow-x-auto [&_.rbc-off-range]:!bg-[#F5F5F5] [&_.rbc-off-range_.rbc-button-link]:!text-[#F5F5F5] [&_.rbc-today]:!bg-primary/10 [&_.rbc-today_.rbc-button-link]:!text-primary [&_.rbc-today_.rbc-button-link]:!font-bold">
      <Calendar
        className="w-[calc(100vw-2.5rem)] md:w-full"
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        culture="es"
        defaultView={defaultView}
        defaultDate={defaultDate}
        onSelectEvent={onSelectEvent}
        onSelectSlot={onSelectSlot}
        onNavigate={onNavigate}
        onView={onView}
        onDrillDown={(date) => {
          if (onDrillDown) {
            onDrillDown(date)
          }
        }}
        selectable
        eventPropGetter={eventStyleGetter}
        components={components}
        messages={{
          date: 'Fecha',
          time: 'Hora',
          event: 'Cita',
          noEventsInRange: 'No hay citas en este rango',
          showMore: (total) => `+ ${total}`,
        }}
      />
    </div>
  )
}
