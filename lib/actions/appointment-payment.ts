'use server'

import { getSupabaseAdminClient } from '@/lib/actions/supabase'
import type {
  AppointmentPayment,
  AppointmentPaymentInsert,
  AppointmentPaymentWithCreator,
} from '@/lib/models/appointment-payment/appointment-payment'
import type { PaymentStatus } from '@/lib/types/enums'

function calculatePaymentStatus(
  totalPriceCents: number,
  amountPaidCents: number
): PaymentStatus {
  if (amountPaidCents >= totalPriceCents) return 'PAID'
  if (amountPaidCents > 0) return 'PARTIAL'
  return 'UNPAID'
}

export async function fetchPaymentsByAppointmentAction(
  appointmentId: string
): Promise<AppointmentPaymentWithCreator[]> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { data, error } = await supabase
      .from('appointment_payments')
      .select(`
        *,
        creator:users_profile!appointment_payments_created_by_fkey(
          id,
          user_id,
          profile_picture_url
        )
      `)
      .eq('appointment_id', appointmentId)
      .order('payment_date', { ascending: false })

    if (error) {
      console.error('Error fetching payments:', error)
      return []
    }

    const paymentsWithUserData = await Promise.all(
      (data || []).map(async (payment: any) => {
        if (payment.creator?.user_id) {
          const { data: authUser } = await supabase.auth.admin.getUserById(
            payment.creator.user_id
          )
          return {
            ...payment,
            creator: {
              ...payment.creator,
              user: authUser?.user
                ? {
                    name: authUser.user.user_metadata?.name,
                    email: authUser.user.email,
                  }
                : null,
            },
          }
        }
        return payment
      })
    )

    return paymentsWithUserData
  } catch (error) {
    console.error('Error fetching payments:', error)
    return []
  }
}

