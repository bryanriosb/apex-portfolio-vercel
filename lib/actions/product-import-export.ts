'use server'

import * as XLSX from 'xlsx'
import { getSupabaseAdminClient } from '@/lib/actions/supabase'
import {
  createProductAction,
  updateProductAction,
  fetchProductsAction,
} from '@/lib/actions/product'
import {
  DEFAULT_PRODUCT_TEMPLATES,
  type ProductRow,
} from '@/lib/data-templates/const/product-import-template'
import importService from '@/lib/services/data-templates/generic-import-service'
import {
  normalizeBoolean,
  convertPriceToCents,
  convertCentsToPrice,
  findOrCreateProductCategory,
  findOrCreateUnitOfMeasure,
  validateEnum,
  cleanExcelValue,
} from '@/lib/utils/excel-import-helpers'
import type { ProductInsert, ProductWithDetails } from '@/lib/models/product/product'
import type { ProductType } from '@/lib/types/enums'

const PRODUCT_TYPES: readonly ProductType[] = ['SUPPLY', 'RETAIL'] as const

interface ImportResult {
  success: boolean
  created: number
  updated: number
  errors: string[]
}

/**
 * Exportar productos a Excel
 */
export async function exportProductsToExcelAction(
  businessId: string
): Promise<{
  success: boolean
  data?: Buffer
  filename?: string
  error?: string
}> {
  try {
    // Obtener productos del negocio
    const productsResult = await fetchProductsAction({ business_id: businessId })

    if (!productsResult.data || productsResult.data.length === 0) {
      return {
        success: false,
        error: 'No se encontraron productos para exportar',
      }
    }

    const products = productsResult.data as ProductWithDetails[]

    // Crear workbook
    const wb = XLSX.utils.book_new()

    // Convertir productos a formato Excel
    const productsData: ProductRow[] = products.map((product) => ({
      name: product.name,
      type: product.type,
      cost_price: convertCentsToPrice(product.cost_price_cents),
      sale_price: convertCentsToPrice(product.sale_price_cents),
      description: product.description || '',
      sku: product.sku || '',
      barcode: product.barcode || '',
      category_name: product.category?.name || '',
      unit_of_measure_name: product.unit_of_measure?.name || '',
      current_stock: product.current_stock,
      min_stock: product.min_stock,
      max_stock: product.max_stock || undefined,
      tax_rate: product.tax_rate || 0,
      is_active: product.is_active,
    }))

    const wsProducts = XLSX.utils.json_to_sheet(productsData)
    XLSX.utils.book_append_sheet(wb, wsProducts, 'Products')

    // Generar buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    const timestamp = new Date().toISOString().split('T')[0]
    const filename = `productos-${timestamp}.xlsx`

    return {
      success: true,
      data: buffer,
      filename,
    }
  } catch (error: any) {
    console.error('Error exporting products to Excel:', error)
    return {
      success: false,
      error: error.message || 'Error al exportar productos',
    }
  }
}

/**
 * Crear plantilla de ejemplo para productos
 */
export async function createDefaultProductsTemplateAction(): Promise<{
  success: boolean
  data?: Buffer
  filename?: string
  error?: string
}> {
  try {
    const wb = XLSX.utils.book_new()

    const wsProducts = XLSX.utils.json_to_sheet(DEFAULT_PRODUCT_TEMPLATES)
    XLSX.utils.book_append_sheet(wb, wsProducts, 'Products')

    const buffer = XLSX.write(wb, {
      type: 'buffer',
      bookType: 'xlsx',
      cellDates: true,
    })

    const timestamp = new Date().toISOString().split('T')[0]
    const filename = `plantilla-productos-${timestamp}.xlsx`

    return {
      success: true,
      data: buffer,
      filename,
    }
  } catch (error: any) {
    console.error('Error creating default products template:', error)
    return {
      success: false,
      error: error.message || 'Error al crear plantilla de productos',
    }
  }
}

/**
 * Procesar un producto individual
 */
