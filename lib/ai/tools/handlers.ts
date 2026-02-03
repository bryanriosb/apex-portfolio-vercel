import { getSupabaseAdminClient } from '@/lib/actions/supabase'
import { getAvailableSlotsForServiceAction } from '@/lib/actions/availability'
import { createFullCustomerAction } from '@/lib/actions/business-customer'
import {
  type GetAvailableSlotsInput,
  type GetServicesInput,
  type GetSpecialistsInput,
  type GetAppointmentsByPhoneInput,
  type CreateAppointmentInput,
  type CreateCustomerInput,
  type CancelAppointmentInput,
  type RescheduleAppointmentInput,
} from './appointment-tools'
import {
  setCustomerData,
  getCustomerData,
  getFirstAppointment,
  getAgentContext,
  getCustomerContextReminder,
} from '../graph/agent-context'
import type { CustomerData } from '../graph/state'
import { format, addDays } from 'date-fns'
import { es } from 'date-fns/locale'

// Función para convertir fechas naturales a YYYY-MM-DD
function convertNaturalDate(dateStr: string): string | null {
  if (!dateStr) return null
  
  const today = new Date()
  const normalized = dateStr.toLowerCase().trim()
  
  try {
    // Expresiones relativas comunes
    if (normalized === 'hoy') {
      return format(today, 'yyyy-MM-dd')
    }
    
    if (normalized === 'mañana') {
      return format(addDays(today, 1), 'yyyy-MM-dd')
    }
    
    if (normalized === 'pasado mañana') {
      return format(addDays(today, 2), 'yyyy-MM-dd')
    }
    
    // Intentar parseo directo si ya está en formato YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr
    }
    
    return null
  } catch (error) {
    console.error('Error converting date:', error)
    return null
  }
}

export async function handleGetAvailableSlots(
  input: GetAvailableSlotsInput
): Promise<string> {
  try {
    console.log('[AI Agent] handleGetAvailableSlots called with:', {
      businessId: input.businessId,
      sessionId: input.sessionId,
      serviceId: input.serviceId,
      date: input.date,
    })

    let serviceId = input.serviceId
    let excludeAppointmentId: string | undefined

    // Si no se proporciona serviceId, intentar obtenerlo del contexto (cita del cliente)
    if (!serviceId) {
      const customerAppointment = getFirstAppointment(input.sessionId)
      if (customerAppointment) {
        serviceId = customerAppointment.serviceId
        excludeAppointmentId = customerAppointment.appointmentId
        console.log('[AI Agent] Using serviceId from context:', {
          serviceId,
          excludeAppointmentId,
          appointmentDetails: customerAppointment.serviceName,
        })
      }
    }

    if (!serviceId) {
      return `[ERROR] No se proporcionó serviceId y no hay cita del cliente en el contexto. Primero busca las citas del cliente con get_appointments_by_phone o proporciona un serviceId.`
    }

    let processedDate = input.date
    
    // Si la fecha no está en formato YYYY-MM-DD, intentar convertirla
    if (!input.date || !/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
      console.log('[AI Agent] Intentando convertir fecha natural:', input.date)
      const convertedDate = convertNaturalDate(input.date)
      
      if (!convertedDate) {
        return `[ERROR] No pude interpretar la fecha "${input.date}". Por favor, usa un formato como "2025-12-25" o expresa la fecha más claramente.`
      }
      
      processedDate = convertedDate
      console.log('[AI Agent] Fecha convertida:', `"${input.date}" → "${processedDate}"`)
    }

    const result = await getAvailableSlotsForServiceAction({
      businessId: input.businessId,
      serviceId: serviceId,
      date: processedDate,
      excludeAppointmentId: excludeAppointmentId,
    })

    console.log('[AI Agent] getAvailableSlotsForServiceAction result:', {
      success: result.success,
      businessOpen: result.businessOpen,
      slotsCount: result.slots?.length,
      availableCount: result.slots?.filter((s) => s.available).length,
      error: result.error,
    })

    if (!result.success) {
      return `[ERROR] ${result.error}`
    }

    if (!result.businessOpen) {
      return `El negocio está cerrado el ${format(
        new Date(input.date + 'T12:00:00'),
        "EEEE d 'de' MMMM",
        { locale: es }
      )}.`
    }

    const availableSlots = result.slots.filter((slot) => slot.available)

    if (availableSlots.length === 0) {
      return `No hay horarios disponibles para el ${format(
        new Date(input.date + 'T12:00:00'),
        "EEEE d 'de' MMMM",
        { locale: es }
      )}. Por favor, intenta con otra fecha.`
    }

    const slotsFormatted = availableSlots.map((slot) => {
      const [hours, minutes] = slot.time.split(':')
      const hour = parseInt(hours)
      const ampm = hour >= 12 ? 'PM' : 'AM'
      const hour12 = hour % 12 || 12
      return `${hour12}:${minutes} ${ampm}`
    })

    const contextReminder = getCustomerContextReminder(input.sessionId)
    return `Horarios disponibles para el ${format(
      new Date(input.date + 'T12:00:00'),
      "EEEE d 'de' MMMM",
      { locale: es }
    )} (${availableSlots.length} horarios):\n${slotsFormatted.join(', ')}${contextReminder}`
  } catch (error: unknown) {
    console.error('[AI Agent] handleGetAvailableSlots error:', error)
    const message = error instanceof Error ? error.message : 'Error desconocido'
    return `[ERROR] Error al obtener disponibilidad: ${message}`
  }
}