export async function createPaymentAction(
  data: AppointmentPaymentInsert
): Promise<{ success: boolean; data?: AppointmentPayment; error?: string }> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select('total_price_cents, amount_paid_cents, payment_status')
      .eq('id', data.appointment_id)
      .single()

    if (appointmentError || !appointment) {
      return { success: false, error: 'Cita no encontrada' }
    }

    const currentAmountPaid = appointment.amount_paid_cents || 0
    const balanceDue = appointment.total_price_cents - currentAmountPaid

    if (data.amount_cents > balanceDue) {
      return {
        success: false,
        error: `El abono excede el saldo pendiente de $${(balanceDue / 100).toLocaleString('es-CO')}`,
      }
    }

    const { data: payment, error: paymentError } = await supabase
      .from('appointment_payments')
      .insert(data)
      .select()
      .single()

    if (paymentError || !payment) {
      return {
        success: false,
        error: paymentError?.message || 'Error al registrar el abono',
      }
    }

    const newAmountPaid = currentAmountPaid + data.amount_cents
    const newPaymentStatus = calculatePaymentStatus(
      appointment.total_price_cents,
      newAmountPaid
    )

    const { error: updateError } = await supabase
      .from('appointments')
      .update({ payment_status: newPaymentStatus })
      .eq('id', data.appointment_id)

    if (updateError) {
      console.error('Error updating appointment payment status:', updateError)
    }

    return { success: true, data: payment as AppointmentPayment }
  } catch (error: any) {
    console.error('Error creating payment:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}

export async function deletePaymentAction(
  paymentId: string,
  appointmentId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { data: payment, error: paymentError } = await supabase
      .from('appointment_payments')
      .select('amount_cents')
      .eq('id', paymentId)
      .single()

    if (paymentError || !payment) {
      return { success: false, error: 'Pago no encontrado' }
    }

    const { error: deleteError } = await supabase
      .from('appointment_payments')
      .delete()
      .eq('id', paymentId)

    if (deleteError) {
      return { success: false, error: deleteError.message }
    }

    const { data: appointment } = await supabase
      .from('appointments')
      .select('total_price_cents, amount_paid_cents')
      .eq('id', appointmentId)
      .single()

    if (appointment) {
      const newPaymentStatus = calculatePaymentStatus(
        appointment.total_price_cents,
        appointment.amount_paid_cents || 0
      )

      await supabase
        .from('appointments')
        .update({ payment_status: newPaymentStatus })
        .eq('id', appointmentId)
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error deleting payment:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}

export interface AccountsReceivableItem {
  appointment_id: string
  customer_id: string | null
  customer_name: string
  customer_email: string | null
  customer_phone: string | null
  appointment_date: string
  total_price_cents: number
  amount_paid_cents: number
  balance_due_cents: number
  last_payment_date: string | null
  specialist_name: string
}

export interface AccountsReceivableSummary {
  total_receivable_cents: number
  total_appointments: number
  items: AccountsReceivableItem[]
}

export async function fetchAccountsReceivableAction(params: {
  business_id: string
  start_date?: string
  end_date?: string
  customer_id?: string
}): Promise<AccountsReceivableSummary> {
  try {
    const supabase = await getSupabaseAdminClient()

    let query = supabase
      .from('appointments')
      .select(`
        id,
        start_time,
        total_price_cents,
        amount_paid_cents,
        users_profile_id,
        user_profile:users_profile!appointments_users_profile_id_fkey(
          id,
          user_id
        ),
        specialist:specialists(
          first_name,
          last_name
        )
      `)
      .eq('business_id', params.business_id)
      .in('payment_status', ['UNPAID', 'PARTIAL'])
      .not('status', 'eq', 'CANCELLED')

    if (params.start_date) {
      query = query.gte('start_time', params.start_date)
    }

    if (params.end_date) {
      query = query.lte('start_time', params.end_date)
    }

    if (params.customer_id) {
      query = query.eq('users_profile_id', params.customer_id)
    }

    const { data: appointments, error } = await query.order('start_time', {
      ascending: false,
    })

    if (error) {
      console.error('Error fetching accounts receivable:', error)
      return {
        total_receivable_cents: 0,
        total_appointments: 0,
        items: [],
      }
    }

    const items: AccountsReceivableItem[] = await Promise.all(
      (appointments || []).map(async (apt: any) => {
        let customerName = 'Cliente'
        let customerEmail: string | null = null
        let customerPhone: string | null = null

        if (apt.user_profile?.user_id) {
          const { data: authUser } = await supabase.auth.admin.getUserById(
            apt.user_profile.user_id
          )
          if (authUser?.user) {
            customerName =
              authUser.user.user_metadata?.name ||
              authUser.user.user_metadata?.full_name ||
              authUser.user.email?.split('@')[0] ||
              'Cliente'
            customerEmail = authUser.user.email || null
            customerPhone = authUser.user.phone || null
          }
        }

        const { data: lastPayment } = await supabase
          .from('appointment_payments')
          .select('payment_date')
          .eq('appointment_id', apt.id)
          .order('payment_date', { ascending: false })
          .limit(1)
          .single()

        const amountPaid = apt.amount_paid_cents || 0

        return {
          appointment_id: apt.id,
          customer_id: apt.users_profile_id || null,
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone,
          appointment_date: apt.start_time,
          total_price_cents: apt.total_price_cents,
          amount_paid_cents: amountPaid,
          balance_due_cents: apt.total_price_cents - amountPaid,
          last_payment_date: lastPayment?.payment_date || null,
          specialist_name: apt.specialist
            ? `${apt.specialist.first_name} ${apt.specialist.last_name || ''}`.trim()
            : 'Sin asignar',
        }
      })
    )

    const totalReceivable = items.reduce(
      (sum, item) => sum + item.balance_due_cents,
      0
    )

    return {
      total_receivable_cents: totalReceivable,
      total_appointments: items.length,
      items,
    }
  } catch (error) {
    console.error('Error fetching accounts receivable:', error)
    return {
      total_receivable_cents: 0,
      total_appointments: 0,
      items: [],
    }
  }
}

export async function fetchPendingBalanceStatsAction(
  businessId: string
): Promise<{
  total_pending_cents: number
  appointments_with_balance: number
  partial_payments_count: number
}> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { data: appointments, error } = await supabase
      .from('appointments')
      .select('total_price_cents, amount_paid_cents, payment_status')
      .eq('business_id', businessId)
      .in('payment_status', ['UNPAID', 'PARTIAL'])
      .not('status', 'eq', 'CANCELLED')

    if (error) {
      console.error('Error fetching pending balance stats:', error)
      return {
        total_pending_cents: 0,
        appointments_with_balance: 0,
        partial_payments_count: 0,
      }
    }

    const totalPending = (appointments || []).reduce((sum, apt) => {
      const amountPaid = apt.amount_paid_cents || 0
      return sum + (apt.total_price_cents - amountPaid)
    }, 0)

    const partialCount = (appointments || []).filter(
      (apt) => apt.payment_status === 'PARTIAL'
    ).length

    return {
      total_pending_cents: totalPending,
      appointments_with_balance: appointments?.length || 0,
      partial_payments_count: partialCount,
    }
  } catch (error) {
    console.error('Error fetching pending balance stats:', error)
    return {
      total_pending_cents: 0,
      appointments_with_balance: 0,
      partial_payments_count: 0,
    }
  }
}
