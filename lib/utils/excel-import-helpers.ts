import { getSupabaseAdminClient } from '@/lib/actions/supabase'

/**
 * Normalizar valores booleanos de Excel a booleanos reales
 */
export function normalizeBoolean(value: any): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') {
    if (value === 1) return true
    if (value === 0) return false
  }
  if (typeof value === 'string') {
    const upperValue = value.toUpperCase()
    if (upperValue === 'TRUE' || upperValue === '1' || upperValue === 'SI' || upperValue === 'SÍ' || upperValue === 'YES') return true
    if (upperValue === 'FALSE' || upperValue === '0' || upperValue === 'NO') return false
  }
  throw new Error(
    `Valor '${value}' no es un booleano válido. Debe ser true/false, TRUE/FALSE, SI/NO, 1/0`
  )
}

/**
 * Convertir precio en pesos a centavos
 */
export function convertPriceToCents(price: number): number {
  if (typeof price !== 'number' || isNaN(price)) {
    throw new Error(`Precio '${price}' no es un número válido`)
  }
  return Math.round(price * 100)
}

/**
 * Convertir centavos a pesos
 */
export function convertCentsToPrice(cents: number): number {
  if (typeof cents !== 'number' || isNaN(cents)) {
    throw new Error(`Centavos '${cents}' no es un número válido`)
  }
  return cents / 100
}

/**
 * Validar formato de email
 */
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email.trim())
}

/**
 * Validar formato de fecha (YYYY-MM-DD)
 */
export function validateDate(date: string): boolean {
  if (!date || typeof date !== 'string') {
    return false
  }
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(date)) {
    return false
  }
  // Validar que sea una fecha válida
  const parsedDate = new Date(date)
  return !isNaN(parsedDate.getTime())
}

/**
 * Generar contraseña temporal segura
 */
export function generateTempPassword(): string {
  const length = 12
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
  let password = ''
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length)
    password += charset[randomIndex]
  }
  return password
}

/**
 * Buscar o crear categoría de servicio (las categorías son globales, no por negocio)
 */
export async function findOrCreateServiceCategory(
  categoryName: string
): Promise<string> {
  const supabase = await getSupabaseAdminClient()

  // Buscar categoría existente
  const { data: existing } = await supabase
    .from('service_categories')
    .select('id')
    .ilike('name', categoryName.trim())
    .single()

  if (existing) {
    return existing.id
  }

  // Crear nueva categoría
  const { data: newCategory, error } = await supabase
    .from('service_categories')
    .insert({
      name: categoryName.trim(),
      icon_key: null,
    })
    .select('id')
    .single()

  if (error || !newCategory) {
    throw new Error(`Error creando categoría de servicio '${categoryName}': ${error?.message}`)
  }

  return newCategory.id
}

/**
 * Buscar o crear categoría de producto (global, no por business)
 */
export async function findOrCreateProductCategory(
  categoryName: string
): Promise<string> {
  const supabase = await getSupabaseAdminClient()

  // Buscar categoría existente
  const { data: existing } = await supabase
    .from('product_categories')
    .select('id')
    .ilike('name', categoryName.trim())
    .single()

  if (existing) {
    return existing.id
  }

  // Crear nueva categoría
  const { data: newCategory, error } = await supabase
    .from('product_categories')
    .insert({
      name: categoryName.trim(),
      description: null,
    })
    .select('id')
    .single()

  if (error || !newCategory) {
    throw new Error(`Error creando categoría de producto '${categoryName}': ${error?.message}`)
  }

  return newCategory.id
}

/**
 * Convertir texto a CamelCase
 */
function toCamelCase(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Buscar o crear unidad de medida
 */
export async function findOrCreateUnitOfMeasure(
  name: string,
  abbreviation?: string
): Promise<string> {
  const supabase = await getSupabaseAdminClient()

  const trimmedName = name.trim()
  const trimmedAbbr = abbreviation?.trim() || trimmedName.substring(0, 3).toUpperCase()

  // Convertir name a CamelCase y abbreviation a minúsculas
  const camelCaseName = toCamelCase(trimmedName)
  const lowercaseAbbr = trimmedAbbr.toLowerCase()

  // Buscar unidad existente por nombre o abreviación
  const { data: existing } = await supabase
    .from('unit_of_measures')
    .select('id')
    .or(`name.ilike.${camelCaseName},abbreviation.ilike.${lowercaseAbbr}`)
    .single()

  if (existing) {
    return existing.id
  }

  // Crear nueva unidad de medida
  const { data: newUnit, error } = await supabase
    .from('unit_of_measures')
    .insert({
      name: camelCaseName,
      abbreviation: lowercaseAbbr,
    })
    .select('id')
    .single()

  if (error || !newUnit) {
    throw new Error(`Error creando unidad de medida '${name}': ${error?.message}`)
  }

  return newUnit.id
}

/**
 * Limpiar y normalizar valores de Excel
 */
export function cleanExcelValue(value: any): any {
  if (value === null || value === undefined) {
    return null
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed === '' ? null : trimmed
  }

  return value
}

/**
 * Validar que un valor esté en un enum
 */
export function validateEnum<T extends string>(
  value: string,
  enumValues: readonly T[],
  fieldName: string
): T {
  if (!enumValues.includes(value as T)) {
    throw new Error(
      `Valor '${value}' no es válido para ${fieldName}. Debe ser uno de: ${enumValues.join(', ')}`
    )
  }
  return value as T
}

/**
 * Extraer business_id del store activo
 * Nota: Esta función debe ser llamada desde el cliente, no desde server actions
 */
export function getActiveBusinessId(): string {
  if (typeof window === 'undefined') {
    throw new Error('getActiveBusinessId solo puede ser llamado desde el cliente')
  }

  // Intentar obtener del localStorage
  const stored = localStorage.getItem('active-business-store')
  if (stored) {
    try {
      const parsed = JSON.parse(stored)
      if (parsed.state?.activeBusinessId) {
        return parsed.state.activeBusinessId
      }
    } catch (e) {
      console.error('Error parsing active business from localStorage:', e)
    }
  }

  throw new Error('No se encontró un negocio activo. Por favor selecciona un negocio.')
}
