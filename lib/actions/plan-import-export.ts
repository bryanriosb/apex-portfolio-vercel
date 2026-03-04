'use server'

import * as XLSX from 'xlsx'
import {
  fetchActivePlansAction,
  getPlanWithModulesAction,
  createPlanAction,
  updatePlanAction,
  setPlanModuleAccessAction,
} from '@/lib/actions/plan'
import { getSupabaseAdminClient } from '@/lib/actions/supabase'
import {
  DEFAULT_PLAN_TEMPLATES,
  type FeaturesMetadataRow,
} from '@/lib/data-templates/const/plan-import-template'
import importService from '@/lib/services/data-templates/generic-import-service'
import type {
  Plan,
  PlanInsert,
  PlanWithModules,
  PlanModuleAccessInsert,
  BillingPeriod,
  PlanStatus,
  FeatureMetadata,
  PlanFeatures,
} from '@/lib/models/plan/plan'

// Función helper para convertir strings booleanos de Excel a booleanos reales
function normalizeBoolean(value: any): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') {
    if (value === 1) return true
    if (value === 0) return false
  }
  if (typeof value === 'string') {
    const upperValue = value.toUpperCase()
    if (upperValue === 'TRUE' || upperValue === '1') return true
    if (upperValue === 'FALSE' || upperValue === '0') return false
  }
  throw new Error(
    `Valor '${value}' no es un booleano válido. Debe ser true/false, TRUE/FALSE, 1/0`
  )
}

// Función para inferir module_code y feature_key desde el nombre del feature
function inferModuleAndFeature(featureName: string): {
  moduleCode: string
  featureKey: string
} {
  // Mapear nombres conocidos a module_code y feature_key
  const featureMap: Record<string, { moduleCode: string; featureKey: string }> =
    {
      'Notificaciones de WhatsApp': {
        moduleCode: 'appointments',
        featureKey: 'whatsapp_notifications',
      },
      'Asignación por servicio': {
        moduleCode: 'appointments',
        featureKey: 'specialist_assignment',
      },
      'Edición de precios': {
        moduleCode: 'appointments',
        featureKey: 'price_editing',
      },
      Abonos: { moduleCode: 'appointments', featureKey: 'credit' },
      'Gestión de insumos': {
        moduleCode: 'services',
        featureKey: 'supply_management',
      },
      'Edición de precios en citas': {
        moduleCode: 'services',
        featureKey: 'price_editing_in_appointment',
      },
      'Gestión de metas': {
        moduleCode: 'specialists',
        featureKey: 'goals_management',
      },
      'Visualización de gráficos': {
        moduleCode: 'reports',
        featureKey: 'view_charts',
      },
      'Ver ingresos': { moduleCode: 'reports', featureKey: 'view_revenue' },
      'Ver citas': { moduleCode: 'reports', featureKey: 'view_appointments' },
      'Ver servicios': { moduleCode: 'reports', featureKey: 'view_services' },
      'Ver especialistas': {
        moduleCode: 'reports',
        featureKey: 'view_specialists',
      },
      'Ver clientes': { moduleCode: 'reports', featureKey: 'view_customers' },
      'Ver insumos': { moduleCode: 'reports', featureKey: 'view_supplies' },
      'Ver cartera': { moduleCode: 'reports', featureKey: 'view_portfolio' },
      'Exportar datos': { moduleCode: 'reports', featureKey: 'export_data' },
    }

  const mapping = featureMap[featureName]
  if (!mapping) {
    throw new Error(
      `No se pudo mapear el feature "${featureName}". Verifique que el nombre sea correcto.`
    )
  }

  return mapping
}

// Función para procesar features metadata del Excel
function processFeaturesMetadata(
  featuresMetadataData: FeaturesMetadataRow[]
): Map<string, Record<string, FeatureMetadata>> {
  const metadataMap = new Map<string, Record<string, any>>()

  for (const row of featuresMetadataData) {
    let moduleCode: string
    let featureKey: string

    // Si el Excel tiene module_code y feature_key, úsalos
    if (row.module_code && row.feature_key) {
      moduleCode = row.module_code
      featureKey = row.feature_key
    } else {
      // Si no, infiérelo desde el nombre
      try {
        const inferred = inferModuleAndFeature(row.name)
        moduleCode = inferred.moduleCode
        featureKey = inferred.featureKey
      } catch (error: any) {
        throw new Error(
          `Error procesando feature "${row.name}": ${error.message}`
        )
      }
    }

    // Inicializar el módulo si no existe
    if (!metadataMap.has(moduleCode)) {
      metadataMap.set(moduleCode, {})
    }

    // Agregar metadata del feature
    const moduleMetadata = metadataMap.get(moduleCode)!
    moduleMetadata[featureKey] = {
      name: row.name,
      description: row.description,
      requiredPlan: row.required_plans.split(',').map((p) => p.trim()),
    }
  }

  return metadataMap
}

