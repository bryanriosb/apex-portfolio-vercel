'use server'

import { getSupabaseAdminClient } from '@/lib/actions/supabase'
import type {
  InvoiceSettings,
  InvoiceSettingsInsert,
  InvoiceSettingsUpdate,
} from '@/lib/models/invoice/invoice-settings'

export async function getInvoiceSettingsAction(
  businessId: string
): Promise<InvoiceSettings | null> {
  try {
    const supabase = await getSupabaseAdminClient()
    const { data, error } = await supabase
      .from('invoice_settings')
      .select('*')
      .eq('business_id', businessId)
      .maybeSingle()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching invoice settings:', error)
    return null
  }
}

export async function getOrCreateInvoiceSettingsAction(
  businessId: string
): Promise<InvoiceSettings> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { data: existing } = await supabase
      .from('invoice_settings')
      .select('*')
      .eq('business_id', businessId)
      .maybeSingle()

    if (existing) return existing

    const { data: created, error } = await supabase
      .from('invoice_settings')
      .insert({ business_id: businessId, prefix: 'FAC', next_number: 1 })
      .select()
      .single()

    if (error) throw error
    return created
  } catch (error) {
    console.error('Error getting/creating invoice settings:', error)
    return {
      id: '',
      business_id: businessId,
      prefix: 'FAC',
      next_number: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  }
}

export async function updateInvoiceSettingsAction(
  businessId: string,
  data: InvoiceSettingsUpdate
): Promise<{ success: boolean; data?: InvoiceSettings; error?: string }> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { data: existing } = await supabase
      .from('invoice_settings')
      .select('id')
      .eq('business_id', businessId)
      .maybeSingle()

    let result
    if (existing) {
      result = await supabase
        .from('invoice_settings')
        .update(data)
        .eq('business_id', businessId)
        .select()
        .single()
    } else {
      result = await supabase
        .from('invoice_settings')
        .insert({ business_id: businessId, ...data })
        .select()
        .single()
    }

    if (result.error) throw result.error
    return { success: true, data: result.data }
  } catch (error: any) {
    console.error('Error updating invoice settings:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}

export async function incrementInvoiceNumberAction(
  businessId: string
): Promise<{ prefix: string; number: number }> {
  try {
    const supabase = await getSupabaseAdminClient()

    const settings = await getOrCreateInvoiceSettingsAction(businessId)
    const currentNumber = settings.next_number

    await supabase
      .from('invoice_settings')
      .update({ next_number: currentNumber + 1 })
      .eq('business_id', businessId)

    return { prefix: settings.prefix, number: currentNumber }
  } catch (error) {
    console.error('Error incrementing invoice number:', error)
    return { prefix: 'FAC', number: Date.now() }
  }
}