export async function handleGetServices(
  input: GetServicesInput
): Promise<string> {
  try {
    console.log(
      '[AI Agent] handleGetServices called with businessId:',
      input.businessId
    )
    const supabase = await getSupabaseAdminClient()

    const { data: services, error } = await supabase
      .from('services')
      .select('id, name, description, price_cents, duration_minutes, tax_rate')
      .eq('business_id', input.businessId)
      .order('name')

    if (error) {
      console.error('[AI Agent] Error fetching services:', error)
      throw error
    }

    console.log('[AI Agent] Services found:', services?.length || 0)

    if (!services || services.length === 0) {
      return 'No hay servicios disponibles en este momento.'
    }

    const servicesFormatted = services.map((s) => {
      const price = s.price_cents / 100
      const taxRate = s.tax_rate || 0
      const taxAmount = price * taxRate
      const totalPrice = price + taxAmount
      const priceStr = price.toLocaleString('es-CO', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })
      const totalStr = totalPrice.toLocaleString('es-CO', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })

      const priceInfo =
        taxRate > 0 ? `$${priceStr} + IVA = $${totalStr}` : `$${priceStr}`

      return `• ${s.name}: ${priceInfo} (${s.duration_minutes} min)${
        s.description ? `\n  ${s.description}` : ''
      }\n  [ID: ${s.id}]`
    })

    const contextReminder = getCustomerContextReminder(input.sessionId)
    return `📋 SERVICIOS DISPONIBLES:\n\n${servicesFormatted.join('\n\n')}${contextReminder}`
  } catch (error: unknown) {
    console.error('[AI Agent] handleGetServices error:', error)
    const message = error instanceof Error ? error.message : 'Error desconocido'
    return `Error al obtener servicios: ${message}`
  }
}

export async function handleGetSpecialists(
  input: GetSpecialistsInput
): Promise<string> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { data: specialists, error } = await supabase
      .from('specialists')
      .select('id, first_name, last_name, specialty, bio')
      .eq('business_id', input.businessId)
      .order('first_name')

    if (error) throw error

    if (!specialists || specialists.length === 0) {
      return 'No hay especialistas disponibles en este momento.'
    }

    const specialistsFormatted = specialists.map((s) => {
      return `- ${s.first_name} ${s.last_name || ''}${
        s.specialty ? ` (${s.specialty})` : ''
      }`
    })

    const contextReminder = getCustomerContextReminder(input.sessionId)
    return `Especialistas disponibles:\n${specialistsFormatted.join('\n')}${contextReminder}`
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    return `Error al obtener especialistas: ${message}`
  }
}

