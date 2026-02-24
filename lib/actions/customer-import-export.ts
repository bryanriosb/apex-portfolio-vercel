'use server'

import * as XLSX from 'xlsx'
import { getSupabaseAdminClient } from '@/lib/actions/supabase'
import {
  createBusinessCustomerAction,
  updateBusinessCustomerAction,
  bulkUpsertFullCustomersAction,
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
  const lowerValue = value.toLowerCase()
  if (CUSTOMER_STATUSES.includes(lowerValue as CustomerStatus)) {
    return lowerValue as CustomerStatus
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
      emails: Array.isArray(customer.emails) ? customer.emails.join(', ') : '',
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
 * Importar clientes desde Excel con progreso (Bulk Ops)
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

    // Proceso en Background
    ; (async () => {
      importService.createInitialProgress(sessionId, customersData.length)
      importService.updateProgress(sessionId, { status: 'processing', message: 'Validando datos...' })

      const errors: string[] = []
      const validCustomers: CreateCustomerInput[] = []

      // Obtener el business_account_id para las categorías
      const supabase = await getSupabaseAdminClient()
      const { data: businessData, error: businessError } = await supabase
        .from('businesses')
        .select('business_account_id')
        .eq('id', businessId)
        .single()

      if (businessError || !businessData) {
        throw new Error('No se pudo obtener la cuenta del negocio para resolver categorías')
      }

      const businessAccountId = businessData.business_account_id

      // Pre-cargar todas las categorías existentes para este negocio
      const { data: categoriesData } = await supabase
        .from('customer_categories')
        .select('id, name')
        .eq('business_account_id', businessAccountId)

      // Map para búsqueda rápida de id por nombre ignorando mayúsculas
      const categoryMap = new Map<string, string>()
      categoriesData?.forEach(cat => {
        categoryMap.set(cat.name.toLowerCase(), cat.id)
      })

      // Para llevar registro de categorías nuevas a crear sobre la marcha
      const newCategoriesToCreate = new Set<string>()

      for (let i = 0; i < customersData.length; i++) {
        const row = customersData[i]
        try {
          if (!row.nit || !row.full_name || !row.emails) {
            throw new Error(`Fila ${i + 1}: nit, full_name y emails son obligatorios`)
          }

          const cleanedNit = cleanExcelValue(row.nit)
          const cleanedFullName = cleanExcelValue(row.full_name)
          const cleanedRawEmails = cleanExcelValue(row.emails)
          const cleanedPhone = cleanExcelValue(row.phone)
          const cleanedCategory = cleanExcelValue(row.category)
          const cleanedNotes = cleanExcelValue(row.notes)
          const cleanedPreferences = cleanExcelValue(row.preferences)
          const cleanedTags = cleanExcelValue(row.tags)
          const cleanedCompanyName = cleanExcelValue(row.company_name)

          if (!cleanedNit || !cleanedFullName || !cleanedRawEmails) {
            throw new Error(`Fila ${i + 1}: nit, full_name y emails no pueden estar vacíos`)
          }

          const parsedEmails = cleanedRawEmails
            .split(',')
            .map((e: string) => e.trim())
            .filter(Boolean)

          if (parsedEmails.length === 0) {
            throw new Error(`Fila ${i + 1}: emails no contiene direcciones válidas`)
          }

          for (const emailItem of parsedEmails) {
            if (!validateEmail(emailItem)) {
              throw new Error(`Fila ${i + 1}: Email '${emailItem}' no es válido`)
            }
          }

          let status: CustomerStatus = 'active'
          if (row.status) {
            try {
              status = validateCustomerStatus(row.status, 'status')
            } catch (error: any) {
              throw new Error(`Fila ${i + 1}: ${error.message}`)
            }
          }

          const tagsArray = cleanedTags
            ? cleanedTags
              .split(',')
              .map((tag: string) => tag.trim())
              .filter(Boolean)
            : []

          let categoryId = null

          if (cleanedCategory) {
            const lowerCategoryName = cleanedCategory.toLowerCase()
            if (categoryMap.has(lowerCategoryName)) {
              categoryId = categoryMap.get(lowerCategoryName)
            } else {
              // Si no existe, preparamos para crearla
              newCategoriesToCreate.add(cleanedCategory)
            }
          }

          validCustomers.push({
            business_id: businessId,
            company_name: cleanedCompanyName || null,
            nit: cleanedNit,
            full_name: cleanedFullName,
            emails: parsedEmails,
            phone: cleanedPhone || null,
            status,
            category: categoryId,
            notes: cleanedNotes || null,
            preferences: cleanedPreferences || null,
            tags: tagsArray,
            _tempCategoryName: categoryId ? null : cleanedCategory
          } as CreateCustomerInput & { _tempCategoryName?: string })
        } catch (error: any) {
          errors.push(error.message)
        }

        // Reportar progreso en lotes para que la UI no se bloquee ni salte directo
        if (i > 0 && i % 500 === 0) {
          importService.updateProgress(sessionId, { current: i, message: `Validando fila ${i}...` })
        }
      }

      importService.updateProgress(sessionId, {
        current: customersData.length,
        message: 'Validación completada. Guardando en base de datos...'
      })

      // Crear categorías nuevas si hay alguna
      if (newCategoriesToCreate.size > 0) {
        importService.updateProgress(sessionId, {
          message: `Creando ${newCategoriesToCreate.size} nuevas categorías...`
        })

        const categoriesToInsert = Array.from(newCategoriesToCreate).map(name => ({
          business_account_id: businessAccountId,
          name,
          description: 'Categoría importada automáticamente'
        }))

        const { data: newCategories } = await supabase
          .from('customer_categories')
          .insert(categoriesToInsert)
          .select('id, name')

        // Actualizar el map con los nuevos IDs
        newCategories?.forEach(cat => {
          categoryMap.set(cat.name.toLowerCase(), cat.id)
        })

        // Completar los validCustomers que tenían _tempCategoryName
        for (const customer of validCustomers as any[]) {
          if (customer._tempCategoryName) {
            const lowerName = customer._tempCategoryName.toLowerCase()
            if (categoryMap.has(lowerName)) {
              customer.category = categoryMap.get(lowerName)
            } else {
              customer.category = null
            }
            delete customer._tempCategoryName
          }
        }
      } else {
        // También limpiar _tempCategoryName si no se crearon categorías nuevas
        for (const customer of validCustomers as any[]) {
          if (customer._tempCategoryName) {
            const lowerName = customer._tempCategoryName.toLowerCase()
            if (categoryMap.has(lowerName)) {
              customer.category = categoryMap.get(lowerName)
            } else {
              customer.category = null
            }
            delete customer._tempCategoryName
          }
        }
      }

      // Limpiar cualquier residuo de _tempCategoryName antes de hacer upsert
      const finalCustomersToInsert = validCustomers.map(c => {
        const { _tempCategoryName, ...rest } = c as any
        return rest as CreateCustomerInput
      })

      // Dividimos finalCustomersToInsert en batches de 500 para evitar payload demasiado grande a Supabase
      const BATCH_SIZE = 500
      let processedCount = 0

      for (let i = 0; i < finalCustomersToInsert.length; i += BATCH_SIZE) {
        const batch = finalCustomersToInsert.slice(i, i + BATCH_SIZE)
        try {
          const result = await bulkUpsertFullCustomersAction(batch)
          if (!result.success) {
            errors.push(`Error en lote ${i / BATCH_SIZE + 1}: ${result.error}`)
          } else {
            processedCount += batch.length
            importService.updateProgress(sessionId, {
              message: `Guardados ${processedCount} de ${validCustomers.length} en la base de datos...`
            })
          }
        } catch (error: any) {
          errors.push(`Excepción en lote ${i / BATCH_SIZE + 1}: ${error.message}`)
        }
      }

      const finalStatus = errors.length > 0 && processedCount === 0 ? 'error' : 'completed'
      importService.updateProgress(sessionId, {
        status: finalStatus,
        current: processedCount,
        message: `Importación completada: ${processedCount} guardados, ${errors.length} errores.`,
        errors: errors,
        endTime: Date.now()
      })

    })()

    return { sessionId, status: 'started' }
  } catch (error: any) {
    console.error('Error starting import:', error)
    throw error
  }
}
