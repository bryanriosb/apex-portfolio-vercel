'use server'

import {
  getRecordById,
  insertRecord,
  updateRecord,
  deleteRecord,
  getSupabaseAdminClient,
} from '@/lib/actions/supabase'
import { incrementInvoiceNumberAction } from '@/lib/actions/invoice-settings'
import type { Invoice, InvoiceInsert, InvoiceUpdate } from '@/lib/models/invoice/invoice'

export interface InvoiceListResponse {
  data: Invoice[]
  total: number
  total_pages: number
}

export async function fetchInvoicesAction(params?: {
  page?: number
  page_size?: number
  business_id?: string
  status?: string
  search?: string
}): Promise<InvoiceListResponse> {
  try {
    if (!params?.business_id) {
      return { data: [], total: 0, total_pages: 0 }
    }

    const supabase = await getSupabaseAdminClient()

    let query = supabase
      .from('invoices')
      .select('*', { count: 'exact' })
      .eq('business_id', params.business_id)
      .order('created_at', { ascending: false })

    if (params.status) {
      query = query.eq('status', params.status)
    }

    if (params.search) {
      const searchTerm = `%${params.search}%`
      query = query.or(
        `invoice_number.ilike.${searchTerm},customer_name.ilike.${searchTerm},customer_email.ilike.${searchTerm}`
      )
    }

    const page = params.page || 1
    const pageSize = params.page_size || 20
    const start = (page - 1) * pageSize
    const end = start + pageSize - 1

    query = query.range(start, end)

    const { data, error, count } = await query

    if (error) throw error

    return {
      data: data || [],
      total: count || 0,
      total_pages: Math.ceil((count || 0) / pageSize),
    }
  } catch (error) {
    console.error('Error fetching invoices:', error)
    return { data: [], total: 0, total_pages: 0 }
  }
}

export async function getInvoiceByIdAction(id: string): Promise<Invoice | null> {
  try {
    return await getRecordById<Invoice>('invoices', id)
  } catch (error) {
    console.error('Error fetching invoice:', error)
    return null
  }
}

export async function getNextInvoiceNumberAction(businessId: string): Promise<string> {
  try {
    const { prefix, number } = await incrementInvoiceNumberAction(businessId)
    // padStart solo aplica si el número tiene menos de 4 dígitos
    const formattedNumber = number.toString().length < 4
      ? number.toString().padStart(4, '0')
      : number.toString()
    return `${prefix}-${formattedNumber}`
  } catch (error) {
    console.error('Error getting next invoice number:', error)
    return `FAC-${Date.now()}`
  }
}

