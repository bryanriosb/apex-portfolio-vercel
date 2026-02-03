'use server'

import {
  getRecordById,
  updateRecord,
  deleteRecord,
  getSupabaseAdminClient,
} from '@/lib/actions/supabase'
import type {
  Appointment,
  AppointmentInsert,
  AppointmentUpdate,
} from '@/lib/models/appointment/appointment'

export interface AppointmentServiceInput {
  service_id: string
  specialist_id?: string | null
  price_at_booking_cents: number
  duration_minutes: number
  start_time?: string | null
  end_time?: string | null
}

export interface AppointmentSupplyInput {
  product_id: string
  quantity_used: number
  unit_price_cents: number
}

export interface AppointmentListResponse {
  data: Appointment[]
  total: number
  total_pages: number
}

export async function fetchAppointmentsAction(params?: {
  page?: number
  page_size?: number
  business_id?: string
  business_ids?: string[]
  specialist_id?: string
  users_profile_id?: string
  status?: string[]
  start_date?: string
  end_date?: string
}): Promise<AppointmentListResponse> {
  try {
    const supabase = await getSupabaseAdminClient()
    let query = supabase
      .from('appointments')
      .select(`
        *,
        specialist:specialists(
          id,
          first_name,
          last_name,
          specialty,
          profile_picture_url
        ),
        business:businesses(
          id,
          name,
          logo_url
        ),
        user_profile:users_profile!appointments_users_profile_id_fkey(
          id,
          user_id,
          profile_picture_url
        ),
        appointment_services(
          id,
          service_id,
          specialist_id,
          price_at_booking_cents,
          duration_minutes,
          start_time,
          end_time,
          service:services(
            id,
            name,
            description,
            category_id,
            tax_rate,
            service_category:service_categories(
              id,
              name,
              icon_key
            )
          ),
          specialist:specialists(
            id,
            first_name,
            last_name,
            specialty,
            profile_picture_url
          )
        )
      `)
      .order('start_time', { ascending: true })

    if (params?.business_id) {
      query = query.eq('business_id', params.business_id)
    }

    if (params?.business_ids && params.business_ids.length > 0) {
      query = query.in('business_id', params.business_ids)
    }

    if (params?.specialist_id) {
      query = query.eq('specialist_id', params.specialist_id)
    }

    if (params?.users_profile_id) {
      query = query.eq('users_profile_id', params.users_profile_id)
    }

    if (params?.status && params.status.length > 0) {
      query = query.in('status', params.status)
    }

    if (params?.start_date) {
      query = query.gte('start_time', params.start_date)
    }

    if (params?.end_date) {
      query = query.lte('start_time', params.end_date)
    }

    const { data: appointments, error } = await query

    if (error) {
      console.error('Error fetching appointments:', error)
      return {
        data: [],
        total: 0,
        total_pages: 0,
      }
    }

    const filteredAppointments = appointments || []

    const appointmentsWithUserData = await Promise.all(
      filteredAppointments.map(async (appointment: any) => {
        let clientData = null

        // Obtener datos del cliente desde business_customers
        if (appointment.users_profile_id && appointment.business_id) {
          const { data: customer } = await supabase
            .from('business_customers')
            .select('first_name, last_name, phone, email')
            .eq('user_profile_id', appointment.users_profile_id)
            .eq('business_id', appointment.business_id)
            .single()

          if (customer) {
            clientData = {
              first_name: customer.first_name,
              last_name: customer.last_name,
              phone_number: customer.phone,
              email: customer.email,
            }
          }
        }

        // Fallback: si no hay datos en business_customers, usar user_profile + auth
        if (!clientData && appointment.user_profile?.user_id) {
          const { data: authUser } = await supabase.auth.admin.getUserById(
            appointment.user_profile.user_id
          )
          if (authUser?.user) {
            clientData = {
              first_name: authUser.user.user_metadata?.name || 'Cliente',
              last_name: null,
              phone_number: authUser.user.phone || authUser.user.user_metadata?.phone,
              email: authUser.user.email,
            }
          }
        }

        return {
          ...appointment,
          client: clientData,
          user_profile: appointment.user_profile ? {
            ...appointment.user_profile,
            user: appointment.user_profile?.user_id ? {
              email: clientData?.email,
              name: clientData?.first_name,
              phone: clientData?.phone_number,
            } : null,
          } : null,
        }
      })
    )

    const page = params?.page || 1
    const pageSize = params?.page_size || 20
    const start = (page - 1) * pageSize
    const end = start + pageSize

    const paginatedData = appointmentsWithUserData.slice(start, end)
    const totalPages = Math.ceil(appointmentsWithUserData.length / pageSize)

    return {
      data: paginatedData,
      total: appointmentsWithUserData.length,
      total_pages: totalPages,
    }
  } catch (error) {
    console.error('Error fetching appointments:', error)
    return {
      data: [],
      total: 0,
      total_pages: 0,
    }
  }
}