interface ImportResult {
  success: boolean
  created: number
  updated: number
  errors: string[]
}

export interface PlanRow {
  code: string
  name: string
  description?: string
  price_cents: number
  billing_period: BillingPeriod
  status: PlanStatus
  max_businesses: number
  max_users_per_business: number
  max_specialists_per_business: number
  sort_order: number
  monthly_price_cents?: number
  yearly_price_cents?: number
  yearly_discount_percent?: number
}

export interface PlanFeatureRow {
  plan_code: string
  max_appointments_per_month?: number
  max_products?: number
  max_services?: number
  max_customers?: number
  max_storage_mb?: number
  has_custom_branding: boolean
  has_priority_support: boolean
  has_api_access: boolean
}

export interface PlanModuleRow {
  plan_code: string
  module_code: string
  can_read: boolean
  can_write: boolean
  can_delete: boolean
}

export interface PlanPermissionRow {
  plan_code: string
  module_code: string
  permission_key: string
  enabled: boolean
}

interface ModuleAccessData {
  module_id: string
  can_read?: boolean
  can_write?: boolean
  can_delete?: boolean
  custom_permissions?: Record<string, boolean> | null
  features_metadata?: Record<string, FeatureMetadata> | null
}

export async function exportPlansToExcelAction(): Promise<{
  success: boolean
  data?: Buffer
  filename?: string
  error?: string
}> {
  try {
    // Obtener todos los planes con sus módulos
    const plans = await fetchActivePlansAction()
    const plansWithModules: PlanWithModules[] = []

    for (const plan of plans) {
      const planWithModules = await getPlanWithModulesAction(plan.id)
      if (planWithModules) {
        plansWithModules.push(planWithModules)
      }
    }

    // Crear workbook
    const wb = XLSX.utils.book_new()

    // Hoja 1: Plans
    const plansData: PlanRow[] = plansWithModules.map((plan) => ({
      code: plan.code,
      name: plan.name,
      description: plan.description || '',
      price_cents: plan.price_cents,
      billing_period: plan.billing_period,
      status: plan.status,
      max_businesses: plan.max_businesses,
      max_users_per_business: plan.max_users_per_business,
      max_specialists_per_business: plan.max_specialists_per_business,
      sort_order: plan.sort_order,
      monthly_price_cents: plan.monthly_price_cents,
      yearly_price_cents: plan.yearly_price_cents,
      yearly_discount_percent: plan.yearly_discount_percent,
    }))

    const wsPlans = XLSX.utils.json_to_sheet(plansData)
    XLSX.utils.book_append_sheet(wb, wsPlans, 'Plans')

    // Hoja 2: Plan_Features
    const featuresData: PlanFeatureRow[] = plansWithModules.map((plan) => ({
      plan_code: plan.code,
      max_appointments_per_month:
        plan.features.max_appointments_per_month || undefined,
      max_products: plan.features.max_products || undefined,
      max_services: plan.features.max_services || undefined,
      max_customers: plan.features.max_customers || undefined,
      max_storage_mb: plan.features.max_storage_mb || undefined,
      has_custom_branding: plan.features.has_custom_branding,
      has_priority_support: plan.features.has_priority_support,
      has_api_access: plan.features.has_api_access,
    }))

    const wsFeatures = XLSX.utils.json_to_sheet(featuresData)
    XLSX.utils.book_append_sheet(wb, wsFeatures, 'Plan_Features')

    // Hoja 3: Plan_Modules
    const modulesData: PlanModuleRow[] = []
    for (const plan of plansWithModules) {
      for (const moduleAccess of plan.modules) {
        modulesData.push({
          plan_code: plan.code,
          module_code: moduleAccess.module.code,
          can_read: moduleAccess.can_read,
          can_write: moduleAccess.can_write,
          can_delete: moduleAccess.can_delete,
        })
      }
    }

    const wsModules = XLSX.utils.json_to_sheet(modulesData)
    XLSX.utils.book_append_sheet(wb, wsModules, 'Plan_Modules')

    // Hoja 4: Plan_Permissions
    const permissionsData: PlanPermissionRow[] = []
    for (const plan of plansWithModules) {
      for (const moduleAccess of plan.modules) {
        // Agregar permisos custom si existen
        if (moduleAccess.custom_permissions) {
          for (const [key, enabled] of Object.entries(
            moduleAccess.custom_permissions
          )) {
            permissionsData.push({
              plan_code: plan.code,
              module_code: moduleAccess.module.code,
              permission_key: key,
              enabled: enabled,
            })
          }
        }
      }
    }

    const wsPermissions = XLSX.utils.json_to_sheet(permissionsData)
    XLSX.utils.book_append_sheet(wb, wsPermissions, 'Plan_Permissions')

    // Generar buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    const timestamp = new Date().toISOString().split('T')[0]
    const filename = `planes-${timestamp}.xlsx`

    return {
      success: true,
      data: buffer,
      filename,
    }
  } catch (error: any) {
    console.error('Error exporting plans to Excel:', error)
    return {
      success: false,
      error: error.message || 'Error al exportar planes',
    }
  }
}

