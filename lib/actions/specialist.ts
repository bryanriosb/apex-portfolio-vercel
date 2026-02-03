'use server'

import {
  getAllRecords,
  getRecordById,
  insertRecord,
  updateRecord,
  deleteRecord,
  deleteRecords,
} from '@/lib/actions/supabase'
import type { AppointmentStatus } from '@/lib/types/enums'
import type {
  Specialist,
  SpecialistInsert,
  SpecialistUpdate,
  SpecialistAvailability,
  SpecialistWithAvailability,
} from '@/lib/models/specialist/specialist'
import { getSupabaseAdminClient } from '@/lib/actions/supabase'

export interface SpecialistListResponse {
  data: Specialist[]
  total: number
  total_pages: number
}

export async function fetchSpecialistsAction(params?: {
  page?: number
  page_size?: number
  business_id?: string
  is_featured?: boolean
  search?: string
}): Promise<SpecialistListResponse> {
  try {
    const specialists = await getAllRecords<Specialist>('specialists', {
      order: { column: 'created_at', ascending: false },
    })

    let filteredSpecialists = specialists

    if (params?.business_id) {
      filteredSpecialists = filteredSpecialists.filter(
        (specialist) => specialist.business_id === params.business_id
      )
    }

    if (params?.is_featured !== undefined) {
      filteredSpecialists = filteredSpecialists.filter(
        (specialist) => specialist.is_featured === params.is_featured
      )
    }

    if (params?.search) {
      const searchLower = params.search.toLowerCase()
      filteredSpecialists = filteredSpecialists.filter(
        (specialist) =>
          specialist.first_name.toLowerCase().includes(searchLower) ||
          specialist.last_name?.toLowerCase().includes(searchLower) ||
          specialist.specialty?.toLowerCase().includes(searchLower)
      )
    }

    const page = params?.page || 1
    const pageSize = params?.page_size || 20
    const start = (page - 1) * pageSize
    const end = start + pageSize

    const paginatedData = filteredSpecialists.slice(start, end)
    const totalPages = Math.ceil(filteredSpecialists.length / pageSize)

    return {
      data: paginatedData,
      total: filteredSpecialists.length,
      total_pages: totalPages,
    }
  } catch (error) {
    console.error('Error fetching specialists:', error)
    return {
      data: [],
      total: 0,
      total_pages: 0,
    }
  }
}

export async function getSpecialistByIdAction(
  id: string
): Promise<SpecialistWithAvailability | null> {
  try {
    const specialist = await getRecordById<Specialist>('specialists', id)
    if (!specialist) return null

    const supabase = await getSupabaseAdminClient()

    const { data: availability } = await supabase
      .from('specialist_availability')
      .select('*')
      .eq('specialist_id', id)
      .order('day_of_week')

    const { data: timeOff } = await supabase
      .from('specialist_time_off')
      .select('*')
      .eq('specialist_id', id)
      .gte('end_time', new Date().toISOString())
      .order('start_time')

    // Get phone from auth.users if user_profile_id exists
    let phone = null
    if (specialist.user_profile_id) {
      const { data: userProfile } = await supabase
        .from('users_profile')
        .select('user_id')
        .eq('id', specialist.user_profile_id)
        .single()

      if (userProfile?.user_id) {
        const { data: authUser } = await supabase.auth.admin.getUserById(userProfile.user_id)
        phone = authUser.user?.phone || null
      }
    }

    return {
      ...specialist,
      phone,
      availability: availability || [],
      time_off: timeOff || [],
    }
  } catch (error) {
    console.error('Error fetching specialist:', error)
    return null
  }
}

export interface CreateSpecialistWithAuthData {
  specialistData: SpecialistInsert
  credentials?: {
    email: string
    password: string
    phone?: string
  }
}