export async function handleGetAppointmentsByPhone(
  input: GetAppointmentsByPhoneInput
): Promise<string> {
  try {
    console.log('[AI Agent] handleGetAppointmentsByPhone called with:', {
      phone: input.phone,
      businessId: input.businessId,
      sessionId: input.sessionId,
    })

    getAgentContext(input.sessionId, input.businessId)
    const supabase = await getSupabaseAdminClient()

    const { data: customer, error: customerError } = await supabase
      .from('business_customers')
      .select('id, first_name, last_name, user_profile_id, phone, email')
      .eq('business_id', input.businessId)
      .eq('phone', input.phone)
      .single()

    if (customerError || !customer) {
      return `No se encontró un cliente con el teléfono ${input.phone}. ¿Deseas crear una Crear Cita?`
    }

    const { data: appointments, error } = await supabase
      .from('appointments')
      .select(
        `
        id, start_time, end_time, status, specialist_id,
        specialists (id, first_name, last_name),
        appointment_services (
          service_id,
          services (id, name)
        )
      `
      )
      .eq('business_id', input.businessId)
      .eq('users_profile_id', customer.user_profile_id)
      .in('status', ['PENDING', 'CONFIRMED'])
      .gte('start_time', new Date().toISOString())
      .order('start_time')

    if (error) throw error

    if (!appointments || appointments.length === 0) {
const customerData: CustomerData = {
        id: customer.id,
        userProfileId: customer.user_profile_id,
        phone: customer.phone,
        firstName: customer.first_name,
        lastName: customer.last_name,
        email: customer.email,
        appointments: [],
      }
      setCustomerData(input.sessionId, customerData)
      return `${customer.first_name} no tiene citas programadas. ¿Deseas agendar una Crear Cita?`
    }

    const customerAppointments = appointments.map((apt) => {
      const specialist = apt.specialists as unknown as {
        id: string
        first_name: string
        last_name: string
      } | null
      const appointmentServices = apt.appointment_services as unknown as Array<{
        service_id: string
        services: { id: string; name: string } | null
      }> | null
      const firstService = appointmentServices?.find((as) => as.services)
      const servicesNames =
        appointmentServices
          ?.filter((as) => as.services)
          .map((as) => as.services!.name)
          .join(', ') || 'Sin servicios'

      return {
        appointmentId: apt.id,
        serviceId: firstService?.services?.id || '',
        serviceName: servicesNames,
        specialistId: specialist?.id || apt.specialist_id || '',
        specialistName: specialist
          ? `${specialist.first_name} ${specialist.last_name || ''}`.trim()
          : 'Sin especialista',
        startTime: apt.start_time,
        status: apt.status,
      }
    })

    const customerData: CustomerData = {
      id: customer.id,
      userProfileId: customer.user_profile_id,
      phone: customer.phone,
      firstName: customer.first_name,
      lastName: customer.last_name,
      email: customer.email,
      appointments: customerAppointments,
    }
    setCustomerData(input.sessionId, customerData)

    console.log('[AI Agent] Customer data saved to context:', {
      sessionId: input.sessionId,
      customerId: customer.id,
      appointmentsCount: customerAppointments.length,
    })

    const appointmentsFormatted = customerAppointments.map((apt, index) => {
      const date = format(
        new Date(apt.startTime),
        "EEEE d 'de' MMMM 'a las' h:mm a",
        { locale: es }
      )
      return `${index + 1}. ${date}
   Servicio: ${apt.serviceName}
   Especialista: ${apt.specialistName}`
    })

    return `📅 Citas de ${customer.first_name} ${customer.last_name || ''}:

${appointmentsFormatted.join('\n\n')}

Los datos de las citas han sido guardados. Puedes reprogramar o cancelar directamente.`
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    return `Error al buscar citas: ${message}`
  }
}

export async function handleCreateCustomer(
  input: CreateCustomerInput
): Promise<string> {
  console.log('[AI Agent] handleCreateCustomer called with:', JSON.stringify(input, null, 2))

  try {
    // Validar datos requeridos
    if (!input.customerName || !input.customerPhone) {
      return '[ERROR] Se requiere nombre y teléfono del cliente para crear un nuevo cliente.'
    }

    const nameParts = input.customerName.split(' ')
    const firstName = nameParts[0]
    const lastName = nameParts.slice(1).join(' ') || null

    const email = input.customerEmail || `${input.customerPhone}@guest.ai-agent.local`

    console.log('[AI Agent] Creating customer:', {
      business_id: input.businessId,
      first_name: firstName,
      last_name: lastName,
      email: email,
      phone: input.customerPhone,
      source: 'ai_agent',
    })

    const result = await createFullCustomerAction({
      business_id: input.businessId,
      first_name: firstName,
      last_name: lastName,
      email: email,
      phone: input.customerPhone,
      source: 'ai_agent',
    })

    if (!result.success || !result.data) {
      console.error('[AI Agent] Error creating customer:', result.error)
      return `[ERROR] ${result.error || 'Error al crear cliente'}`
    }

    console.log('[AI Agent] Customer created successfully:', {
      customerId: result.data.id,
      userProfileId: result.userProfileId,
      isNew: result.isNew,
    })

    // Guardar datos del cliente en el contexto para uso posterior
    if (input.sessionId) {
      setCustomerData(input.sessionId, {
        id: result.data.id,
        userProfileId: result.userProfileId!,
        firstName: firstName,
        lastName: lastName,
        phone: input.customerPhone,
        email: email,
        appointments: [],
      })
    }

    const statusText = result.isNew ? 'creado' : 'encontrado'
    return `✅ Cliente ${statusText} exitosamente:
- ID: ${result.data.id}
- Nombre: ${firstName} ${lastName || ''}
- Teléfono: ${input.customerPhone}
- Email: ${email}
- Perfil ID: ${result.userProfileId}

Ahora puedes crear una cita usando este cliente.`
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    console.error('[AI Agent] handleCreateCustomer error:', error)
    return `[ERROR] Error al crear cliente: ${message}`
  }
}

