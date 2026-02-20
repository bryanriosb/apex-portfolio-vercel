'use server'

import {
  getAllRecords,
  getRecordById,
  insertRecord,
  updateRecord,
  deleteRecord,
  deleteRecords,
} from '@/lib/actions/supabase'
import type {
  Business,
  BusinessInsert,
  BusinessWithAccount,
} from '@/lib/models/business/business'
import { getSupabaseClient } from './supabase'

export interface BusinessListResponse {
  data: BusinessWithAccount[]
  total: number
  total_pages: number
}

/**
 * Valida si un business account puede crear más sucursales según su plan
 */
async function validateBusinessLimitsForAccount(
  businessAccountId: string
): Promise<{ isValid: boolean; error?: string }> {
  try {
    // Obtener información del business account y su plan
    const client = await getSupabaseClient()

    const { data: account, error: accountError } = await client
      .from('business_accounts')
      .select(
        `
        *,
        plan:plans(*)
      `
      )
      .eq('id', businessAccountId)
      .single()

    if (accountError || !account) {
      return { isValid: false, error: 'No se encontró la cuenta de negocio' }
    }

    // Si no hay plan, no se puede crear
    if (!account.plan) {
      return { isValid: false, error: 'La cuenta no tiene un plan asignado' }
    }

    // Contar sucursales existentes
    const { count, error: countError } = await client
      .from('businesses')
      .select('*', { count: 'exact', head: true })
      .eq('business_account_id', businessAccountId)

    if (countError) {
      return {
        isValid: false,
        error: 'Error al verificar sucursales existentes',
      }
    }

    const currentCount = count || 0
    const maxAllowed = account.plan.max_businesses

    if (currentCount >= maxAllowed) {
      return {
        isValid: false,
        error: `Has alcanzado el límite de ${maxAllowed} sucursales para tu plan ${account.plan.name}`,
      }
    }

    return { isValid: true }
  } catch (error: any) {
    console.error('Error validating business limits:', error)
    return { isValid: false, error: 'Error al validar límites del plan' }
  }
}

/**
 * Obtiene todos los negocios con paginación
 */
export async function fetchBusinessesAction(params?: {
  page?: number
  page_size?: number
  name?: string[]
  business_account_id?: string
}): Promise<BusinessListResponse> {
  try {
    // Construir filtros para la consulta
    const filters: Record<string, any> = {}

    if (params?.business_account_id) {
      filters.business_account_id = params.business_account_id
    }

    const businesses = await getAllRecords<BusinessWithAccount>('businesses', {
      select: '*, business_account:business_accounts(company_name)',
      filters: Object.keys(filters).length > 0 ? filters : undefined,
      order: { column: 'created_at', ascending: false },
    })

    // Filtrar por nombre si se proporciona (esto se hace en memoria porque es búsqueda parcial)
    let filteredBusinesses = businesses

    if (params?.name && params.name.length > 0) {
      const searchTerm = params.name[0].toLowerCase()
      filteredBusinesses = filteredBusinesses.filter((business) =>
        business.name.toLowerCase().includes(searchTerm)
      )
    }

    const page = params?.page || 1
    const pageSize = params?.page_size || 7
    const start = (page - 1) * pageSize
    const end = start + pageSize

    const paginatedData = filteredBusinesses.slice(start, end)
    const totalPages = Math.ceil(filteredBusinesses.length / pageSize)

    return {
      data: paginatedData,
      total: filteredBusinesses.length,
      total_pages: totalPages,
    }
  } catch (error) {
    console.error('Error fetching businesses:', error)
    return {
      data: [],
      total: 0,
      total_pages: 0,
    }
  }
}

/**
 * Obtiene un negocio por ID
 */
export async function getBusinessByIdAction(
  id: string
): Promise<Business | null> {
  try {
    return await getRecordById<Business>('businesses', id)
  } catch (error) {
    console.error('Error fetching business:', error)
    return null
  }
}

/**
 * Crea un nuevo negocio con validación de límites del plan
 */
export async function createBusinessAction(
  data: BusinessInsert
): Promise<{ success: boolean; data?: Business; error?: string }> {
  try {
    // Validar límites del plan antes de crear
    const limitValidation = await validateBusinessLimitsForAccount(
      data.business_account_id
    )

    if (!limitValidation.isValid) {
      return {
        success: false,
        error: limitValidation.error || 'Límite de sucursales alcanzado',
      }
    }

    const business = await insertRecord<Business>('businesses', data)

    if (!business) {
      return { success: false, error: 'Error al crear el negocio' }
    }

    return { success: true, data: business }
  } catch (error: any) {
    console.error('Error creating business:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}

/**
 * Actualiza un negocio
 */
export async function updateBusinessAction(
  id: string,
  data: Partial<Business>
): Promise<{ success: boolean; data?: Business; error?: string }> {
  try {
    const business = await updateRecord<Business>('businesses', id, data)

    if (!business) {
      return { success: false, error: 'Error al actualizar el negocio' }
    }

    return { success: true, data: business }
  } catch (error: any) {
    console.error('Error updating business:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}

/**
 * Elimina un negocio
 */
export async function deleteBusinessAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await deleteRecord('businesses', id)
    return { success: true }
  } catch (error: any) {
    console.error('Error deleting business:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}

export async function deleteBusinessesAction(
  ids: string[]
): Promise<{ success: boolean; deletedCount: number; error?: string }> {
  try {
    return await deleteRecords('businesses', ids)
  } catch (error: any) {
    console.error('Error batch deleting businesses:', error)
    return { success: false, deletedCount: 0, error: error.message }
  }
}