export async function importPlansFromExcelAction(
  file: File
): Promise<ImportResult> {
  const result: ImportResult = {
    success: false,
    created: 0,
    updated: 0,
    errors: [],
  }

  try {
    // Leer archivo Excel
    const arrayBuffer = await file.arrayBuffer()
    const wb = XLSX.read(arrayBuffer, { type: 'buffer' })

    // Validar que existan las hojas requeridas
    const requiredSheets = ['Plans', 'Plan_Features']
    for (const sheetName of requiredSheets) {
      if (!wb.Sheets[sheetName]) {
        result.errors.push(
          `Hoja '${sheetName}' es obligatoria y no se encontró en el archivo Excel`
        )
        return result
      }
    }

    // Leer y validar datos de cada hoja
    const plansData = XLSX.utils.sheet_to_json<PlanRow>(wb.Sheets['Plans'])
    if (plansData.length === 0) {
      result.errors.push('La hoja "Plans" está vacía o no tiene datos válidos')
      return result
    }

    const featuresData = XLSX.utils.sheet_to_json<PlanFeatureRow>(
      wb.Sheets['Plan_Features']
    )
    if (featuresData.length === 0) {
      result.errors.push(
        'La hoja "Plan_Features" está vacía o no tiene datos válidos'
      )
      return result
    }

    // Hojas opcionales - pueden estar vacías
    const modulesData = wb.Sheets['Plan_Modules']
      ? XLSX.utils.sheet_to_json<PlanModuleRow>(wb.Sheets['Plan_Modules'])
      : []

    const permissionsData = wb.Sheets['Plan_Permissions']
      ? XLSX.utils.sheet_to_json<PlanPermissionRow>(
          wb.Sheets['Plan_Permissions']
        )
      : []

    const featuresMetadataData = wb.Sheets['Features_Metadata']
      ? XLSX.utils.sheet_to_json<FeaturesMetadataRow>(
          wb.Sheets['Features_Metadata']
        )
      : []

    // Validar códigos de plan únicos
    const planCodes = plansData.map((p) => p.code)
    const uniquePlanCodes = new Set(planCodes)
    if (planCodes.length !== uniquePlanCodes.size) {
      const duplicates = planCodes.filter(
        (code, index) => planCodes.indexOf(code) !== index
      )
      result.errors.push(
        `Códigos de plan duplicados: ${[...new Set(duplicates)].join(', ')}`
      )
      return result
    }

    // Procesar cada plan
    for (const planRow of plansData) {
      try {
        await processPlan(
          planRow,
          featuresData,
          modulesData,
          permissionsData,
          featuresMetadataData,
          result
        )
      } catch (error: any) {
        result.errors.push(
          `Error procesando plan ${planRow.code}: ${error.message}`
        )
      }
    }

    result.success = result.errors.length === 0
    return result
  } catch (error: any) {
    console.error('Error importing plans from Excel:', error)
    result.errors.push(`Error general: ${error.message}`)
    return result
  }
}