export async function createInvoiceAction(
  data: InvoiceInsert
): Promise<{ success: boolean; data?: Invoice; error?: string }> {
  try {
    const invoice = await insertRecord<Invoice>('invoices', {
      ...data,
      status: data.status || 'DRAFT',
      tax_rate: data.tax_rate ?? 19,
      discount_cents: data.discount_cents ?? 0,
    })

    if (!invoice) {
      return { success: false, error: 'Error al crear la factura' }
    }

    return { success: true, data: invoice }
  } catch (error: any) {
    console.error('Error creating invoice:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}

export async function updateInvoiceAction(
  id: string,
  data: InvoiceUpdate
): Promise<{ success: boolean; data?: Invoice; error?: string }> {
  try {
    const invoice = await updateRecord<Invoice>('invoices', id, data)

    if (!invoice) {
      return { success: false, error: 'Error al actualizar la factura' }
    }

    return { success: true, data: invoice }
  } catch (error: any) {
    console.error('Error updating invoice:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}

export async function deleteInvoiceAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await deleteRecord('invoices', id)
    return { success: true }
  } catch (error: any) {
    console.error('Error deleting invoice:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}

export async function getInvoiceByAppointmentAction(
  appointmentId: string
): Promise<Invoice | null> {
  try {
    const supabase = await getSupabaseAdminClient()
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('appointment_id', appointmentId)
      .maybeSingle()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching invoice by appointment:', error)
    return null
  }
}

export async function createInvoiceFromAppointmentAction(
  appointmentId: string,
  businessData: {
    business_name: string
    business_address?: string
    business_phone?: string
    business_nit?: string
  }
): Promise<{ success: boolean; data?: Invoice; error?: string }> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select(`
        *,
        appointment_services (
          id,
          service_id,
          price_at_booking_cents,
          duration_minutes,
          service:services (
            id,
            name,
            tax_rate
          )
        ),
        appointment_supplies (
          id,
          product_id,
          quantity_used,
          unit_price_cents,
          total_price_cents,
          product:products (
            id,
            name,
            tax_rate
          )
        )
      `)
      .eq('id', appointmentId)
      .single()

    if (appointmentError || !appointment) {
      console.error('Error fetching appointment:', appointmentError)
      return { success: false, error: 'Cita no encontrada' }
    }

    const { data: businessCustomer } = await supabase
      .from('business_customers')
      .select(`
        id,
        first_name,
        last_name,
        email,
        phone,
        user_profile:users_profile (
          identification_type,
          identification_number,
          city,
          state
        )
      `)
      .eq('business_id', appointment.business_id)
      .eq('user_profile_id', appointment.users_profile_id)
      .maybeSingle()

    if (appointment.payment_status !== 'PAID') {
      return { success: false, error: 'La cita debe estar pagada para generar factura' }
    }

    const { data: existingInvoice } = await supabase
      .from('invoices')
      .select('id')
      .eq('appointment_id', appointmentId)
      .maybeSingle()

    if (existingInvoice) {
      return { success: false, error: 'Ya existe una factura para esta cita' }
    }

    const invoiceNumber = await getNextInvoiceNumberAction(appointment.business_id)

    const userProfile = businessCustomer?.user_profile as any

    // Items de servicios
    const serviceItems = (appointment.appointment_services || []).map((as: any) => {
      const serviceTaxRate = as.service?.tax_rate ?? null
      const totalCentsItem = as.price_at_booking_cents
      let taxCentsItem = 0

      if (serviceTaxRate !== null && serviceTaxRate > 0) {
        const subtotalItem = Math.round(totalCentsItem / (1 + serviceTaxRate / 100))
        taxCentsItem = totalCentsItem - subtotalItem
      }

      return {
        service_id: as.service_id,
        name: as.service?.name || 'Servicio',
        quantity: 1,
        unit_price_cents: as.price_at_booking_cents,
        total_cents: as.price_at_booking_cents,
        tax_rate: serviceTaxRate,
        tax_cents: taxCentsItem,
      }
    })

    // Items de insumos/productos utilizados
    const supplyItems = (appointment.appointment_supplies || []).map((sup: any) => {
      const productTaxRate = sup.product?.tax_rate ?? null
      const totalCentsItem = sup.total_price_cents
      let taxCentsItem = 0

      if (productTaxRate !== null && productTaxRate > 0) {
        const subtotalItem = Math.round(totalCentsItem / (1 + productTaxRate / 100))
        taxCentsItem = totalCentsItem - subtotalItem
      }

      return {
        product_id: sup.product_id,
        name: sup.product?.name || 'Insumo',
        quantity: sup.quantity_used,
        unit_price_cents: sup.unit_price_cents,
        total_cents: totalCentsItem,
        tax_rate: productTaxRate,
        tax_cents: taxCentsItem,
      }
    })

    // Combinar servicios e insumos
    const items = [...serviceItems, ...supplyItems]

    const totalCents = items.reduce((sum: number, item: any) => sum + item.total_cents, 0)
    const taxCents = items.reduce((sum: number, item: any) => sum + item.tax_cents, 0)
    const subtotalCents = totalCents - taxCents
    const taxRate = taxCents > 0 ? Math.round((taxCents / subtotalCents) * 100) : 0

    const customerAddress = userProfile
      ? `${userProfile.city || ''}, ${userProfile.state || ''}`.trim().replace(/^,\s*|,\s*$/g, '')
      : null

    const invoiceData: InvoiceInsert = {
      business_id: appointment.business_id,
      appointment_id: appointmentId,
      invoice_number: invoiceNumber,
      customer_name: `${businessCustomer?.first_name || ''} ${businessCustomer?.last_name || ''}`.trim() || 'Cliente',
      customer_email: businessCustomer?.email,
      customer_phone: businessCustomer?.phone,
      customer_identification_type: userProfile?.identification_type,
      customer_identification_number: userProfile?.identification_number,
      customer_address: customerAddress || null,
      business_name: businessData.business_name,
      business_address: businessData.business_address,
      business_phone: businessData.business_phone,
      business_nit: businessData.business_nit,
      subtotal_cents: subtotalCents,
      tax_rate: taxRate,
      tax_cents: taxCents,
      discount_cents: appointment.discount_cents || 0,
      total_cents: totalCents - (appointment.discount_cents || 0),
      status: 'ISSUED',
      payment_method: appointment.payment_method,
      items,
      issued_at: new Date().toISOString(),
    }

    return await createInvoiceAction(invoiceData)
  } catch (error: any) {
    console.error('Error creating invoice from appointment:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}
