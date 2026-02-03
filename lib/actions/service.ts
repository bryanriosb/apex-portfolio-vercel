'use server'

import {
  getAllRecords,
  getRecordById,
  insertRecord,
  updateRecord,
  deleteRecord,
  deleteRecords,
  getSupabaseAdminClient,
} from '@/lib/actions/supabase'
import type {
  Service,
  ServiceInsert,
  ServiceUpdate,
  ServiceCategory,
  ServiceWithCategory,
} from '@/lib/models/service/service'
import type { ServiceType } from '@/lib/types/enums'

export interface ServiceListResponse {
  data: ServiceWithCategory[]
  total: number
  total_pages: number
}

export async function fetchServicesAction(params?: {
  page?: number
  page_size?: number
  business_id?: string
  category_id?: string | string[]
  is_featured?: boolean | string | string[]
  service_type?: ServiceType | ServiceType[]
  name?: string
  exclude_with_supplies?: boolean
}): Promise<ServiceListResponse> {
  try {
    const services = await getAllRecords<ServiceWithCategory>('services', {
      select: '*, category:service_categories(*)',
      order: { column: 'created_at', ascending: false },
    })

    let filteredServices = services

    if (params?.business_id) {
      filteredServices = filteredServices.filter(
        (service) => service.business_id === params.business_id
      )
    }

    if (params?.category_id) {
      const categoryIds = Array.isArray(params.category_id)
        ? params.category_id
        : [params.category_id]
      filteredServices = filteredServices.filter(
        (service) => service.category_id && categoryIds.includes(service.category_id)
      )
    }

    if (params?.is_featured !== undefined) {
      const featuredValues = Array.isArray(params.is_featured)
        ? params.is_featured
        : [params.is_featured]
      const boolValues = featuredValues.map((v) => v === true || v === 'true')
      filteredServices = filteredServices.filter(
        (service) => boolValues.includes(service.is_featured)
      )
    }

    if (params?.service_type) {
      const typeValues = Array.isArray(params.service_type)
        ? params.service_type
        : [params.service_type]
      filteredServices = filteredServices.filter(
        (service) => typeValues.includes(service.service_type)
      )
    }

    if (params?.name) {
      const searchTerm = params.name.toLowerCase()
      filteredServices = filteredServices.filter(
        (service) => service.name.toLowerCase().includes(searchTerm)
      )
    }

    // Filtrar servicios que tienen insumos asociados
    if (params?.exclude_with_supplies) {
      const client = await getSupabaseAdminClient()
      const serviceIds = filteredServices.map((s) => s.id)

      if (serviceIds.length > 0) {
        const { data: servicesWithSupplies } = await client
          .from('service_supplies')
          .select('service_id')
          .in('service_id', serviceIds)

        const servicesWithSuppliesSet = new Set(
          servicesWithSupplies?.map((s) => s.service_id) || []
        )

        filteredServices = filteredServices.filter(
          (service) => !servicesWithSuppliesSet.has(service.id)
        )
      }
    }

    const page = params?.page || 1
    const pageSize = params?.page_size || 20
    const start = (page - 1) * pageSize
    const end = start + pageSize

    const paginatedData = filteredServices.slice(start, end)
    const totalPages = Math.ceil(filteredServices.length / pageSize)

    return {
      data: paginatedData,
      total: filteredServices.length,
      total_pages: totalPages,
    }
  } catch (error) {
    console.error('Error fetching services:', error)
    return {
      data: [],
      total: 0,
      total_pages: 0,
    }
  }
}

export async function getServiceByIdAction(id: string): Promise<Service | null> {
  try {
    return await getRecordById<Service>('services', id)
  } catch (error) {
    console.error('Error fetching service:', error)
    return null
  }
}

export async function createServiceAction(
  data: ServiceInsert
): Promise<{ success: boolean; data?: Service; error?: string }> {
  try {
    const service = await insertRecord<Service>('services', data)

    if (!service) {
      return { success: false, error: 'Error al crear el servicio' }
    }

    return { success: true, data: service }
  } catch (error: any) {
    console.error('Error creating service:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}

export async function updateServiceAction(
  id: string,
  data: ServiceUpdate
): Promise<{ success: boolean; data?: Service; error?: string }> {
  try {
    const service = await updateRecord<Service>('services', id, data)

    if (!service) {
      return { success: false, error: 'Error al actualizar el servicio' }
    }

    return { success: true, data: service }
  } catch (error: any) {
    console.error('Error updating service:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}

export async function deleteServiceAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await deleteRecord('services', id)
    return { success: true }
  } catch (error: any) {
    console.error('Error deleting service:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}

export async function fetchServiceCategoriesAction(): Promise<ServiceCategory[]> {
  try {
    return await getAllRecords<ServiceCategory>('service_categories', {
      order: { column: 'name', ascending: true },
    })
  } catch (error) {
    console.error('Error fetching service categories:', error)
    return []
  }
}

export async function createServiceCategoryAction(
  name: string
): Promise<{ success: boolean; data?: ServiceCategory; error?: string }> {
  try {
    const category = await insertRecord<ServiceCategory>('service_categories', {
      name,
      icon_key: null,
    })

    if (!category) {
      return { success: false, error: 'Error al crear la categoría' }
    }

    return { success: true, data: category }
  } catch (error: any) {
    console.error('Error creating service category:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}

export async function deleteServicesAction(
  ids: string[]
): Promise<{ success: boolean; deletedCount: number; error?: string }> {
  try {
    return await deleteRecords('services', ids)
  } catch (error: any) {
    console.error('Error batch deleting services:', error)
    return { success: false, deletedCount: 0, error: error.message }
  }
}