async function processPlan(
  planRow: PlanRow,
  featuresData: PlanFeatureRow[],
  modulesData: PlanModuleRow[],
  permissionsData: PlanPermissionRow[],
  featuresMetadataData: FeaturesMetadataRow[],
  result: ImportResult
): Promise<void> {
  // Validaciones básicas
  if (!planRow.code || !planRow.name) {
    throw new Error(
      `Plan con código '${planRow.code}' requiere nombre y código válidos`
    )
  }

  if (!['monthly', 'yearly', 'lifetime'].includes(planRow.billing_period)) {
    throw new Error(`Plan '${planRow.code}': período de facturación inválido`)
  }

  if (!['active', 'inactive', 'deprecated'].includes(planRow.status)) {
    throw new Error(`Plan '${planRow.code}': estado inválido`)
  }

  // Buscar features para este plan
  const featureRow = featuresData.find((f) => f.plan_code === planRow.code)
  if (!featureRow) {
    throw new Error(`No se encontraron features para el plan '${planRow.code}'`)
  }

  // Buscar módulos para este plan
  const planModules = modulesData.filter((m) => m.plan_code === planRow.code)
  const planPermissions = permissionsData.filter(
    (p) => p.plan_code === planRow.code
  )

  const features = Object.fromEntries(
    Object.entries(featureRow).map(([key, value]) => [key, value ?? null]) // asigna null si viene undefined
  ) as PlanFeatures

  // Crear objeto PlanInsert
  const planData: PlanInsert = {
    code: planRow.code,
    name: planRow.name,
    description: planRow.description,
    price_cents: planRow.price_cents,
    billing_period: planRow.billing_period,
    status: planRow.status,
    max_businesses: planRow.max_businesses,
    max_users_per_business: planRow.max_users_per_business,
    max_specialists_per_business: planRow.max_specialists_per_business,
    features,
    sort_order: planRow.sort_order,
    monthly_price_cents: planRow.monthly_price_cents,
    yearly_price_cents: planRow.yearly_price_cents,
    yearly_discount_percent: planRow.yearly_discount_percent,
  }

  // Verificar si el plan ya existe
  const supabase = await getSupabaseAdminClient()
  const { data: existingPlan } = await supabase
    .from('plans')
    .select('id')
    .eq('code', planRow.code)
    .single()

  let planId: string

  if (existingPlan) {
    // Actualizar plan existente
    const updateResult = await updatePlanAction(existingPlan.id, planData)
    if (!updateResult.success) {
      throw new Error(updateResult.error || 'Error actualizando plan')
    }
    planId = existingPlan.id
    result.updated++
  } else {
    // Crear nuevo plan
    const createResult = await createPlanAction(planData)
    if (!createResult.success) {
      throw new Error(createResult.error || 'Error creando plan')
    }
    planId = createResult.data!.id
    result.created++
  }

  // Procesar módulos y permisos
  await processPlanModules(
    planId,
    planModules,
    planPermissions,
    featuresMetadataData
  )
}

