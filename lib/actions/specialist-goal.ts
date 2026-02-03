'use server'

import {
  getAllRecords,
  getRecordById,
  insertRecord,
  updateRecord,
  deleteRecord,
  getSupabaseAdminClient,
} from '@/lib/actions/supabase'
import type {
  SpecialistGoal,
  SpecialistGoalInsert,
  SpecialistGoalUpdate,
} from '@/lib/models/specialist/specialist-goal'

export async function fetchSpecialistGoalsAction(params: {
  business_id: string
  specialist_id?: string
  is_active?: boolean
}): Promise<SpecialistGoal[]> {
  try {
    const filters: Record<string, any> = {
      business_id: params.business_id,
    }

    if (params.specialist_id) {
      filters.specialist_id = params.specialist_id
    }

    if (params.is_active !== undefined) {
      filters.is_active = params.is_active
    }

    return await getAllRecords<SpecialistGoal>('specialist_goals', {
      filters,
      order: { column: 'created_at', ascending: false },
    })
  } catch (error) {
    console.error('Error fetching specialist goals:', error)
    return []
  }
}

export async function getActiveGoalForSpecialistAction(
  specialistId: string
): Promise<SpecialistGoal | null> {
  try {
    const supabase = await getSupabaseAdminClient()
    const now = new Date().toISOString()

    const { data, error } = await supabase
      .from('specialist_goals')
      .select('*')
      .eq('specialist_id', specialistId)
      .eq('is_active', true)
      .lte('period_start', now)
      .gte('period_end', now)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching active goal:', error)
    return null
  }
}

export async function getActiveGoalsForBusinessAction(
  businessId: string
): Promise<SpecialistGoal[]> {
  try {
    const supabase = await getSupabaseAdminClient()
    const now = new Date().toISOString()

    const { data, error } = await supabase
      .from('specialist_goals')
      .select('*')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .lte('period_start', now)
      .gte('period_end', now)

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching active goals for business:', error)
    return []
  }
}

export async function createSpecialistGoalAction(
  data: SpecialistGoalInsert
): Promise<{ success: boolean; data?: SpecialistGoal; error?: string }> {
  try {
    const goal = await insertRecord<SpecialistGoal>('specialist_goals', {
      ...data,
      current_value: data.current_value ?? 0,
      is_active: data.is_active ?? true,
    })

    if (!goal) {
      return { success: false, error: 'Error al crear la meta' }
    }

    return { success: true, data: goal }
  } catch (error: any) {
    console.error('Error creating specialist goal:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}

export async function updateSpecialistGoalAction(
  id: string,
  data: SpecialistGoalUpdate
): Promise<{ success: boolean; data?: SpecialistGoal; error?: string }> {
  try {
    const goal = await updateRecord<SpecialistGoal>('specialist_goals', id, data)

    if (!goal) {
      return { success: false, error: 'Error al actualizar la meta' }
    }

    return { success: true, data: goal }
  } catch (error: any) {
    console.error('Error updating specialist goal:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}

export async function deleteSpecialistGoalAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await deleteRecord('specialist_goals', id)
    return { success: true }
  } catch (error: any) {
    console.error('Error deleting specialist goal:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}

export async function incrementGoalProgressAction(
  specialistId: string,
  goalType: string,
  incrementBy: number = 1
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await getSupabaseAdminClient()
    const now = new Date().toISOString()

    const { data: goal, error: fetchError } = await supabase
      .from('specialist_goals')
      .select('*')
      .eq('specialist_id', specialistId)
      .eq('goal_type', goalType)
      .eq('is_active', true)
      .lte('period_start', now)
      .gte('period_end', now)
      .single()

    if (fetchError || !goal) {
      return { success: true }
    }

    const { error: updateError } = await supabase
      .from('specialist_goals')
      .update({ current_value: goal.current_value + incrementBy })
      .eq('id', goal.id)

    if (updateError) throw updateError
    return { success: true }
  } catch (error: any) {
    console.error('Error incrementing goal progress:', error)
    return { success: false, error: error.message }
  }
}

export async function getGoalByIdAction(id: string): Promise<SpecialistGoal | null> {
  try {
    return await getRecordById<SpecialistGoal>('specialist_goals', id)
  } catch (error) {
    console.error('Error fetching goal by id:', error)
    return null
  }
}