export async function getAppointmentByIdAction(
  id: string,
  withDetails = false
): Promise<Appointment | null> {
  try {
    if (!withDetails) {
      return await getRecordById<Appointment>('appointments', id)
    }

    const supabase = await getSupabaseAdminClient()
    const { data, error } = await supabase
      .from('appointments')
      .select(
        `
        *,
        specialist:specialists(
          id,
          first_name,
          last_name,
          specialty,
          profile_picture_url
        ),
        business:businesses(
          id,
          name,
          logo_url
        ),
        user_profile:users_profile!appointments_users_profile_id_fkey(
          id,
          user_id,
          profile_picture_url
        ),
        appointment_services(
          id,
          service_id,
          specialist_id,
          price_at_booking_cents,
          duration_minutes,
          start_time,
          end_time,
          service:services(
            id,
            name,
            description,
            category_id,
            tax_rate,
            service_category:service_categories(
              id,
              name,
              icon_key
            )
          ),
          specialist:specialists(
            id,
            first_name,
            last_name,
            specialty,
            profile_picture_url
          )
        ),
        appointment_supplies(
          id,
          product_id,
          quantity_used,
          unit_price_cents,
          total_price_cents,
          product:products(
            id,
            name,
            unit_of_measure:unit_of_measures(abbreviation)
          )
        )
      `
      )
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching appointment with details:', error)
      return null
    }

    let clientData = null

    // Obtener datos del cliente desde business_customers
    if (data?.users_profile_id && data?.business_id) {
      const { data: customer } = await supabase
        .from('business_customers')
        .select('first_name, last_name, phone, email')
        .eq('user_profile_id', data.users_profile_id)
        .eq('business_id', data.business_id)
        .single()

      if (customer) {
        clientData = {
          first_name: customer.first_name,
          last_name: customer.last_name,
          phone_number: customer.phone,
          email: customer.email,
        }
      }
    }

    // Fallback: si no hay datos en business_customers, usar user_profile + auth
    if (!clientData && data?.user_profile?.user_id) {
      const { data: authUser } = await supabase.auth.admin.getUserById(
        data.user_profile.user_id
      )
      if (authUser?.user) {
        clientData = {
          first_name: authUser.user.user_metadata?.name || 'Cliente',
          last_name: null,
          phone_number: authUser.user.phone || authUser.user.user_metadata?.phone,
          email: authUser.user.email,
        }
      }
    }

    return {
      ...data,
      client: clientData,
      user_profile: data?.user_profile ? {
        ...data.user_profile,
        user: clientData ? {
          email: clientData.email,
          name: `${clientData.first_name} ${clientData.last_name || ''}`.trim(),
          phone: clientData.phone_number,
        } : null,
      } : null,
    } as any
  } catch (error) {
    console.error('Error fetching appointment:', error)
    return null
  }
}

export interface CreateAppointmentOptions {
  sendWhatsAppNotification?: boolean
}

