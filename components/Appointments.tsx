'use client'

import { useState, useEffect, useMemo } from 'react'
import BigCalendar from './BigCalendar'
import MobileAppointmentsList from './appointments/MobileAppointmentsList'
import AppointmentsTableView from './appointments/AppointmentsTableView'
import { Event } from 'react-big-calendar'
import { useCurrentUser } from '@/hooks/use-current-user'
import { useActiveBusinessStore } from '@/lib/store/active-business-store'
import AppointmentService from '@/lib/services/appointment/appointment-service'
import type {
  Appointment,
  AppointmentWithDetails,
} from '@/lib/models/appointment/appointment'
import { USER_ROLES } from '@/const/roles'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { Plus, Calendar, List, Table } from 'lucide-react'
import AppointmentDetailsModal from './appointments/AppointmentDetailsModal'
import AppointmentFormModal from './appointments/AppointmentFormModal'
import DayAppointmentsModal from './appointments/DayAppointmentsModal'
import InvoiceDetailModal from './invoices/InvoiceDetailModal'
import Loading from '@/components/ui/loading'
import { getBusinessByIdAction } from '@/lib/actions/business'
import { fetchSpecialistsAction } from '@/lib/actions/specialist'
import type { Business } from '@/lib/models/business/business'
import type { Invoice } from '@/lib/models/invoice/invoice'
import type { Specialist } from '@/lib/models/specialist/specialist'

type ViewMode = 'day' | 'week' | 'month'
type DisplayMode = 'calendar' | 'list' | 'table'

