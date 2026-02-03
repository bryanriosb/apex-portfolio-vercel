import { NextRequest, NextResponse } from 'next/server'
import {
  fetchPendingRemindersAction,
  markReminderAsSentAction,
  markReminderAsFailedAction,
} from '@/lib/actions/whatsapp'
import { getAppointmentByIdAction } from '@/lib/actions/appointment'
import WhatsAppService from '@/lib/services/whatsapp/whatsapp-service'

// Cron secret para validar que la peticion viene del cron job
const CRON_SECRET = process.env.CRON_SECRET

export async function GET(request: NextRequest) {
  try {
    // Validar el secret del cron
    const authHeader = request.headers.get('authorization')
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const reminders = await fetchPendingRemindersAction()

    if (reminders.length === 0) {
      return NextResponse.json({
        status: 'ok',
        processed: 0,
        message: 'No pending reminders',
      })
    }

    const whatsappService = new WhatsAppService()
    let sent = 0
    let failed = 0

    for (const reminder of reminders) {
      try {
        // Obtener datos de la cita
        const appointment = await getAppointmentByIdAction(reminder.appointment_id, true)

        if (!appointment) {
          await markReminderAsFailedAction(reminder.id, 'Cita no encontrada')
          failed++
          continue
        }

        // Verificar que la cita no esté cancelada
        if (appointment.status === 'CANCELLED') {
          await markReminderAsFailedAction(reminder.id, 'Cita cancelada')
          failed++
          continue
        }

        // Obtener datos del negocio
        const business = (appointment as any).business
        const specialist = (appointment as any).specialist
        const services = (appointment as any).appointment_services || []

        // Enviar el recordatorio
        const result = await whatsappService.sendAppointmentReminder({
          business_account_id: reminder.business_account_id,
          business_id: reminder.business_id,
          customer_phone: reminder.customer_phone,
          customer_name: reminder.customer_name,
          appointment_date: new Date(appointment.start_time),
          services: services.map((s: any) => ({
            name: s.service?.name || 'Servicio',
            duration_minutes: s.duration_minutes || 0,
            price_cents: s.price_at_booking_cents || 0,
          })),
          specialist_name: specialist
            ? `${specialist.first_name} ${specialist.last_name || ''}`.trim()
            : 'Especialista',
          business_name: business?.name || 'Negocio',
          business_address: business?.address,
          total_price_cents: appointment.total_price_cents || 0,
        })

        if (result.success) {
          await markReminderAsSentAction(reminder.id)
          sent++
        } else {
          await markReminderAsFailedAction(reminder.id, result.error || 'Error desconocido')
          failed++
        }
      } catch (error) {
        console.error('Error processing reminder:', reminder.id, error)
        await markReminderAsFailedAction(
          reminder.id,
          error instanceof Error ? error.message : 'Error desconocido'
        )
        failed++
      }
    }

    return NextResponse.json({
      status: 'ok',
      processed: reminders.length,
      sent,
      failed,
    })
  } catch (error) {
    console.error('Error in process-reminders cron:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
