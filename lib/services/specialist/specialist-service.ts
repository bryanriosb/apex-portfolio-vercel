import {
  fetchSpecialistsAction,
  getSpecialistByIdAction,
  createSpecialistAction,
  createSpecialistWithAuthAction,
  updateSpecialistAction,
  updateSpecialistCredentialsAction,
  deleteSpecialistAction,
  deleteSpecialistsAction,
  fetchSpecialistAvailabilityAction,
  updateSpecialistAvailabilityAction,
  getTodayAppointmentsForSpecialistAction,
  getCurrentAppointmentsForBusinessAction,
  type CurrentAppointmentData,
  type CreateSpecialistWithAuthData,
} from '@/lib/actions/specialist'
import { uploadImageAction } from '@/lib/actions/storage'
import type {
  Specialist,
  SpecialistInsert,
  SpecialistUpdate,
  SpecialistAvailability,
  SpecialistWithAvailability,
} from '@/lib/models/specialist/specialist'

export interface SpecialistListResponse {
  data: Specialist[]
  total: number
  total_pages: number
}

export default class SpecialistService {
  async fetchItems(params?: {
    page?: number
    page_size?: number
    business_id?: string
    is_featured?: boolean
    search?: string
  }): Promise<SpecialistListResponse> {
    try {
      return await fetchSpecialistsAction(params)
    } catch (error) {
      console.error('Error fetching specialists:', error)
      throw error
    }
  }

  async getById(id: string): Promise<SpecialistWithAvailability | null> {
    try {
      return await getSpecialistByIdAction(id)
    } catch (error) {
      console.error('Error fetching specialist by ID:', error)
      throw error
    }
  }

  async fetchItem(id: string): Promise<{ success: boolean; data?: Specialist; error?: string }> {
    try {
      const result = await getSpecialistByIdAction(id)
      if (result) {
        return { success: true, data: result }
      }
      return { success: false, error: 'Specialist not found' }
    } catch (error: any) {
      console.error('Error fetching specialist:', error)
      return { success: false, error: error.message }
    }
  }

  async uploadAvatar(
    specialistId: string,
    file: File
  ): Promise<{ success: boolean; data?: string; error?: string }> {
    try {
      // Get the specialist to find their business_id
      const specialist = await getSpecialistByIdAction(specialistId)
      if (!specialist?.business_id) {
        return { success: false, error: 'Specialist or business not found' }
      }

      const formData = new FormData()
      formData.append('file', file)
      formData.append('businessId', specialist.business_id)
      formData.append('type', 'specialists')

      const result = await uploadImageAction(formData)
      if (result.success && result.url) {
        return { success: true, data: result.url }
      }
      return { success: false, error: result.error }
    } catch (error: any) {
      console.error('Error uploading avatar:', error)
      return { success: false, error: error.message }
    }
  }

  async createItem(
    data: SpecialistInsert
  ): Promise<{ success: boolean; data?: Specialist; error?: string }> {
    try {
      return await createSpecialistAction(data)
    } catch (error: any) {
      console.error('Error creating specialist:', error)
      throw error
    }
  }

  async createWithAuth(
    input: CreateSpecialistWithAuthData
  ): Promise<{ success: boolean; data?: Specialist; error?: string }> {
    try {
      return await createSpecialistWithAuthAction(input)
    } catch (error: any) {
      console.error('Error creating specialist with auth:', error)
      throw error
    }
  }

  async updateCredentials(
    input: { specialistId: string; newEmail?: string; newPassword?: string; newPhone?: string }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      return await updateSpecialistCredentialsAction(input)
    } catch (error: any) {
      console.error('Error updating specialist credentials:', error)
      throw error
    }
  }

  async updateItem(
    data: Specialist | Partial<Specialist>
  ): Promise<{ success: boolean; data?: Specialist; error?: string }> {
    try {
      if (!data.id) {
        throw new Error('Specialist ID is required for update')
      }
      return await updateSpecialistAction(data.id, data)
    } catch (error: any) {
      console.error('Error updating specialist:', error)
      throw error
    }
  }

  async destroyItem(id: string): Promise<void> {
    try {
      const result = await deleteSpecialistAction(id)
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete specialist')
      }
    } catch (error) {
      console.error('Error deleting specialist:', error)
      throw new Error(`Failed to destroy specialist: ${error}`)
    }
  }

  async destroyMany(
    ids: string[]
  ): Promise<{ success: boolean; deletedCount: number; error?: string }> {
    try {
      return await deleteSpecialistsAction(ids)
    } catch (error: any) {
      console.error('Error batch deleting specialists:', error)
      return { success: false, deletedCount: 0, error: error.message }
    }
  }

  async getAvailability(specialistId: string): Promise<SpecialistAvailability[]> {
    try {
      return await fetchSpecialistAvailabilityAction(specialistId)
    } catch (error) {
      console.error('Error fetching specialist availability:', error)
      throw error
    }
  }

  async updateAvailability(
    specialistId: string,
    availability: Omit<SpecialistAvailability, 'id' | 'specialist_id'>[]
  ): Promise<{ success: boolean; error?: string }> {
    try {
      return await updateSpecialistAvailabilityAction(specialistId, availability)
    } catch (error: any) {
      console.error('Error updating specialist availability:', error)
      return { success: false, error: error.message }
    }
  }

  async getTodayAppointments(specialistId: string): Promise<any[]> {
    try {
      return await getTodayAppointmentsForSpecialistAction(specialistId)
    } catch (error) {
      console.error('Error fetching today appointments:', error)
      return []
    }
  }

  async getCurrentAppointmentsForBusiness(businessId: string): Promise<CurrentAppointmentData[]> {
    try {
      return await getCurrentAppointmentsForBusinessAction(businessId)
    } catch (error) {
      console.error('Error fetching current appointments for business:', error)
      return []
    }
  }
}
