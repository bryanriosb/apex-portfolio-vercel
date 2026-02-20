'use server'

import * as XLSX from 'xlsx'
import { getSupabaseAdminClient } from '@/lib/actions/supabase'
import {
  createBusinessCustomerAction,
  updateBusinessCustomerAction,
} from '@/lib/actions/business-customer'
import {
  DEFAULT_CUSTOMER_TEMPLATES,
  type CustomerRow,
} from '@/lib/data-templates/const/customer-import-template'
import importService from '@/lib/services/data-templates/generic-import-service'
import {
  validateEmail,
  cleanExcelValue,
} from '@/lib/utils/excel-import-helpers'
import type {
  BusinessCustomer,
  CustomerStatus,
  CreateCustomerInput,
} from '@/lib/models/customer/business-customer'

const CUSTOMER_STATUSES: readonly CustomerStatus[] = [
  'active',
  'inactive',
  'vip',
  'blocked',
] as const

interface ImportResult {
  success: boolean
  created: number
  updated: number
  errors: string[]
}

/**
 * Validar enum para customer status
 */
function validateCustomerStatus(value: string, field: string): CustomerStatus {
  const upperValue = value.toUpperCase()
  if (CUSTOMER_STATUSES.includes(upperValue as CustomerStatus)) {
    return upperValue as CustomerStatus
  }
  throw new Error(`${field} debe ser uno de: ${CUSTOMER_STATUSES.join(', ')}`)
}

/**
 * Exportar clientes a Excel
 */
export async function exportCustomersToExcelAction(
  businessId: string
): Promise<{
  success: boolean
  data?: Buffer
  filename?: string
  error?: string
}> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { data: customers, error } = await supabase
      .from('business_customers')
      .select(`*, customer_categories(name)`)
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })

    if (error || !customers) {
      return {
        success: false,
        error: 'No se pudieron obtener los clientes',
      }
    }

    console.log(
      'Customers para exportar:',
      customers.map((c) => ({
        id: c.id,
        category: c.category,
        category_name: c.category_name,
        category_name_type: typeof c.category_name,
        category_name_string: JSON.stringify(c.category_name),
      }))
    )

    const wb = XLSX.utils.book_new()

    const customersData: CustomerRow[] = customers.map((customer) => ({
      company_name: customer.company_name || undefined,
      nit: customer.nit,
      full_name: customer.full_name,
      email: customer.email,
      phone: customer.phone || undefined,
      status: customer.status,
      category: customer.customer_categories?.name || customer.category || undefined,
      notes: customer.notes || undefined,
      preferences: customer.preferences || undefined,
      tags: customer.tags ? customer.tags.join(', ') : undefined,
    }))

    const wsCustomers = XLSX.utils.json_to_sheet(customersData)
    XLSX.utils.book_append_sheet(wb, wsCustomers, 'Customers')

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    const timestamp = new Date().getTime()
    const filename = `clientes-${timestamp}.xlsx`

    return {
      success: true,
      data: buffer,
      filename,
    }
  } catch (error: any) {
    console.error('Error exporting customers to Excel:', error)
    return {
      success: false,
      error: error.message || 'Error al exportar clientes',
    }
  }
}

/**
 * Crear plantilla de ejemplo para clientes
 */
export async function createDefaultCustomersTemplateAction(): Promise<{
  success: boolean
  data?: Buffer
  filename?: string
  error?: string
}> {
  try {
    const wb = XLSX.utils.book_new()

    const wsCustomers = XLSX.utils.json_to_sheet(DEFAULT_CUSTOMER_TEMPLATES)
    XLSX.utils.book_append_sheet(wb, wsCustomers, 'Customers')

    const buffer = XLSX.write(wb, {
      type: 'buffer',
      bookType: 'xlsx',
      cellDates: true,
    })

    const timestamp = new Date().toISOString().split('T')[0]
    const filename = `plantilla-clientes-${timestamp}.xlsx`

    return {
      success: true,
      data: buffer,
      filename,
    }
  } catch (error: any) {
    console.error('Error creating default customers template:', error)
    return {
      success: false,
      error: error.message || 'Error al crear plantilla de clientes',
    }
  }
}

/**
 * Procesar un cliente individual
 */