export async function createSpecialistAction(
  data: SpecialistInsert
): Promise<{ success: boolean; data?: Specialist; error?: string }> {
  try {
    const specialist = await insertRecord<Specialist>('specialists', data)

    if (!specialist) {
      return { success: false, error: 'Error al crear el especialista' }
    }

    return { success: true, data: specialist }
  } catch (error: any) {
    console.error('Error creating specialist:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}

export async function createSpecialistWithAuthAction(
  input: CreateSpecialistWithAuthData
): Promise<{ success: boolean; data?: Specialist; error?: string }> {
  const { specialistData, credentials } = input

  try {
    const supabase = await getSupabaseAdminClient()

    let userProfileId: string | null = null

    if (credentials?.email && credentials?.password) {
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: credentials.email,
        password: credentials.password,
        phone: credentials.phone,
        email_confirm: true,
        phone_confirm: credentials.phone ? true : undefined,
        user_metadata: {
          name: `${specialistData.first_name} ${specialistData.last_name || ''}`.trim(),
        },
      })

      if (authError || !authData.user) {
        console.error('Error creating auth user:', authError)
        return { success: false, error: authError?.message || 'Error al crear usuario de autenticación' }
      }

      const { data: userProfile, error: profileError } = await supabase
        .from('users_profile')
        .insert({
          user_id: authData.user.id,
          role: 'professional',
        })
        .select('id')
        .single()

      if (profileError || !userProfile) {
        await supabase.auth.admin.deleteUser(authData.user.id)
        console.error('Error creating user profile:', profileError)
        return { success: false, error: profileError?.message || 'Error al crear perfil de usuario' }
      }

      userProfileId = userProfile.id
    }

    const specialistToInsert = {
      ...specialistData,
      user_profile_id: userProfileId,
    }

    const specialist = await insertRecord<Specialist>('specialists', specialistToInsert)

    if (!specialist) {
      if (userProfileId) {
        await supabase.from('users_profile').delete().eq('id', userProfileId)
      }
      return { success: false, error: 'Error al crear el especialista' }
    }

    return { success: true, data: specialist }
  } catch (error: any) {
    console.error('Error creating specialist with auth:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}

export async function updateSpecialistAction(
  id: string,
  data: SpecialistUpdate
): Promise<{ success: boolean; data?: Specialist; error?: string }> {
  try {
    const specialist = await updateRecord<Specialist>('specialists', id, data)

    if (!specialist) {
      return { success: false, error: 'Error al actualizar el especialista' }
    }

    return { success: true, data: specialist }
  } catch (error: any) {
    console.error('Error updating specialist:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}

export interface UpdateSpecialistCredentialsData {
  specialistId: string
  newEmail?: string
  newPassword?: string
  newPhone?: string
}

export async function updateSpecialistCredentialsAction(
  input: UpdateSpecialistCredentialsData
): Promise<{ success: boolean; error?: string }> {
  const { specialistId, newEmail, newPassword, newPhone } = input

  if (!newEmail && !newPassword && !newPhone) {
    return { success: true }
  }

  try {
    const supabase = await getSupabaseAdminClient()

    const { data: specialist } = await supabase
      .from('specialists')
      .select('user_profile_id, email')
      .eq('id', specialistId)
      .single()

    if (!specialist?.user_profile_id) {
      return { success: false, error: 'El especialista no tiene cuenta de usuario asociada' }
    }

    const { data: userProfile } = await supabase
      .from('users_profile')
      .select('user_id')
      .eq('id', specialist.user_profile_id)
      .single()

    if (!userProfile?.user_id) {
      return { success: false, error: 'No se encontró el usuario de autenticación' }
    }

    const updateData: { email?: string; password?: string; phone?: string } = {}
    if (newEmail && newEmail !== specialist.email) {
      updateData.email = newEmail
    }
    if (newPassword) {
      updateData.password = newPassword
    }
    if (newPhone) {
      updateData.phone = newPhone
    }

    if (Object.keys(updateData).length > 0) {
      const { error: authError } = await supabase.auth.admin.updateUserById(
        userProfile.user_id,
        updateData
      )

      if (authError) {
        console.error('Error updating auth user:', authError)
        return { success: false, error: authError.message }
      }

      if (newEmail) {
        await supabase
          .from('specialists')
          .update({ email: newEmail })
          .eq('id', specialistId)
      }
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error updating specialist credentials:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}

export async function deleteSpecialistAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await deleteRecord('specialists', id)
    return { success: true }
  } catch (error: any) {
    console.error('Error deleting specialist:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}

export async function deleteSpecialistsAction(
  ids: string[]
): Promise<{ success: boolean; deletedCount: number; error?: string }> {
  try {
    return await deleteRecords('specialists', ids)
  } catch (error: any) {
    console.error('Error batch deleting specialists:', error)
    return { success: false, deletedCount: 0, error: error.message }
  }
}

export async function fetchSpecialistAvailabilityAction(
  specialistId: string
): Promise<SpecialistAvailability[]> {
  try {
    const supabase = await getSupabaseAdminClient()
    const { data, error } = await supabase
      .from('specialist_availability')
      .select('*')
      .eq('specialist_id', specialistId)
      .order('day_of_week')

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching specialist availability:', error)
    return []
  }
}

export async function updateSpecialistAvailabilityAction(
  specialistId: string,
  availability: Omit<SpecialistAvailability, 'id' | 'specialist_id'>[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await getSupabaseAdminClient()

    await supabase
      .from('specialist_availability')
      .delete()
      .eq('specialist_id', specialistId)

    if (availability.length > 0) {
      const dataToInsert = availability.map((a) => ({
        ...a,
        specialist_id: specialistId,
      }))

      const { error } = await supabase
        .from('specialist_availability')
        .insert(dataToInsert)

      if (error) throw error
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error updating specialist availability:', error)
    return { success: false, error: error.message }
  }
}

export async function getTodayAppointmentsForSpecialistAction(
  specialistId: string
): Promise<any[]> {
  try {
    const supabase = await getSupabaseAdminClient()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        appointment_services(
          service:services(name)
        ),
        user_profile:users_profile(
          id,
          user_id
        )
      `)
      .eq('specialist_id', specialistId)
      .gte('start_time', today.toISOString())
      .lt('start_time', tomorrow.toISOString())
      .order('start_time')

    if (error) throw error

    return (data || []).map((apt: any) => ({
      ...apt,
      services: apt.appointment_services?.[0]?.service || null,
      customers: apt.user_profile ? { first_name: 'Cliente', last_name: '' } : null,
    }))
  } catch (error) {
    console.error('Error fetching today appointments:', error)
    return []
  }
}

export interface CurrentAppointmentData {
  specialist_id: string
  startTime: string
  endTime: string
  services: string[]
}

export async function fetchSpecialistServiceCategoriesAction(
  specialistId: string
): Promise<string[]> {
  try {
    const supabase = await getSupabaseAdminClient()
    const { data, error } = await supabase
      .from('specialist_service_categories')
      .select('service_category_id')
      .eq('specialist_id', specialistId)

    if (error) throw error
    return (data || []).map((item) => item.service_category_id)
  } catch (error) {
    console.error('Error fetching specialist categories:', error)
    return []
  }
}

export async function updateSpecialistServiceCategoriesAction(
  specialistId: string,
  categoryIds: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await getSupabaseAdminClient()

    await supabase
      .from('specialist_service_categories')
      .delete()
      .eq('specialist_id', specialistId)

    if (categoryIds.length > 0) {
      const dataToInsert = categoryIds.map((categoryId) => ({
        specialist_id: specialistId,
        service_category_id: categoryId,
      }))

      const { error } = await supabase
        .from('specialist_service_categories')
        .insert(dataToInsert)

      if (error) throw error
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error updating specialist categories:', error)
    return { success: false, error: error.message }
  }
}

export async function getCurrentAppointmentsForBusinessAction(
  businessId: string
): Promise<CurrentAppointmentData[]> {
  try {
    const supabase = await getSupabaseAdminClient()
    const now = new Date()
    const confirmedStatus: AppointmentStatus = 'CONFIRMED'

    const { data, error } = await supabase
      .from('appointments')
      .select(`
        specialist_id,
        start_time,
        end_time,
        appointment_services(
          service:services(name)
        )
      `)
      .eq('business_id', businessId)
      .lte('start_time', now.toISOString())
      .gte('end_time', now.toISOString())
      .eq('status', confirmedStatus)

    if (error) throw error

    return (data || []).map((apt: any) => {
      const serviceNames = (apt.appointment_services || [])
        .map((as: any) => as.service?.name)
        .filter(Boolean)

      return {
        specialist_id: apt.specialist_id,
        startTime: new Date(apt.start_time).toLocaleTimeString('es-CO', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        }),
        endTime: new Date(apt.end_time).toLocaleTimeString('es-CO', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        }),
        services: serviceNames,
      }
    })
  } catch (error) {
    console.error('Error fetching current appointments:', error)
    return []
  }
}

export async function syncSpecialistProfilePictureAction(
  specialistId: string,
  profilePictureUrl: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await getSupabaseAdminClient()

    const { data: specialist, error: fetchError } = await supabase
      .from('specialists')
      .select('user_profile_id')
      .eq('id', specialistId)
      .single()

    if (fetchError || !specialist) {
      return { success: false, error: 'Especialista no encontrado' }
    }

    const { error: updateSpecialistError } = await supabase
      .from('specialists')
      .update({ profile_picture_url: profilePictureUrl })
      .eq('id', specialistId)

    if (updateSpecialistError) {
      return { success: false, error: updateSpecialistError.message }
    }

    if (specialist.user_profile_id) {
      const { data: userProfile, error: profileFetchError } = await supabase
        .from('users_profile')
        .select('user_id')
        .eq('id', specialist.user_profile_id)
        .single()

      if (!profileFetchError && userProfile) {
        await supabase
          .from('users_profile')
          .update({ profile_picture_url: profilePictureUrl })
          .eq('id', specialist.user_profile_id)

        if (userProfile.user_id) {
          await supabase.auth.admin.updateUserById(userProfile.user_id, {
            user_metadata: { avatar_url: profilePictureUrl },
          })
        }
      }
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error syncing specialist profile picture:', error)
    return { success: false, error: error.message || 'Error desconocido' }
  }
}