async function processProduct(
  row: ProductRow,
  businessId: string,
  index: number
): Promise<ProductRow> {
  // Validaciones básicas
  if (!row.name || !row.type || row.cost_price === undefined) {
    throw new Error(
      `Fila ${index + 1}: name, type y cost_price son obligatorios`
    )
  }

  // Limpiar valores
  const cleanedName = cleanExcelValue(row.name)
  const cleanedDescription = cleanExcelValue(row.description)
  const cleanedSku = cleanExcelValue(row.sku)
  const cleanedBarcode = cleanExcelValue(row.barcode)
  const cleanedCategoryName = cleanExcelValue(row.category_name)
  const cleanedUnitName = cleanExcelValue(row.unit_of_measure_name)

  if (!cleanedName) {
    throw new Error(`Fila ${index + 1}: El nombre del producto no puede estar vacío`)
  }

  // Validar type
  let productType: ProductType
  try {
    productType = validateEnum(
      row.type.toUpperCase(),
      PRODUCT_TYPES,
      'type'
    )
  } catch (error: any) {
    throw new Error(`Fila ${index + 1}: ${error.message}`)
  }

  // Validar precios
  if (row.cost_price < 0) {
    throw new Error(`Fila ${index + 1}: cost_price debe ser mayor o igual a 0`)
  }

  const costPriceCents = convertPriceToCents(row.cost_price)
  const salePriceCents = row.sale_price !== undefined
    ? convertPriceToCents(row.sale_price)
    : costPriceCents

  // Validar stock
  const currentStock = row.current_stock !== undefined ? row.current_stock : 0
  const minStock = row.min_stock !== undefined ? row.min_stock : 0
  const maxStock = row.max_stock !== undefined ? row.max_stock : null

  if (currentStock < 0 || minStock < 0 || (maxStock !== null && maxStock < 0)) {
    throw new Error(`Fila ${index + 1}: Los valores de stock no pueden ser negativos`)
  }

  // Validar tax_rate
  let taxRate: number | null = null
  if (row.tax_rate !== undefined && row.tax_rate !== null) {
    taxRate = Number(row.tax_rate)
    if (isNaN(taxRate) || taxRate < 0 || taxRate > 100) {
      throw new Error(`Fila ${index + 1}: tax_rate debe estar entre 0 y 100`)
    }
  }

  // Validar is_active
  let isActive = true
  if (row.is_active !== undefined && row.is_active !== null) {
    try {
      isActive = normalizeBoolean(row.is_active)
    } catch (error: any) {
      throw new Error(`Fila ${index + 1}: ${error.message}`)
    }
  }

  // Buscar o crear categoría
  let categoryId: string | null = null
  if (cleanedCategoryName) {
    categoryId = await findOrCreateProductCategory(cleanedCategoryName)
  }

  // Buscar o crear unidad de medida
  let unitOfMeasureId: string | null = null
  if (cleanedUnitName) {
    unitOfMeasureId = await findOrCreateUnitOfMeasure(cleanedUnitName)
  }

  const supabase = await getSupabaseAdminClient()

  // Verificar si el producto ya existe por SKU o nombre
  let existingProduct = null

  if (cleanedSku) {
    const { data } = await supabase
      .from('products')
      .select('id')
      .eq('business_id', businessId)
      .eq('sku', cleanedSku)
      .maybeSingle()
    existingProduct = data
  }

  if (!existingProduct) {
    const { data } = await supabase
      .from('products')
      .select('id')
      .eq('business_id', businessId)
      .ilike('name', cleanedName)
      .maybeSingle()
    existingProduct = data
  }

  const productData: ProductInsert = {
    business_id: businessId,
    name: cleanedName,
    description: cleanedDescription,
    sku: cleanedSku,
    barcode: cleanedBarcode,
    type: productType,
    cost_price_cents: costPriceCents,
    sale_price_cents: salePriceCents,
    current_stock: currentStock,
    min_stock: minStock,
    max_stock: maxStock,
    category_id: categoryId,
    unit_of_measure_id: unitOfMeasureId,
    tax_rate: taxRate,
    is_active: isActive,
  }

  if (existingProduct) {
    // Actualizar producto existente
    const updateResult = await updateProductAction(existingProduct.id, productData)
    if (!updateResult.success) {
      throw new Error(updateResult.error || 'Error actualizando producto')
    }
  } else {
    // Crear nuevo producto
    const createResult = await createProductAction(productData)
    if (!createResult.success) {
      throw new Error(createResult.error || 'Error creando producto')
    }
  }

  return row
}

/**
 * Importar productos desde Excel con progreso
 */
export async function importProductsWithProgress(
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
    if (!wb.Sheets['Products']) {
      throw new Error('La hoja "Products" es obligatoria y no se encontró en el archivo Excel')
    }

    // Leer datos de la hoja
    const productsData = XLSX.utils.sheet_to_json<ProductRow>(wb.Sheets['Products'])

    if (productsData.length === 0) {
      throw new Error('La hoja "Products" está vacía o no tiene datos válidos')
    }

    // Iniciar procesamiento en background
    importService
      .importWithProgress(
        productsData,
        async (productRow, index) => {
          return await processProduct(productRow, businessId, index)
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
