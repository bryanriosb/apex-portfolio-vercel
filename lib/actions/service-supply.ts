'use server'

import {
  getSupabaseAdminClient,
  insertRecord,
  deleteRecord,
} from '@/lib/actions/supabase'
import type {
  ServiceSupply,
  ServiceSupplyInsert,
  ServiceSupplyWithProduct,
} from '@/lib/models/product'

export async function fetchServiceSuppliesAction(
  serviceId: string
): Promise<ServiceSupplyWithProduct[]> {
  try {
    const client = await getSupabaseAdminClient()
    const { data, error } = await client
      .from('service_supplies')
      .select(`
        *,
        product:products(
          id,
          name,
          cost_price_cents,
          current_stock,
          unit_of_measure:unit_of_measures(abbreviation)
        )
      `)
      .eq('service_id', serviceId)

    if (error) {
      console.error('Error fetching service supplies:', error)
      return []
    }

    return (data || []) as ServiceSupplyWithProduct[]
  } catch (error) {
    console.error('Error fetching service supplies:', error)
    return []
  }
}

export async function getSuppliesForServicesAction(
  serviceIds: string[]
): Promise<ServiceSupplyWithProduct[]> {
  if (!serviceIds.length) return []

  try {
    const client = await getSupabaseAdminClient()
    const { data, error } = await client
      .from('service_supplies')
      .select(`
        *,
        product:products(
          id,
          name,
          cost_price_cents,
          current_stock,
          unit_of_measure:unit_of_measures(abbreviation)
        )
      `)
      .in('service_id', serviceIds)

    if (error) {
      console.error('Error fetching supplies for services:', error)
      return []
    }

    return (data || []) as ServiceSupplyWithProduct[]
  } catch (error) {
    console.error('Error fetching supplies for services:', error)
    return []
  }
}

export async function createServiceSupplyAction(
  data: ServiceSupplyInsert
): Promise<{ success: boolean; data?: ServiceSupply; error?: string }> {
  try {
    const supply = await insertRecord<ServiceSupply>('service_supplies', data)

    if (!supply) {
      return { success: false, error: 'Error al asociar el insumo' }
    }

    return { success: true, data: supply }
  } catch (error: any) {
    console.error('Error creating service supply:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}

export async function deleteServiceSupplyAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await deleteRecord('service_supplies', id)
    return { success: true }
  } catch (error: any) {
    console.error('Error deleting service supply:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}

export async function updateServiceSuppliesAction(
  serviceId: string,
  supplies: Array<{ product_id: string; default_quantity: number; is_required: boolean }>
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = await getSupabaseAdminClient()

    // Eliminar todas las asociaciones existentes
    const { error: deleteError } = await client
      .from('service_supplies')
      .delete()
      .eq('service_id', serviceId)

    if (deleteError) {
      return { success: false, error: deleteError.message }
    }

    // Insertar las nuevas asociaciones
    if (supplies.length > 0) {
      const suppliesData = supplies.map((s) => ({
        service_id: serviceId,
        product_id: s.product_id,
        default_quantity: s.default_quantity,
        is_required: s.is_required,
      }))

      const { error: insertError } = await client
        .from('service_supplies')
        .insert(suppliesData)

      if (insertError) {
        return { success: false, error: insertError.message }
      }
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error updating service supplies:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}
