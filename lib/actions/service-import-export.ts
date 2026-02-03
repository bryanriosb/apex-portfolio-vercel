'use server'

import * as XLSX from 'xlsx'
import { getSupabaseAdminClient } from '@/lib/actions/supabase'
import {
  fetchServicesAction,
  createServiceAction,
  updateServiceAction,
} from '@/lib/actions/service'
import {
  DEFAULT_SERVICE_TEMPLATES,
  type ServiceRow,
} from '@/lib/data-templates/const/service-import-template'
import importService from '@/lib/services/data-templates/generic-import-service'
import {
  normalizeBoolean,
  convertPriceToCents,
  convertCentsToPrice,
  findOrCreateServiceCategory,
  validateEnum,
  cleanExcelValue,
} from '@/lib/utils/excel-import-helpers'
import type { ServiceInsert, ServiceWithCategory } from '@/lib/models/service/service'

const SERVICE_TYPES = ['REGULAR', 'ASSESSMENT'] as const

interface ImportResult {
  success: boolean
  created: number
  updated: number
  errors: string[]
}

/**
 * Exportar servicios a Excel
 */
export async function exportServicesToExcelAction(
  businessId: string
): Promise<{
  success: boolean
  data?: Buffer
  filename?: string
  error?: string
}> {
  try {
    // Obtener servicios del negocio
    const servicesResult = await fetchServicesAction({ business_id: businessId })

    if (!servicesResult.data || servicesResult.data.length === 0) {
      return {
        success: false,
        error: 'No se encontraron servicios para exportar',
      }
    }

    const services = servicesResult.data as ServiceWithCategory[]

    // Crear workbook
    const wb = XLSX.utils.book_new()

    // Convertir servicios a formato Excel
    const servicesData: ServiceRow[] = services.map((service) => ({
      name: service.name,
      price: convertCentsToPrice(service.price_cents),
      duration_minutes: service.duration_minutes,
      description: service.description || '',
      category_name: service.category?.name || '',
      service_type: service.service_type,
      tax_rate: service.tax_rate || 0,
      is_featured: service.is_featured,
    }))

    const wsServices = XLSX.utils.json_to_sheet(servicesData)
    XLSX.utils.book_append_sheet(wb, wsServices, 'Services')

    // Generar buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    const timestamp = new Date().toISOString().split('T')[0]
    const filename = `servicios-${timestamp}.xlsx`

    return {
      success: true,
      data: buffer,
      filename,
    }
  } catch (error: any) {
    console.error('Error exporting services to Excel:', error)
    return {
      success: false,
      error: error.message || 'Error al exportar servicios',
    }
  }
}

/**
 * Crear plantilla de ejemplo para servicios
 */
export async function createDefaultServicesTemplateAction(): Promise<{
  success: boolean
  data?: Buffer
  filename?: string
  error?: string
}> {
  try {
    const wb = XLSX.utils.book_new()

    const wsServices = XLSX.utils.json_to_sheet(DEFAULT_SERVICE_TEMPLATES)
    XLSX.utils.book_append_sheet(wb, wsServices, 'Services')

    const buffer = XLSX.write(wb, {
      type: 'buffer',
      bookType: 'xlsx',
      cellDates: true,
    })

    const timestamp = new Date().toISOString().split('T')[0]
    const filename = `plantilla-servicios-${timestamp}.xlsx`

    return {
      success: true,
      data: buffer,
      filename,
    }
  } catch (error: any) {
    console.error('Error creating default services template:', error)
    return {
      success: false,
      error: error.message || 'Error al crear plantilla de servicios',
    }
  }
}

/**
 * Procesar un servicio individual
 */