async function processPlanModules(
  planId: string,
  modules: PlanModuleRow[],
  permissions: PlanPermissionRow[],
  featuresMetadataData: FeaturesMetadataRow[]
): Promise<void> {
  const moduleAccessData: ModuleAccessData[] = []

  // Obtener módulos disponibles
  const supabase = await getSupabaseAdminClient()
  const { data: availableModules } = await supabase
    .from('plan_modules')
    .select('id, code')

  if (!availableModules) {
    throw new Error('No se pudieron obtener los módulos disponibles')
  }

  const moduleMap = new Map(availableModules.map((m) => [m.code, m.id]))

  // Validar módulos únicos por plan
  const moduleCodes = modules.map((m) => m.module_code)
  const uniqueModuleCodes = new Set(moduleCodes)
  if (moduleCodes.length !== uniqueModuleCodes.size) {
    const duplicates = moduleCodes.filter(
      (code, index) => moduleCodes.indexOf(code) !== index
    )
    throw new Error(
      `Módulos duplicados en el plan: ${[...new Set(duplicates)].join(', ')}`
    )
  }

  for (const moduleRow of modules) {
    const moduleId = moduleMap.get(moduleRow.module_code)
    if (!moduleId) {
      throw new Error(
        `Módulo '${moduleRow.module_code}' no existe en el sistema`
      )
    }

    // Validar y convertir permisos booleanos
    try {
      moduleRow.can_read = normalizeBoolean(moduleRow.can_read)
      moduleRow.can_write = normalizeBoolean(moduleRow.can_write)
      moduleRow.can_delete = normalizeBoolean(moduleRow.can_delete)
    } catch (error: any) {
      throw new Error(`Módulo '${moduleRow.module_code}': ${error.message}`)
    }

    // Buscar permisos para este módulo
    const modulePermissions = permissions.filter(
      (p) => p.module_code === moduleRow.module_code
    )
    const customPermissions: Record<string, boolean> = {}

    for (const perm of modulePermissions) {
      try {
        perm.enabled = normalizeBoolean(perm.enabled)
        customPermissions[perm.permission_key] = perm.enabled
      } catch (error: any) {
        throw new Error(
          `Permiso '${perm.permission_key}' en módulo '${perm.module_code}': ${error.message}`
        )
      }
    }

    moduleAccessData.push({
      module_id: moduleId,
      can_read: moduleRow.can_read,
      can_write: moduleRow.can_write,
      can_delete: moduleRow.can_delete,
      custom_permissions:
        Object.keys(customPermissions).length > 0
          ? customPermissions
          : undefined,
      features_metadata: null,
    })
  }

  // Procesar features metadata y agregarla a moduleAccessData ANTES de guardar en DB
  const featuresMetadataMap = processFeaturesMetadata(featuresMetadataData)

  // Agregar features_metadata a cada módulo que tenga metadata
  for (const moduleAccess of moduleAccessData) {
    const moduleCode = availableModules.find(
      (m) => m.id === moduleAccess.module_id
    )?.code
    if (moduleCode && featuresMetadataMap.has(moduleCode)) {
      moduleAccess.features_metadata =
        featuresMetadataMap.get(moduleCode) || null
    }
  }

  // Actualizar acceso a módulos (solo si hay módulos definidos) DESPUÉS de procesar metadata
  if (moduleAccessData.length > 0) {
    const result = await setPlanModuleAccessAction(
      planId,
      moduleAccessData as PlanModuleAccessInsert[]
    )
    if (!result.success) {
      throw new Error(result.error || 'Error configurando acceso a módulos')
    }
  }
}

export async function importPlansWithProgress(
  formData: FormData
): Promise<{ sessionId: string; status: string }> {
  try {
    // Extraer datos del FormData
    const file = formData.get('file') as File
    const sessionId = formData.get('sessionId') as string

    // Validar que se recibió sessionId
    if (!sessionId) {
      throw new Error('Session ID requerido')
    }

    // Leer archivo Excel
    const arrayBuffer = await file.arrayBuffer()
    const wb = XLSX.read(arrayBuffer, { type: 'buffer' })

    // Validar que existan las hojas requeridas
    const requiredSheets = ['Plans', 'Plan_Features']
    for (const sheetName of requiredSheets) {
      if (!wb.Sheets[sheetName]) {
        throw new Error(
          `Hoja '${sheetName}' es obligatoria y no se encontró en el archivo Excel`
        )
      }
    }

    // Leer datos de las hojas
    const plansData = XLSX.utils.sheet_to_json<PlanRow>(wb.Sheets['Plans'])
    if (plansData.length === 0) {
      throw new Error('La hoja "Plans" está vacía o no tiene datos válidos')
    }

    const featuresData = XLSX.utils.sheet_to_json<PlanFeatureRow>(
      wb.Sheets['Plan_Features']
    )
    if (featuresData.length === 0) {
      throw new Error(
        'La hoja "Plan_Features" está vacía o no tiene datos válidos'
      )
    }

    // Hojas opcionales
    const modulesData = wb.Sheets['Plan_Modules']
      ? XLSX.utils.sheet_to_json<PlanModuleRow>(wb.Sheets['Plan_Modules'])
      : []

    const permissionsData = wb.Sheets['Plan_Permissions']
      ? XLSX.utils.sheet_to_json<PlanPermissionRow>(
          wb.Sheets['Plan_Permissions']
        )
      : []

    const featuresMetadataData = wb.Sheets['Features_Metadata']
      ? XLSX.utils.sheet_to_json<FeaturesMetadataRow>(
          wb.Sheets['Features_Metadata']
        )
      : []

    // Validar códigos de plan únicos
    const planCodes = plansData.map((p) => p.code)
    const uniquePlanCodes = new Set(planCodes)
    if (planCodes.length !== uniquePlanCodes.size) {
      const duplicates = planCodes.filter(
        (code, index) => planCodes.indexOf(code) !== index
      )
      throw new Error(
        `Códigos de plan duplicados: ${[...new Set(duplicates)].join(', ')}`
      )
    }

    // Iniciar procesamiento en background (fire and forget)
    

    importService
      .importWithProgress(
        plansData,
        async (planRow) => {
          // Procesar cada plan individualmente
          await processPlan(
            planRow,
            featuresData,
            modulesData,
            permissionsData,
            featuresMetadataData,
            {
              success: true,
              created: 0,
              updated: 0,
              errors: [],
            }
          )
          return planRow
        },
        {
          batchSize: 5, // Procesar de 5 en 5 para mejor UX
          continueOnError: false, // Detener en el primer error
        },
        sessionId // Pasar el sessionId proporcionado
      )
      .then((result) => {
        if (result.success) {
          console.log(`Import ${sessionId} completed successfully:`, result)
        } else {
          console.log(`Import ${sessionId} completed with errors:`, result)
        }
      })
      .catch((error) => {
        console.error(
          `Import ${sessionId} .catch() executed with error:`,
          error
        )
        // El progreso ya se marcó como 'error' en el GenericImportService
      })

    // Devolver inmediatamente con sessionId
    return { sessionId, status: 'started' }
  } catch (error: any) {
    console.error('Error starting import:', error)
    throw error // Re-throw para que el cliente sepa que falló
  }
}

