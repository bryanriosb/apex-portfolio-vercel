'use server'

import * as XLSX from 'xlsx'
import { getSupabaseAdminClient } from '@/lib/actions/supabase'

/**
 * Normaliza un nombre de columna para facilitar el mapeo
 * - Elimina espacios al inicio y final (trim)
 * - Convierte a minúsculas
 * - Elimina tildes y caracteres especiales
 * - Normaliza espacios múltiples
 */
function normalizeColumnName(header: string): string {
  return String(header)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Elimina tildes
    .replace(/\s+/g, ' ') // Normaliza espacios múltiples a uno solo
}
import {
  createBusinessCustomerAction,
  updateBusinessCustomerAction,
  bulkUpsertFullCustomersAction,
} from '@/lib/actions/business-customer'
import {
  DEFAULT_CUSTOMER_TEMPLATES,
  CUSTOMER_COLUMN_MAPPING,
  CUSTOMER_COLUMN_LABELS,
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

    const customersData = customers.map((customer) => ({
      nombre_empresa: customer.company_name || undefined,
      nit: customer.nit,
      nombre_completo: customer.full_name,
      emails: Array.isArray(customer.emails) ? customer.emails.join(', ') : '',
      telefono: customer.phone || undefined,
      estado: customer.status,
      categoria: customer.customer_categories?.name || customer.category || undefined,
      notas: customer.notes || undefined,
      preferencias: customer.preferences || undefined,
      etiquetas: customer.tags ? customer.tags.join(', ') : undefined,
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

    // Leer datos raw para poder mapear columnas correctamente
    const worksheet = wb.Sheets['Customers']
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
    
    if (jsonData.length === 0) {
      throw new Error('La hoja "Customers" está vacía o no tiene datos válidos')
    }
    
    // Procesar headers y crear mapeo
    const rawHeaders = (jsonData[0] as any[])
    const normalizedHeaders = rawHeaders.map((h) => normalizeColumnName(h))
    const rows = jsonData.slice(1).filter((row: any) => row.length > 0)
    
    // Función helper para obtener valor de columna
    const getCustomerColumnValue = (row: any[], colName: string): any => {
      // Buscar por nombre normalizado
      const colIndex = normalizedHeaders.findIndex(h => h === colName)
      if (colIndex !== -1 && row[colIndex] !== undefined) {
        return row[colIndex]
      }
      // Buscar por mapeo a inglés
      const englishCol = CUSTOMER_COLUMN_MAPPING[colName]
      if (englishCol && englishCol !== colName) {
        const mappedIndex = normalizedHeaders.findIndex(h => CUSTOMER_COLUMN_MAPPING[h] === englishCol)
        if (mappedIndex !== -1 && row[mappedIndex] !== undefined) {
          return row[mappedIndex]
        }
      }
      return undefined
    }
    
    // Convertir rows a objetos para procesamiento
    const customersData = rows.map((row: any) => ({
      nit: getCustomerColumnValue(row, 'nit'),
      emails: getCustomerColumnValue(row, 'emails'),
      nombre_empresa: getCustomerColumnValue(row, 'nombre de empresa'),
      nombre_completo: getCustomerColumnValue(row, 'nombre completo'),
      telefono: getCustomerColumnValue(row, 'telefono'),
      estado: getCustomerColumnValue(row, 'estado'),
      categoria: getCustomerColumnValue(row, 'categoria'),
      notas: getCustomerColumnValue(row, 'notas'),
      preferencias: getCustomerColumnValue(row, 'preferencias'),
      etiquetas: getCustomerColumnValue(row, 'etiquetas'),
    }))

    // Proceso en Background
    ; (async () => {
      importService.createInitialProgress(sessionId, customersData.length)
      importService.updateProgress(sessionId, { status: 'processing', message: 'Validando datos...' })

      const errors: string[] = []
      const warnings: string[] = []
      const validCustomers: CreateCustomerInput[] = []
      const duplicateNitsInFile = new Map<string, number[]>()

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

      // Verificar campos obligatorios en el encabezado
      const firstRow = customersData[0]
      const missingRequiredColumns: string[] = []
      
      if (!firstRow || firstRow.nit === undefined) {
        missingRequiredColumns.push(CUSTOMER_COLUMN_LABELS['nit'])
      }
      if (!firstRow || firstRow.emails === undefined) {
        missingRequiredColumns.push(CUSTOMER_COLUMN_LABELS['emails'])
      }
      
      if (missingRequiredColumns.length > 0) {
        importService.updateProgress(sessionId, {
          status: 'error',
          message: `Columnas obligatorias faltantes: ${missingRequiredColumns.join(', ')}`,
          errors: [`El archivo no contiene las columnas obligatorias: ${missingRequiredColumns.join(', ')}. Por favor descargue la plantilla y verifique el formato.`],
          endTime: Date.now()
        })
        return
      }

      for (let i = 0; i < customersData.length; i++) {
        const row = customersData[i]
        try {
          // Validar campos obligatorios: nit y emails
          if (!row.nit) {
            throw new Error(`Fila ${i + 1}: El campo '${CUSTOMER_COLUMN_LABELS['nit']}' es obligatorio`)
          }
          if (!row.emails) {
            throw new Error(`Fila ${i + 1}: El campo '${CUSTOMER_COLUMN_LABELS['emails']}' es obligatorio`)
          }

          const cleanedNit = cleanExcelValue(row.nit)
          const cleanedFullName = cleanExcelValue(row.nombre_completo)
          const cleanedRawEmails = cleanExcelValue(row.emails)
          const cleanedPhone = cleanExcelValue(row.telefono)
          const cleanedCategory = cleanExcelValue(row.categoria)
          const cleanedNotes = cleanExcelValue(row.notas)
          const cleanedPreferences = cleanExcelValue(row.preferencias)
          const cleanedTags = cleanExcelValue(row.etiquetas)
          const cleanedCompanyName = cleanExcelValue(row.nombre_empresa)

          if (!cleanedNit) {
            throw new Error(`Fila ${i + 1}: El campo 'nit' no puede estar vacío`)
          }
          if (!cleanedRawEmails) {
            throw new Error(`Fila ${i + 1}: El campo 'emails' no puede estar vacío`)
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
          if (row.estado) {
            try {
              status = validateCustomerStatus(row.estado, CUSTOMER_COLUMN_LABELS['status'])
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

          // Detectar duplicados por NIT dentro del archivo
          const nitKey = cleanedNit
          if (duplicateNitsInFile.has(nitKey)) {
            duplicateNitsInFile.get(nitKey)!.push(i + 1)
          } else {
            // Verificar si ya existe en validCustomers (duplicado previo)
            const existingIndex = validCustomers.findIndex(c => c.nit === cleanedNit)
            if (existingIndex >= 0) {
              duplicateNitsInFile.set(nitKey, [existingIndex + 1, i + 1])
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

      // Reportar duplicados encontrados en el archivo
      if (duplicateNitsInFile.size > 0) {
        const dupWarnings: string[] = []
        duplicateNitsInFile.forEach((rows, nit) => {
          dupWarnings.push(`NIT ${nit} duplicado en filas: ${rows.join(', ')}`)
        })
        warnings.push(`Se encontraron ${duplicateNitsInFile.size} NITs duplicados en el archivo. Solo se importará la primera ocurrencia de cada uno.`)
        warnings.push(...dupWarnings.slice(0, 10)) // Mostrar solo los primeros 10
        if (dupWarnings.length > 10) {
          warnings.push(`... y ${dupWarnings.length - 10} duplicados más`)
        }
      }

      // Limpiar cualquier residuo de _tempCategoryName antes de hacer upsert
      const finalCustomersToInsert = validCustomers.map(c => {
        const { _tempCategoryName, ...rest } = c as any
        return rest as CreateCustomerInput
      })

      // Actualizar progreso para fase de guardado - empezar desde 0
      importService.updateProgress(sessionId, {
        current: 0,
        total: finalCustomersToInsert.length,
        status: 'processing',
        message: `Guardando ${finalCustomersToInsert.length} clientes en la base de datos...`,
        errors: [...errors, ...warnings]
      })

      // Dividimos finalCustomersToInsert en batches de 500 para evitar payload demasiado grande a Supabase
      const BATCH_SIZE = 500
      let processedCount = 0
      let totalDuplicatesRemoved = 0

      for (let i = 0; i < finalCustomersToInsert.length; i += BATCH_SIZE) {
        const batch = finalCustomersToInsert.slice(i, i + BATCH_SIZE)
        const batchNumber = Math.floor(i / BATCH_SIZE) + 1
        const totalBatches = Math.ceil(finalCustomersToInsert.length / BATCH_SIZE)
        
        try {
          importService.updateProgress(sessionId, {
            current: processedCount,
            total: finalCustomersToInsert.length,
            status: 'processing',
            message: `Procesando lote ${batchNumber} de ${totalBatches} (${batch.length} registros)...`
          })

          const result = await bulkUpsertFullCustomersAction(batch)
          
          if (!result.success) {
            errors.push(`Error en lote ${batchNumber}: ${result.error}`)
          } else {
            processedCount += result.count || batch.length
            totalDuplicatesRemoved += result.duplicatesRemoved || 0
            
            importService.updateProgress(sessionId, {
              current: processedCount,
              total: finalCustomersToInsert.length,
              status: 'processing',
              message: `Guardados ${processedCount} de ${finalCustomersToInsert.length} clientes...`,
              errors: [...errors, ...warnings]
            })
          }
        } catch (error: any) {
          errors.push(`Excepción en lote ${batchNumber}: ${error.message}`)
        }
      }

      // Reportar duplicados removidos de los batches
      if (totalDuplicatesRemoved > 0) {
        warnings.push(`Se omitieron ${totalDuplicatesRemoved} registros duplicados dentro de los lotes de procesamiento.`)
      }

      const finalStatus = errors.length > 0 && processedCount === 0 ? 'error' : 'completed'
      const finalMessage = totalDuplicatesRemoved > 0 
        ? `Importación completada: ${processedCount} guardados, ${totalDuplicatesRemoved} duplicados omitidos, ${errors.length} errores.`
        : `Importación completada: ${processedCount} guardados, ${errors.length} errores.`
      
      importService.updateProgress(sessionId, {
        status: finalStatus,
        current: processedCount,
        total: finalCustomersToInsert.length,
        message: finalMessage,
        errors: [...errors, ...warnings],
        endTime: Date.now()
      })

    })()

    return { sessionId, status: 'started' }
  } catch (error: any) {
    console.error('Error starting import:', error)
    throw error
  }
}