export default function Appointments() {
  const [events, setEvents] = useState<Event[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [displayMode, setDisplayMode] = useState<DisplayMode>('calendar')
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    return now
  })
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<
    string | null
  >(null)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [isDayModalOpen, setIsDayModalOpen] = useState(false)
  const [selectedDayDate, setSelectedDayDate] = useState<Date | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<{
    start: Date
    end: Date
  } | null>(null)
  const [allAppointments, setAllAppointments] = useState<any[]>([])
  const [appointmentToEdit, setAppointmentToEdit] =
    useState<AppointmentWithDetails | null>(null)
  const [businessData, setBusinessData] = useState<Business | null>(null)
  const [invoiceToView, setInvoiceToView] = useState<Invoice | null>(null)
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false)
  const [specialists, setSpecialists] = useState<Specialist[]>([])
  const { user, role } = useCurrentUser()
  const { activeBusiness } = useActiveBusinessStore()
  const appointmentService = new AppointmentService()

  const isCompanyAdmin = role === USER_ROLES.COMPANY_ADMIN
  const activeBusinessId = activeBusiness?.id

  useEffect(() => {
    async function loadBusinessData() {
      if (!activeBusinessId) {
        setBusinessData(null)
        return
      }
      const business = await getBusinessByIdAction(activeBusinessId)
      setBusinessData(business)
    }
    loadBusinessData()
  }, [activeBusinessId])

  useEffect(() => {
    async function loadSpecialists() {
      if (!activeBusinessId && !isCompanyAdmin) return
      const params =
        !isCompanyAdmin && activeBusinessId
          ? { business_id: activeBusinessId }
          : undefined
      const response = await fetchSpecialistsAction(params)
      setSpecialists(response.data)
    }
    loadSpecialists()
  }, [activeBusinessId, isCompanyAdmin])

  const dateRange = useMemo(() => {
    const start = new Date(currentDate)
    const end = new Date(currentDate)

    switch (viewMode) {
      case 'day':
        start.setHours(0, 0, 0, 0)
        end.setHours(23, 59, 59, 999)
        break
      case 'week':
        const dayOfWeek = start.getDay()
        start.setDate(start.getDate() - dayOfWeek)
        start.setHours(0, 0, 0, 0)
        end.setDate(start.getDate() + 6)
        end.setHours(23, 59, 59, 999)
        break
      case 'month':
        start.setDate(1)
        start.setHours(0, 0, 0, 0)
        // Obtener el último día del mes actual
        const lastDayOfMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0)
        end.setTime(lastDayOfMonth.getTime())
        end.setHours(23, 59, 59, 999)
        break
    }

    return { start, end }
  }, [currentDate, viewMode])

  useEffect(() => {
    if (!user || !role) return
    if (!isCompanyAdmin && !activeBusinessId) return

    let isMounted = true

    const fetchAppointments = async () => {
      try {
        setIsLoading(true)

        const params: any = {
          start_date: dateRange.start.toISOString(),
          end_date: dateRange.end.toISOString(),
          // Eliminar paginación para vista de calendario
          page_size: 1000, // Suficientemente grande para cargar todas las citas del mes
        }

        if (!isCompanyAdmin && activeBusinessId) {
          params.business_id = activeBusinessId
        }

        const response = await appointmentService.fetchItems(params)

        if (!isMounted) return

        setAllAppointments(response.data)

        const formattedEvents: Event[] = response.data.map(
          (appointment: any) => {
            const startTime = new Date(appointment.start_time)
            const endTime = new Date(appointment.end_time)

            return {
              title: '',
              start: startTime,
              end: endTime,
              resource: appointment,
            }
          }
        )

        setEvents(formattedEvents)
      } catch (error) {
        console.error('Error fetching appointments:', error)
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    fetchAppointments()

    return () => {
      isMounted = false
    }
  }, [role, isCompanyAdmin, activeBusinessId, viewMode, currentDate])

  const handleSelectEvent = (event: Event) => {
    const appointment = event.resource as Appointment
    setSelectedAppointmentId(appointment.id)
    setIsDetailsModalOpen(true)
  }

  const handleSelectSlot = (_slotInfo: { start: Date; end: Date }) => {
    // Deshabilitado: no hacer nada al seleccionar un slot vacío
  }

  const handleCreateAppointment = () => {
    setAppointmentToEdit(null)
    setSelectedSlot(null)
    setIsFormModalOpen(true)
  }

  const handleEditAppointment = (appointment: AppointmentWithDetails) => {
    setAppointmentToEdit(appointment)
    setIsFormModalOpen(true)
  }

  const handleCancelAppointment = async (appointmentId: string) => {
    try {
      await appointmentService.updateItem({
        id: appointmentId,
        status: 'CANCELLED',
      })
      handleAppointmentSuccess()
      setIsDetailsModalOpen(false)
    } catch (error) {
      console.error('Error cancelling appointment:', error)
    }
  }

  const handleNavigate = (date: Date) => {
    setCurrentDate(date)
  }

  const handleViewChange = (view: string) => {
    setViewMode(view as ViewMode)
  }

  const handleDrillDown = (date: Date) => {
    setSelectedDayDate(date)
    setIsDayModalOpen(true)
  }

  const handleDayAppointmentSelect = (appointmentId: string) => {
    setSelectedAppointmentId(appointmentId)
    setIsDetailsModalOpen(true)
  }

  const getDayAppointments = (date: Date) => {
    if (!date) return []
    const dayStart = new Date(date)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(date)
    dayEnd.setHours(23, 59, 59, 999)

    return allAppointments.filter((appointment: any) => {
      const appointmentDate = new Date(appointment.start_time)
      return appointmentDate >= dayStart && appointmentDate <= dayEnd
    })
  }

  const handleViewInvoice = (invoice: Invoice) => {
    setInvoiceToView(invoice)
    setIsInvoiceModalOpen(true)
  }

  const handleAppointmentSuccess = () => {
    const fetchAppointments = async () => {
      try {
        const params: any = {
          start_date: dateRange.start.toISOString(),
          end_date: dateRange.end.toISOString(),
        }

        if (!isCompanyAdmin && activeBusinessId) {
          params.business_id = activeBusinessId
        }

        const response = await appointmentService.fetchItems(params)

        setAllAppointments(response.data)

        const formattedEvents: Event[] = response.data.map(
          (appointment: any) => {
            const startTime = new Date(appointment.start_time)
            const endTime = new Date(appointment.end_time)

            return {
              title: '',
              start: startTime,
              end: endTime,
              resource: appointment,
            }
          }
        )

        setEvents(formattedEvents)
      } catch (error) {
        console.error('Error fetching appointments:', error)
      }
    }

    fetchAppointments()
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 md:gap-6 h-[calc(100vh-120px)]">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-bold">Citas</h1>
        </div>
        <div className="bg-card rounded-lg border p-4 flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loading className="w-8 h-8" />
            <p className="text-muted-foreground">Cargando citas...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:gap-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="text-2xl md:text-3xl font-bold">Citas</h1>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <ButtonGroup className="w-full sm:w-auto">
            <Button
              variant={displayMode === 'calendar' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDisplayMode('calendar')}
              title="Vista de calendario"
              className="flex-1 sm:flex-none gap-2"
            >
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Calendario</span>
            </Button>
            <Button
              variant={displayMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDisplayMode('list')}
              title="Vista de lista"
              className="flex-1 sm:flex-none gap-2"
            >
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">Lista</span>
            </Button>
            <Button
              variant={displayMode === 'table' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDisplayMode('table')}
              title="Vista de tabla"
              className="flex-1 sm:flex-none gap-2"
            >
              <Table className="h-4 w-4" />
              <span className="hidden sm:inline">Tabla</span>
            </Button>
          </ButtonGroup>
          <Button
            size="sm"
            className="gap-2"
            onClick={handleCreateAppointment}
            data-tutorial="add-appointment-button"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Crear Cita</span>
            <span className="sm:hidden">Crear</span>
          </Button>
        </div>
      </div>

      {displayMode === 'calendar' && (
        <div className="bg-card rounded-lg border p-2 md:p-4">
          <BigCalendar
            events={events}
            onSelectEvent={handleSelectEvent}
            onSelectSlot={handleSelectSlot}
            onNavigate={handleNavigate}
            onView={handleViewChange}
            onDrillDown={handleDrillDown}
            defaultView={viewMode}
            defaultDate={currentDate}
          />
        </div>
      )}

      {displayMode === 'list' && (
        <MobileAppointmentsList
          appointments={allAppointments}
          currentDate={currentDate}
          onNavigate={handleNavigate}
          onSelectAppointment={(id: string) => {
            setSelectedAppointmentId(id)
            setIsDetailsModalOpen(true)
          }}
        />
      )}

      {displayMode === 'table' && (
        <AppointmentsTableView
          appointments={allAppointments}
          currentDate={currentDate}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onNavigate={handleNavigate}
          onSelectAppointment={(id: string) => {
            setSelectedAppointmentId(id)
            setIsDetailsModalOpen(true)
          }}
          specialists={specialists}
        />
      )}

      <DayAppointmentsModal
        open={isDayModalOpen}
        onOpenChange={setIsDayModalOpen}
        date={selectedDayDate}
        appointments={
          selectedDayDate ? getDayAppointments(selectedDayDate) : []
        }
        onSelectAppointment={handleDayAppointmentSelect}
      />

      <AppointmentDetailsModal
        appointmentId={selectedAppointmentId}
        open={isDetailsModalOpen}
        onOpenChange={setIsDetailsModalOpen}
        onEdit={handleEditAppointment}
        onCancel={handleCancelAppointment}
        onStatusChange={handleAppointmentSuccess}
        businessData={
          businessData
            ? {
                name: businessData.name,
                address: businessData.address,
                phone: businessData.phone_number || undefined,
                nit: businessData.nit || undefined,
                business_account_id: activeBusiness?.business_account_id,
              }
            : undefined
        }
        onViewInvoice={handleViewInvoice}
      />

      <AppointmentFormModal
        appointment={appointmentToEdit}
        open={isFormModalOpen}
        onOpenChange={(open) => {
          setIsFormModalOpen(open)
          if (!open) setAppointmentToEdit(null)
        }}
        defaultDate={selectedSlot?.start}
        onSuccess={handleAppointmentSuccess}
      />

      <InvoiceDetailModal
        open={isInvoiceModalOpen}
        onOpenChange={setIsInvoiceModalOpen}
        invoice={invoiceToView}
      />
    </div>
  )
}