async function processService(
  row: ServiceRow,
  businessId: string,
  index: number
): Promise<ServiceRow> {
  // Validaciones básicas
  if (!row.name) {
    throw new Error(`Fila ${index + 1}: El nombre del servicio es obligatorio`)
  }

  if (!row.price || row.price < 0) {
    throw new Error(`Fila ${index + 1}: El precio debe ser mayor o igual a 0`)
  }

  if (!row.duration_minutes || row.duration_minutes <= 0) {
    throw new Error(`Fila ${index + 1}: La duración debe ser mayor a 0`)
  }

  // Limpiar valores
  const cleanedName = cleanExcelValue(row.name)
  const cleanedDescription = cleanExcelValue(row.description)
  const cleanedCategoryName = cleanExcelValue(row.category_name)

  if (!cleanedName) {
    throw new Error(`Fila ${index + 1}: El nombre del servicio no puede estar vacío`)
  }

  // Validar service_type si se proporciona
  let serviceType: 'REGULAR' | 'ASSESSMENT' = 'REGULAR'
  if (row.service_type) {
    try {
      serviceType = validateEnum(
        row.service_type.toUpperCase(),
        SERVICE_TYPES,
        'service_type'
      )
    } catch (error: any) {
      throw new Error(`Fila ${index + 1}: ${error.message}`)
    }
  }

  // Validar tax_rate
  let taxRate: number | null = null
  if (row.tax_rate !== undefined && row.tax_rate !== null) {
    taxRate = Number(row.tax_rate)
    if (isNaN(taxRate) || taxRate < 0 || taxRate > 100) {
      throw new Error(
        `Fila ${index + 1}: tax_rate debe estar entre 0 y 100`
      )
    }
  }

  // Validar is_featured
  let isFeatured = false
  if (row.is_featured !== undefined && row.is_featured !== null) {
    try {
      isFeatured = normalizeBoolean(row.is_featured)
    } catch (error: any) {
      throw new Error(`Fila ${index + 1}: ${error.message}`)
    }
  }

  // Buscar o crear categoría
  let categoryId: string | null = null
  if (cleanedCategoryName) {
    categoryId = await findOrCreateServiceCategory(cleanedCategoryName)
  }

  // Convertir precio a centavos
  const priceCents = convertPriceToCents(row.price)

  // Verificar si el servicio ya existe por nombre
  const supabase = await getSupabaseAdminClient()
  const { data: existingService } = await supabase
    .from('services')
    .select('id')
    .eq('business_id', businessId)
    .ilike('name', cleanedName)
    .single()

  const serviceData: ServiceInsert = {
    business_id: businessId,
    name: cleanedName,
    description: cleanedDescription,
    price_cents: priceCents,
    duration_minutes: row.duration_minutes,
    category_id: categoryId,
    service_type: serviceType,
    tax_rate: taxRate,
    is_featured: isFeatured,
  }

  if (existingService) {
    // Actualizar servicio existente
    const updateResult = await updateServiceAction(existingService.id, serviceData)
    if (!updateResult.success) {
      throw new Error(updateResult.error || 'Error actualizando servicio')
    }
  } else {
    // Crear nuevo servicio
    const createResult = await createServiceAction(serviceData)
    if (!createResult.success) {
      throw new Error(createResult.error || 'Error creando servicio')
    }
  }

  return row
}

/**
 * Importar servicios desde Excel con progreso
 */
export async function importServicesWithProgress(
  formData: FormData
): Promise<{ sessionId: string; status: string }> {
  try {
    // Extraer datos del FormData
    const file = formData.get('file') as File
    const sessionId = formData.get('sessionId') as string
    const businessId = formData.get('businessId') as string

    if (!sessionId) {
      throw new Error('Session ID requerido')
    }

    if (!businessId) {
      throw new Error('Business ID requerido')
    }

    // Leer archivo Excel
    const arrayBuffer = await file.arrayBuffer()
    const wb = XLSX.read(arrayBuffer, { type: 'buffer' })

    // Validar que exista la hoja requerida
    if (!wb.Sheets['Services']) {
      throw new Error('La hoja "Services" es obligatoria y no se encontró en el archivo Excel')
    }

    // Leer datos de la hoja
    const servicesData = XLSX.utils.sheet_to_json<ServiceRow>(wb.Sheets['Services'])

    if (servicesData.length === 0) {
      throw new Error('La hoja "Services" está vacía o no tiene datos válidos')
    }

    // Iniciar procesamiento en background
    importService
      .importWithProgress(
        servicesData,
        async (serviceRow, index) => {
          return await processService(serviceRow, businessId, index)
        },
        {
          batchSize: 5,
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

    // Devolver inmediatamente con sessionId
    return { sessionId, status: 'started' }
  } catch (error: any) {
    console.error('Error starting import:', error)
    throw error
  }
}