export async function handleCreateAppointment(
  input: CreateAppointmentInput
): Promise<string> {
  console.log(
    '[AI Agent] handleCreateAppointment called with:',
    JSON.stringify(input, null, 2)
  )

  try {
    const supabase = await getSupabaseAdminClient()

    // FUENTE DE VERDAD: Primero intentar obtener customerId del estado del agente
    const customerDataFromState = getCustomerData(input.sessionId)
    let customerId = input.customerId

    if (customerDataFromState) {
      // El estado es la fuente de verdad
      customerId = customerDataFromState.id
      console.log('[AI Agent] Using customerId from STATE (source of truth):', customerId)
    } else if (!customerId) {
      return '[ERROR] No hay cliente identificado en la sesión. Primero usa get_appointments_by_phone para identificar al cliente o create_customer para crear uno nuevo.'
    }

    // Obtener datos del cliente desde la DB para confirmar
    console.log('[AI Agent] Getting customer data for ID:', customerId)
    const { data: customer, error: customerError } = await supabase
      .from('business_customers')
      .select('id, user_profile_id, first_name, last_name, phone, email')
      .eq('business_id', input.businessId)
      .eq('id', customerId)
      .single()

    if (customerError || !customer) {
      console.error('[AI Agent] Error finding customer:', customerError)
      return `[ERROR] No se encontró el cliente con ID ${customerId}. Verifica que el cliente esté registrado.`
    }

    const userProfileId = customer.user_profile_id
    console.log('[AI Agent] Using customer:', {
      customerId: customer.id,
      userProfileId: userProfileId,
      customerName: `${customer.first_name} ${customer.last_name || ''}`.trim(),
    })

    console.log('[AI Agent] Looking for services:', input.serviceIds)
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('id, price_cents, duration_minutes, tax_rate')
      .in('id', input.serviceIds)

    if (servicesError) {
      console.error('[AI Agent] Error finding services:', servicesError)
    }

    if (!services || services.length === 0) {
      console.error('[AI Agent] No services found for IDs:', input.serviceIds)
      return 'Error: Los servicios seleccionados no son válidos.'
    }

    console.log('[AI Agent] Found services:', services.length)

    const totalDuration = services.reduce(
      (acc, s) => acc + s.duration_minutes,
      0
    )
    const subtotal = services.reduce((acc, s) => acc + s.price_cents, 0)
    const taxTotal = services.reduce(
      (acc, s) => acc + Math.round(s.price_cents * (s.tax_rate || 0)),
      0
    )

    const startTime = new Date(input.startTime)
    const endTime = new Date(startTime.getTime() + totalDuration * 60 * 1000)

    console.log('[AI Agent] Creating appointment:', {
      business_id: input.businessId,
      specialist_id: input.specialistId,
      users_profile_id: userProfileId,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
    })

    const { data: appointment, error: aptError } = await supabase
      .from('appointments')
      .insert({
        business_id: input.businessId,
        specialist_id: input.specialistId,
        users_profile_id: userProfileId,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        status: 'PENDING',
        subtotal_cents: subtotal,
        tax_cents: taxTotal,
        discount_cents: 0,
        total_price_cents: subtotal + taxTotal,
        amount_paid_cents: 0,
        payment_status: 'UNPAID',
        payment_method: 'AT_VENUE',
        customer_note: 'Cita agendada vía asistente virtual',
      })
      .select('id')
      .single()

    if (aptError) {
      console.error('[AI Agent] Error creating appointment:', aptError)
      throw aptError
    }
    console.log('[AI Agent] Appointment created:', appointment.id)

    const appointmentServices = services.map((s) => ({
      appointment_id: appointment.id,
      service_id: s.id,
      price_at_booking_cents: s.price_cents,
      duration_minutes: s.duration_minutes,
    }))

    await supabase.from('appointment_services').insert(appointmentServices)

    const { data: specialist } = await supabase
      .from('specialists')
      .select('id, first_name, last_name')
      .eq('id', input.specialistId)
      .single()

    const { data: serviceDetails } = await supabase
      .from('services')
      .select('id, name, price_cents')
      .in('id', input.serviceIds)

    const servicesNames =
      serviceDetails?.map((s) => s.name).join(', ') || 'Servicios seleccionados'

    // CRÍTICO: Actualizar el contexto con la cita recién creada
    const newAppointment = {
      appointmentId: appointment.id,
      serviceId: serviceDetails?.[0]?.id || input.serviceIds[0],
      serviceName: servicesNames,
      specialistId: specialist?.id || input.specialistId,
      specialistName: specialist
        ? `${specialist.first_name} ${specialist.last_name || ''}`.trim()
        : 'Especialista',
      startTime: startTime.toISOString(),
      status: 'PENDING' as const,
    }

    // Actualizar el customerData con la nueva cita
    if (customerDataFromState) {
      setCustomerData(input.sessionId, {
        ...customerDataFromState,
        appointments: [...customerDataFromState.appointments, newAppointment],
      })
      console.log('[AI Agent] Updated customer context with new appointment:', {
        sessionId: input.sessionId,
        appointmentId: appointment.id,
        totalAppointments: customerDataFromState.appointments.length + 1,
      })
    }

    const dateFormatted = format(startTime, "EEEE d 'de' MMMM 'a las' h:mm a", {
      locale: es,
    })

    const subtotalFormatted = (subtotal / 100).toLocaleString('es-CO', {
      minimumFractionDigits: 0,
    })
    const taxFormatted = (taxTotal / 100).toLocaleString('es-CO', {
      minimumFractionDigits: 0,
    })
    const totalFormatted = ((subtotal + taxTotal) / 100).toLocaleString(
      'es-CO',
      { minimumFractionDigits: 0 }
    )

    return `¡Cita agendada exitosamente! ✅

📋 RESUMEN DE TU CITA:
• Cliente: ${customer.first_name} ${customer.last_name || ''}
• Teléfono: ${customer.phone}
• Servicio(s): ${servicesNames}
• Fecha: ${dateFormatted}
• Especialista: ${specialist?.first_name} ${specialist?.last_name || ''}

💰 DETALLE DE PAGO:
• Subtotal: $${subtotalFormatted}
• IVA: $${taxFormatted}
• TOTAL A PAGAR: $${totalFormatted}

El pago se realizará en el establecimiento.

---
📌 CITA GUARDADA EN CONTEXTO: ID ${appointment.id}
Si el cliente quiere reprogramar o cancelar, usa esta cita automáticamente.`
  } catch (error: unknown) {
    console.error('[AI Agent] handleCreateAppointment error:', error)
    let message = 'Error desconocido'
    if (error instanceof Error) {
      message = error.message
    } else if (typeof error === 'object' && error !== null) {
      // Supabase errors have message property but aren't Error instances
      const err = error as { message?: string; code?: string; details?: string }
      message = err.message || err.details || err.code || JSON.stringify(error)
    }
    return `Error al crear la cita: ${message}`
  }
}