async function processCustomer(
  row: CustomerRow,
  businessId: string,
  index: number
): Promise<CustomerRow> {
  if (!row.nit || !row.full_name || !row.email) {
    throw new Error(
      `Fila ${index + 1}: nit, full_name y email son obligatorios`
    )
  }

  const cleanedNit = cleanExcelValue(row.nit)
  const cleanedFullName = cleanExcelValue(row.full_name)
  const cleanedEmail = cleanExcelValue(row.email)
  const cleanedPhone = cleanExcelValue(row.phone)
  const cleanedCategory = cleanExcelValue(row.category)
  const cleanedNotes = cleanExcelValue(row.notes)
  const cleanedPreferences = cleanExcelValue(row.preferences)
  const cleanedTags = cleanExcelValue(row.tags)
  const cleanedCompanyName = cleanExcelValue(row.company_name)

  if (!cleanedNit || !cleanedFullName || !cleanedEmail) {
    throw new Error(
      `Fila ${index + 1}: nit, full_name y email no pueden estar vacíos`
    )
  }

  if (!validateEmail(cleanedEmail)) {
    throw new Error(`Fila ${index + 1}: Email '${cleanedEmail}' no es válido`)
  }

  let status: CustomerStatus = 'active'
  if (row.status) {
    try {
      status = validateCustomerStatus(row.status, 'status')
    } catch (error: any) {
      throw new Error(`Fila ${index + 1}: ${error.message}`)
    }
  }

  const supabase = await getSupabaseAdminClient()
  const { data: existingCustomer } = await supabase
    .from('business_customers')
    .select('id')
    .eq('business_id', businessId)
    .eq('nit', cleanedNit)
    .maybeSingle()

  const tagsArray = cleanedTags
    ? cleanedTags
        .split(',')
        .map((tag: string) => tag.trim())
        .filter(Boolean)
    : []

  if (existingCustomer) {
    const updateResult = await updateBusinessCustomerAction(
      existingCustomer.id,
      {
        company_name: cleanedCompanyName || null,
        nit: cleanedNit,
        full_name: cleanedFullName,
        email: cleanedEmail,
        phone: cleanedPhone || null,
        status,
        category: cleanedCategory || null,
        notes: cleanedNotes || null,
        preferences: cleanedPreferences || null,
        tags: tagsArray,
      }
    )

    if (!updateResult.success) {
      throw new Error(updateResult.error || 'Error actualizando cliente')
    }
  } else {
    const customerInput: CreateCustomerInput = {
      business_id: businessId,
      company_name: cleanedCompanyName || null,
      nit: cleanedNit,
      full_name: cleanedFullName,
      email: cleanedEmail,
      phone: cleanedPhone || null,
      status,
      category: cleanedCategory || null,
      notes: cleanedNotes || null,
      preferences: cleanedPreferences || null,
      tags: tagsArray,
    }

    const createResult = await createBusinessCustomerAction(customerInput)

    if (!createResult.success) {
      throw new Error(createResult.error || 'Error creando cliente')
    }
  }

  return row
}

/**
 * Importar clientes desde Excel con progreso
 */
export async function importCustomersWithProgress(
  formData: FormData
): Promise<{ sessionId: string; status: string }> {
  try {
    const file = formData.get('file') as File
    const sessionId = formData.get('sessionId') as string
    const businessId = formData.get('businessId') as string

    if (!sessionId) {
      throw new Error('Session ID requerido')
    }

    if (!businessId) {
      throw new Error('Business ID requerido')
    }

    const arrayBuffer = await file.arrayBuffer()
    const wb = XLSX.read(arrayBuffer, { type: 'buffer' })

    if (!wb.Sheets['Customers']) {
      throw new Error(
        'La hoja "Customers" es obligatoria y no se encontró en el archivo Excel'
      )
    }

    const customersData = XLSX.utils.sheet_to_json<CustomerRow>(
      wb.Sheets['Customers']
    )

    if (customersData.length === 0) {
      throw new Error('La hoja "Customers" está vacía o no tiene datos válidos')
    }

    importService
      .importWithProgress(
        customersData,
        async (customerRow, index) => {
          return await processCustomer(customerRow, businessId, index)
        },
        {
          batchSize: 3,
          continueOnError: false,
        },
        sessionId
      )
      .then((result) => {
        if (result.success) {
          console.log(`Import ${sessionId} completed successfully:`, result)
        } else {
          console.log(`Import ${sessionId} completed with errors:`, result)
        }
      })
      .catch((error) => {
        console.error(`Import ${sessionId} error:`, error)
      })

    return { sessionId, status: 'started' }
  } catch (error: any) {
    console.error('Error starting import:', error)
    throw error
  }
}