export async function createDefaultPlansTemplateAction(): Promise<{
  success: boolean
  data?: Buffer
  filename?: string
  error?: string
}> {
  try {
    // Crear workbook con estructura de ejemplo
    const wb = XLSX.utils.book_new()

    // Hoja 1: Plans - Datos básicos con ejemplos
    const plansExample: PlanRow[] = DEFAULT_PLAN_TEMPLATES.plans

    const wsPlans = XLSX.utils.json_to_sheet(plansExample)
    XLSX.utils.book_append_sheet(wb, wsPlans, 'Plans')

    // Hoja 2: Plan_Features - Límites y configuraciones
    const featuresExample: PlanFeatureRow[] = DEFAULT_PLAN_TEMPLATES.features

    const wsFeatures = XLSX.utils.json_to_sheet(featuresExample)
    XLSX.utils.book_append_sheet(wb, wsFeatures, 'Plan_Features')

    // Hoja 3: Plan_Modules - Acceso a módulos
    const modulesExample: PlanModuleRow[] = DEFAULT_PLAN_TEMPLATES.modules

    const wsModules = XLSX.utils.json_to_sheet(modulesExample)
    XLSX.utils.book_append_sheet(wb, wsModules, 'Plan_Modules')

    // Hoja 4: Plan_Permissions - Permisos granulares (ejemplos)
    const permissionsExample: PlanPermissionRow[] =
      DEFAULT_PLAN_TEMPLATES.permissions

    const wsPermissions = XLSX.utils.json_to_sheet(permissionsExample)
    XLSX.utils.book_append_sheet(wb, wsPermissions, 'Plan_Permissions')

    // Hoja 5: Features_Metadata - Definición de features disponibles
    const featuresMetadataExample: FeaturesMetadataRow[] =
      DEFAULT_PLAN_TEMPLATES.featuresMetadata
    const wsFeaturesMetadata = XLSX.utils.json_to_sheet(featuresMetadataExample)
    XLSX.utils.book_append_sheet(wb, wsFeaturesMetadata, 'Features_Metadata')

    // Generar buffer con opciones para mantener tipos booleanos consistentes
    const buffer = XLSX.write(wb, {
      type: 'buffer',
      bookType: 'xlsx',
      cellDates: true,
      Props: {
        Title: 'Plantilla de Planes',
        Subject: 'Configuración de planes y permisos',
        Author: 'Sistema de Gestión',
      },
    })

    const timestamp = new Date().toISOString().split('T')[0]
    const filename = `plantilla-planes-ejemplo-${timestamp}.xlsx`

    return {
      success: true,
      data: buffer,
      filename,
    }
  } catch (error: any) {
    console.error('Error creating default template:', error)
    return {
      success: false,
      error: error.message || 'Error al crear plantilla por defecto',
    }
  }
}