export async function handleCancelAppointment(
  input: CancelAppointmentInput
): Promise<string> {
  try {
    console.log('[AI Agent] handleCancelAppointment called with:', {
      sessionId: input.sessionId,
      businessId: input.businessId,
      reason: input.reason,
    })

    // Obtener appointmentId del contexto
    const customerAppointment = getFirstAppointment(input.sessionId)
    if (!customerAppointment) {
      return '[ERROR] No hay cita identificada. Primero busca las citas del cliente con get_appointments_by_phone.'
    }

    const appointmentId = customerAppointment.appointmentId
    console.log('[AI Agent] Using appointmentId from context:', appointmentId)

    const supabase = await getSupabaseAdminClient()

    const { data: appointment, error: fetchError } = await supabase
      .from('appointments')
      .select(
        `
        id, start_time, status,
        specialists (first_name, last_name)
      `
      )
      .eq('id', appointmentId)
      .single()

    if (fetchError || !appointment) {
      return 'No se encontró la cita especificada.'
    }

    if (appointment.status === 'CANCELLED') {
      return 'Esta cita ya fue cancelada anteriormente.'
    }

    if (appointment.status === 'COMPLETED') {
      return 'No se puede cancelar una cita que ya fue completada.'
    }

    const { error: updateError } = await supabase
      .from('appointments')
      .update({
        status: 'CANCELLED',
        customer_note: input.reason
          ? `Cancelada: ${input.reason}`
          : 'Cancelada vía asistente virtual',
      })
      .eq('id', appointmentId)

    if (updateError) throw updateError

    const specialist = appointment.specialists as unknown as {
      first_name: string
      last_name: string
    } | null
    const dateFormatted = format(
      new Date(appointment.start_time),
      "EEEE d 'de' MMMM 'a las' h:mm a",
      { locale: es }
    )
    const specialistName = specialist
      ? `${specialist.first_name} ${specialist.last_name || ''}`.trim()
      : 'el especialista'

    return `Cita cancelada exitosamente.

La cita del ${dateFormatted} con ${specialistName} ha sido cancelada.

¿Deseas agendar una Crear Cita?`
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    return `Error al cancelar la cita: ${message}`
  }
}