export async function createAppointmentAction(
  data: AppointmentInsert,
  services?: AppointmentServiceInput[],
  supplies?: AppointmentSupplyInput[],
  options?: CreateAppointmentOptions
): Promise<{ success: boolean; data?: Appointment; error?: string }> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .insert(data)
      .select()
      .single()

    if (appointmentError || !appointment) {
      return { success: false, error: appointmentError?.message || 'Error al crear la cita' }
    }

    if (services && services.length > 0) {
      const appointmentServices = services.map((service) => ({
        appointment_id: appointment.id,
        service_id: service.service_id,
        specialist_id: service.specialist_id || data.specialist_id,
        price_at_booking_cents: service.price_at_booking_cents,
        duration_minutes: service.duration_minutes,
        start_time: service.start_time || null,
        end_time: service.end_time || null,
      }))

      const { error: servicesError } = await supabase
        .from('appointment_services')
        .insert(appointmentServices)

      if (servicesError) {
        console.error('Error creating appointment services:', servicesError)
      }
    }

    // Save appointment supplies
    if (supplies && supplies.length > 0) {
      const appointmentSupplies = supplies.map((supply) => ({
        appointment_id: appointment.id,
        product_id: supply.product_id,
        quantity_used: supply.quantity_used,
        unit_price_cents: supply.unit_price_cents,
        total_price_cents: Math.round(supply.quantity_used * supply.unit_price_cents),
      }))

      const { error: suppliesError } = await supabase
        .from('appointment_supplies')
        .insert(appointmentSupplies)

      if (suppliesError) {
        console.error('Error creating appointment supplies:', suppliesError)
      }
    }

    // Enviar notificacion WhatsApp y programar recordatorio
    if (options?.sendWhatsAppNotification !== false) {
      try {
        await sendAppointmentNotifications(supabase, appointment, services || [])
      } catch (notificationError) {
        console.error('Error sending appointment notifications:', notificationError)
        // No fallar la creacion de cita por error de notificacion
      }
    }

    return { success: true, data: appointment as Appointment }
  } catch (error: any) {
    console.error('Error creating appointment:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}

async function sendAppointmentNotifications(
  supabase: any,
  appointment: any,
  services: AppointmentServiceInput[]
) {
  // Obtener datos del negocio
  const { data: business, error: businessError } = await supabase
    .from('businesses')
    .select('id, name, business_account_id, address, phone_number')
    .eq('id', appointment.business_id)
    .single()

  if (businessError) {
    console.error('Error fetching business:', businessError)
    return
  }

  if (!business?.business_account_id) {
    console.log('No business_account_id found for business:', appointment.business_id)
    return
  }

  // Obtener IDs únicos de especialistas de los servicios
  const specialistIds = new Set<string>()
  services.forEach((s) => {
    if (s.specialist_id) {
      specialistIds.add(s.specialist_id)
    }
  })
  // Fallback al especialista principal si no hay en servicios
  if (specialistIds.size === 0 && appointment.specialist_id) {
    specialistIds.add(appointment.specialist_id)
  }

  // Obtener datos de todos los especialistas
  let allSpecialists: { first_name: string; last_name?: string }[] = []
  if (specialistIds.size > 0) {
    const { data: specialists } = await supabase
      .from('specialists')
      .select('first_name, last_name')
      .in('id', Array.from(specialistIds))
    allSpecialists = specialists || []
  }

  // Obtener datos del cliente desde business_customers
  const { data: customer } = await supabase
    .from('business_customers')
    .select('first_name, last_name, phone, email')
    .eq('user_profile_id', appointment.users_profile_id)
    .eq('business_id', appointment.business_id)
    .single()

  // Si no hay cliente en business_customers, intentar con users_profile + auth
  let customerPhone: string | null = customer?.phone || null
  let customerName: string = customer
    ? `${customer.first_name} ${customer.last_name || ''}`.trim()
    : 'Cliente'

  if (!customerPhone) {
    // Fallback: buscar en users_profile y auth
    const { data: userProfile } = await supabase
      .from('users_profile')
      .select('user_id')
      .eq('id', appointment.users_profile_id)
      .single()

    if (userProfile?.user_id) {
      const { data: authData } = await supabase.auth.admin.getUserById(userProfile.user_id)
      const authUser = authData?.user
      // Buscar phone en auth.users.phone o en user_metadata.phone
      customerPhone = authUser?.phone || authUser?.user_metadata?.phone || null
      if (!customerName || customerName === 'Cliente') {
        customerName = authUser?.user_metadata?.name || 'Cliente'
      }
    }
  }

  if (!customerPhone) {
    console.log('No phone found for customer with profile:', appointment.users_profile_id)
    return
  }

  // Obtener nombres de servicios
  const serviceIds = services.map((s) => s.service_id)
  const { data: serviceData } = await supabase
    .from('services')
    .select('id, name')
    .in('id', serviceIds)

  const serviceMap = new Map(serviceData?.map((s: any) => [s.id, s.name]) || [])

  const servicesWithNames = services.map((s) => ({
    name: (serviceMap.get(s.service_id) as string) || 'Servicio',
    duration_minutes: s.duration_minutes,
    price_cents: s.price_at_booking_cents,
  }))

  // Construir nombre(s) del/los especialista(s)
  const specialistName = allSpecialists.length > 0
    ? allSpecialists
        .map((s) => `${s.first_name} ${s.last_name || ''}`.trim())
        .join(', ')
    : 'Especialista'

  // Importar dinamicamente para evitar dependencias circulares
  const { createScheduledReminderAction } = await import('./whatsapp')
  const WhatsAppService = (await import('@/lib/services/whatsapp/whatsapp-service')).default

  const whatsappService = new WhatsAppService()

  console.log('📱 Sending WhatsApp notification:', {
    business_account_id: business.business_account_id,
    business_id: appointment.business_id,
    customer_phone: customerPhone,
    customer_name: customerName,
  })

  // Enviar confirmacion de cita
  const result = await whatsappService.sendAppointmentConfirmation({
    business_account_id: business.business_account_id,
    business_id: appointment.business_id,
    customer_phone: customerPhone,
    customer_name: customerName,
    appointment_date: new Date(appointment.start_time),
    services: servicesWithNames,
    specialist_name: specialistName,
    business_name: business.name,
    business_address: business.address,
    business_phone: business.phone_number,
    total_price_cents: appointment.total_price_cents || 0,
  })

  console.log('📱 WhatsApp notification result:', result)

  // Programar recordatorio 2 horas antes
  const appointmentDate = new Date(appointment.start_time)
  const reminderDate = new Date(appointmentDate.getTime() - 2 * 60 * 60 * 1000) // 2 horas antes

  // Solo programar si la cita es en el futuro (mas de 2 horas)
  if (reminderDate > new Date()) {
    await createScheduledReminderAction({
      appointment_id: appointment.id,
      business_account_id: business.business_account_id,
      business_id: appointment.business_id,
      customer_phone: customerPhone,
      customer_name: customerName,
      scheduled_for: reminderDate.toISOString(),
      reminder_type: 'appointment_reminder',
    })
  }
}

interface StatusNotificationParams {
  appointmentId: string
  currentStatus: string
  newStatus?: string
  currentStartTime: string
  newStartTime?: string
  businessId: string
  specialistId: string
  usersProfileId: string
}

async function sendAppointmentStatusNotifications(
  supabase: any,
  params: StatusNotificationParams
) {
  const statusChanged = params.newStatus && params.newStatus !== params.currentStatus
  const timeChanged = params.newStartTime && params.newStartTime !== params.currentStartTime

  if (!statusChanged && !timeChanged) return

  // Obtener datos del negocio
  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, business_account_id, address, phone_number')
    .eq('id', params.businessId)
    .single()

  if (!business?.business_account_id) return

  // Obtener datos del cliente
  const { data: customer } = await supabase
    .from('business_customers')
    .select('first_name, last_name, phone')
    .eq('user_profile_id', params.usersProfileId)
    .eq('business_id', params.businessId)
    .single()

  let customerPhone = customer?.phone || null
  let customerName = customer
    ? `${customer.first_name} ${customer.last_name || ''}`.trim()
    : 'Cliente'

  if (!customerPhone) {
    const { data: userProfile } = await supabase
      .from('users_profile')
      .select('user_id')
      .eq('id', params.usersProfileId)
      .single()

    if (userProfile?.user_id) {
      const { data: authData } = await supabase.auth.admin.getUserById(userProfile.user_id)
      customerPhone = authData?.user?.phone || authData?.user?.user_metadata?.phone || null
      if (!customerName || customerName === 'Cliente') {
        customerName = authData?.user?.user_metadata?.name || 'Cliente'
      }
    }
  }

  if (!customerPhone) return

  // Obtener servicios de la cita con especialistas
  const { data: appointmentServices } = await supabase
    .from('appointment_services')
    .select(`
      service:services(id, name),
      duration_minutes,
      price_at_booking_cents,
      specialist:specialists(id, first_name, last_name)
    `)
    .eq('appointment_id', params.appointmentId)

  const services = (appointmentServices || []).map((as: any) => ({
    name: as.service?.name || 'Servicio',
    duration_minutes: as.duration_minutes,
    price_cents: as.price_at_booking_cents,
  }))

  // Obtener especialistas únicos de los servicios
  const uniqueSpecialists = new Map<string, { first_name: string; last_name?: string }>()
  ;(appointmentServices || []).forEach((as: any) => {
    if (as.specialist?.id && !uniqueSpecialists.has(as.specialist.id)) {
      uniqueSpecialists.set(as.specialist.id, {
        first_name: as.specialist.first_name,
        last_name: as.specialist.last_name,
      })
    }
  })

  // Fallback al especialista principal si no hay en servicios
  if (uniqueSpecialists.size === 0 && params.specialistId) {
    const { data: specialist } = await supabase
      .from('specialists')
      .select('first_name, last_name')
      .eq('id', params.specialistId)
      .single()
    if (specialist) {
      uniqueSpecialists.set(params.specialistId, specialist)
    }
  }

  // Construir nombre(s) del/los especialista(s)
  const specialistName = uniqueSpecialists.size > 0
    ? Array.from(uniqueSpecialists.values())
        .map((s) => `${s.first_name} ${s.last_name || ''}`.trim())
        .join(', ')
    : 'Especialista'

  const { cancelScheduledRemindersAction, createScheduledReminderAction } = await import('./whatsapp')
  const WhatsAppService = (await import('@/lib/services/whatsapp/whatsapp-service')).default
  const whatsappService = new WhatsAppService()

  // Manejar cambio de estado
  if (statusChanged) {
    // CANCELACIÓN
    if (params.newStatus === 'CANCELLED') {
      await cancelScheduledRemindersAction(params.appointmentId)
      await whatsappService.sendAppointmentCancellation({
        business_account_id: business.business_account_id,
        business_id: params.businessId,
        customer_phone: customerPhone,
        customer_name: customerName,
        appointment_date: new Date(params.currentStartTime),
        business_name: business.name,
      })
      return
    }

    // CONFIRMACIÓN (de PENDING a CONFIRMED)
    if (params.newStatus === 'CONFIRMED' && params.currentStatus === 'PENDING') {
      const totalPriceCents = services.reduce((acc: number, s: any) => acc + s.price_cents, 0)
      await whatsappService.sendAppointmentConfirmation({
        business_account_id: business.business_account_id,
        business_id: params.businessId,
        customer_phone: customerPhone,
        customer_name: customerName,
        appointment_date: new Date(params.newStartTime || params.currentStartTime),
        services,
        specialist_name: specialistName,
        business_name: business.name,
        business_address: business.address,
        business_phone: business.phone_number,
        total_price_cents: totalPriceCents,
      })

      // Programar recordatorio
      const appointmentDate = new Date(params.newStartTime || params.currentStartTime)
      const reminderDate = new Date(appointmentDate.getTime() - 2 * 60 * 60 * 1000)
      if (reminderDate > new Date()) {
        await createScheduledReminderAction({
          appointment_id: params.appointmentId,
          business_account_id: business.business_account_id,
          business_id: params.businessId,
          customer_phone: customerPhone,
          customer_name: customerName,
          scheduled_for: reminderDate.toISOString(),
          reminder_type: 'appointment_reminder',
        })
      }
      return
    }

    // COMPLETADA
    if (params.newStatus === 'COMPLETED' && params.currentStatus !== 'COMPLETED') {
      const result = await whatsappService.sendAppointmentCompleted({
        business_account_id: business.business_account_id,
        business_id: params.businessId,
        customer_phone: customerPhone,
        customer_name: customerName,
        services,
        specialist_name: specialistName,
        business_name: business.name,
      })
      if (!result.success) {
        console.error('Error sending appointment completed notification:', result.error)
      }
      return
    }
  }

  // REPROGRAMACIÓN (cambio de fecha/hora sin cambio de estado a cancelado)
  if (timeChanged && params.newStatus !== 'CANCELLED') {
    await cancelScheduledRemindersAction(params.appointmentId)

    await whatsappService.sendAppointmentRescheduled({
      business_account_id: business.business_account_id,
      business_id: params.businessId,
      customer_phone: customerPhone,
      customer_name: customerName,
      old_date: new Date(params.currentStartTime),
      new_date: new Date(params.newStartTime!),
      specialist_name: specialistName,
      business_name: business.name,
      business_address: business.address,
      business_phone: business.phone_number,
    })

    // Reprogramar recordatorio
    const newAppointmentDate = new Date(params.newStartTime!)
    const reminderDate = new Date(newAppointmentDate.getTime() - 2 * 60 * 60 * 1000)
    if (reminderDate > new Date()) {
      await createScheduledReminderAction({
        appointment_id: params.appointmentId,
        business_account_id: business.business_account_id,
        business_id: params.businessId,
        customer_phone: customerPhone,
        customer_name: customerName,
        scheduled_for: reminderDate.toISOString(),
        reminder_type: 'appointment_reminder',
      })
    }
  }
}

export async function updateAppointmentAction(
  id: string,
  data: AppointmentUpdate,
  options?: {
    generateInvoice?: boolean
    businessData?: { name: string; address?: string; phone?: string; nit?: string }
    services?: AppointmentServiceInput[]
    supplies?: AppointmentSupplyInput[]
    sendWhatsAppNotification?: boolean
  }
): Promise<{ success: boolean; data?: Appointment; error?: string; invoiceGenerated?: boolean; stockDeducted?: boolean; commissionGenerated?: boolean }> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { data: currentAppointment } = await supabase
      .from('appointments')
      .select('payment_status, business_id, status, start_time, specialist_id, users_profile_id')
      .eq('id', id)
      .single()

    const appointment = await updateRecord<Appointment>('appointments', id, data)

    if (!appointment) {
      return { success: false, error: 'Error al actualizar la cita' }
    }

    // Update services if provided
    if (options?.services) {
      await supabase.from('appointment_services').delete().eq('appointment_id', id)

      if (options.services.length > 0) {
        const specialistId = data.specialist_id || currentAppointment?.specialist_id
        const appointmentServices = options.services.map((service) => ({
          appointment_id: id,
          service_id: service.service_id,
          specialist_id: service.specialist_id || specialistId,
          price_at_booking_cents: service.price_at_booking_cents,
          duration_minutes: service.duration_minutes,
          start_time: service.start_time || null,
          end_time: service.end_time || null,
        }))

        const { error: servicesError } = await supabase
          .from('appointment_services')
          .insert(appointmentServices)

        if (servicesError) {
          console.error('Error updating appointment services:', servicesError)
        }
      }
    }

    // Update supplies if provided
    if (options?.supplies) {
      await supabase.from('appointment_supplies').delete().eq('appointment_id', id)

      if (options.supplies.length > 0) {
        const appointmentSupplies = options.supplies.map((supply) => ({
          appointment_id: id,
          product_id: supply.product_id,
          quantity_used: supply.quantity_used,
          unit_price_cents: supply.unit_price_cents,
          total_price_cents: Math.round(supply.quantity_used * supply.unit_price_cents),
        }))

        const { error: suppliesError } = await supabase
          .from('appointment_supplies')
          .insert(appointmentSupplies)

        if (suppliesError) {
          console.error('Error updating appointment supplies:', suppliesError)
        }
      }
    }

    let invoiceGenerated = false
    let stockDeducted = false
    let commissionGenerated = false

    // Check if appointment is being completed
    const isBeingCompleted =
      data.status === 'COMPLETED' &&
      currentAppointment?.status !== 'COMPLETED'

    if (isBeingCompleted && currentAppointment?.business_id) {
      // Deduct stock if there are supplies
      const { data: supplies } = await supabase
        .from('appointment_supplies')
        .select('product_id, quantity_used, unit_price_cents')
        .eq('appointment_id', id)

      if (supplies && supplies.length > 0) {
        const { createBulkConsumptionAction } = await import('./inventory')
        const consumptionResult = await createBulkConsumptionAction(
          id,
          currentAppointment.business_id,
          supplies.map((s) => ({
            product_id: s.product_id,
            quantity: s.quantity_used,
            unit_price_cents: s.unit_price_cents,
          }))
        )
        stockDeducted = consumptionResult.success
      }

      // Calculate commission for specialist (independent of supplies)
      const specialistId = data.specialist_id || currentAppointment.specialist_id
      if (specialistId) {
        try {
          const { calculateAndCreateCommissionAction } = await import('./commission')
          const commissionResult = await calculateAndCreateCommissionAction(
            id,
            currentAppointment.business_id,
            specialistId
          )
          commissionGenerated = commissionResult.success
          if (!commissionResult.success) {
            console.log('Commission result:', commissionResult.error)
          }
        } catch (commissionError) {
          console.error('Error calculating commission:', commissionError)
        }
      }
    }

    const shouldGenerateInvoice =
      data.payment_status === 'PAID' &&
      currentAppointment?.payment_status !== 'PAID' &&
      options?.generateInvoice !== false

    if (shouldGenerateInvoice && options?.businessData) {
      const { createInvoiceFromAppointmentAction } = await import('./invoice')
      const invoiceResult = await createInvoiceFromAppointmentAction(id, {
        business_name: options.businessData.name,
        business_address: options.businessData.address,
        business_phone: options.businessData.phone,
        business_nit: options.businessData.nit,
      })
      invoiceGenerated = invoiceResult.success
    }

    // Enviar notificaciones WhatsApp según cambio de estado
    if (options?.sendWhatsAppNotification !== false && currentAppointment) {
      try {
        await sendAppointmentStatusNotifications(supabase, {
          appointmentId: id,
          currentStatus: currentAppointment.status,
          newStatus: data.status,
          currentStartTime: currentAppointment.start_time,
          newStartTime: data.start_time,
          businessId: currentAppointment.business_id,
          specialistId: data.specialist_id || currentAppointment.specialist_id,
          usersProfileId: currentAppointment.users_profile_id,
        })
      } catch (notificationError) {
        console.error('Error sending status notifications:', notificationError)
      }
    }

    return { success: true, data: appointment, invoiceGenerated, stockDeducted, commissionGenerated }
  } catch (error: any) {
    console.error('Error updating appointment:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}

export async function deleteAppointmentAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await deleteRecord('appointments', id)
    return { success: true }
  } catch (error: any) {
    console.error('Error deleting appointment:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}