export async function handleRescheduleAppointment(
  input: RescheduleAppointmentInput
): Promise<string> {
  try {
    console.log('[AI Agent] handleRescheduleAppointment called with:', {
      sessionId: input.sessionId,
      businessId: input.businessId,
      newStartTime: input.newStartTime,
      newSpecialistId: input.newSpecialistId,
    })

    // Obtener appointmentId del contexto
    const customerAppointment = getFirstAppointment(input.sessionId)
    if (!customerAppointment) {
      return '[ERROR] No hay cita identificada. Primero busca las citas del cliente con get_appointments_by_phone.'
    }

    const appointmentId = customerAppointment.appointmentId
    console.log('[AI Agent] Using appointmentId from context:', appointmentId)

    const supabase = await getSupabaseAdminClient()

    const { data: appointment, error: fetchError } = await supabase
      .from('appointments')
      .select(
        `
        id, start_time, end_time, status, specialist_id,
        specialists (first_name, last_name),
        appointment_services (
          services (duration_minutes)
        )
      `
      )
      .eq('id', appointmentId)
      .single()

    if (fetchError || !appointment) {
      return 'No se encontró la cita especificada.'
    }

    if (
      appointment.status === 'CANCELLED' ||
      appointment.status === 'COMPLETED'
    ) {
      return `No se puede reprogramar una cita ${
        appointment.status === 'CANCELLED' ? 'cancelada' : 'completada'
      }.`
    }

    const appointmentServices =
      appointment.appointment_services as unknown as Array<{
        services: { duration_minutes: number } | null
      }> | null
    const totalDuration =
      appointmentServices
        ?.filter((as) => as.services)
        .reduce((acc, as) => acc + as.services!.duration_minutes, 0) || 30

    const newStartTime = new Date(input.newStartTime)
    const newEndTime = new Date(
      newStartTime.getTime() + totalDuration * 60 * 1000
    )

    const specialistId = input.newSpecialistId || appointment.specialist_id

    const { error: updateError } = await supabase
      .from('appointments')
      .update({
        start_time: newStartTime.toISOString(),
        end_time: newEndTime.toISOString(),
        specialist_id: specialistId,
      })
      .eq('id', appointmentId)

    if (updateError) throw updateError

    let specialistName = ''
    if (
      input.newSpecialistId &&
      input.newSpecialistId !== appointment.specialist_id
    ) {
      const { data: newSpecialist } = await supabase
        .from('specialists')
        .select('first_name, last_name')
        .eq('id', input.newSpecialistId)
        .single()
      specialistName = `${newSpecialist?.first_name} ${
        newSpecialist?.last_name || ''
      }`.trim()
    } else {
      const specialist = appointment.specialists as unknown as {
        first_name: string
        last_name: string
      } | null
      specialistName = specialist
        ? `${specialist.first_name} ${specialist.last_name || ''}`.trim()
        : 'el especialista'
    }

    const oldDate = format(
      new Date(appointment.start_time),
      "EEEE d 'de' MMMM 'a las' h:mm a",
      { locale: es }
    )
    const newDate = format(newStartTime, "EEEE d 'de' MMMM 'a las' h:mm a", {
      locale: es,
    })

    return `¡Cita reprogramada exitosamente!

Cambio realizado:
- Fecha anterior: ${oldDate}
- Nueva fecha: ${newDate}
- Especialista: ${specialistName}

¿Hay algo más en lo que pueda ayudarte?`
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    return `Error al reprogramar la cita: ${message}`
  }
}
