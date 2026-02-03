import {
  fetchAppointmentsAction,
  getAppointmentByIdAction,
  createAppointmentAction,
  updateAppointmentAction,
  deleteAppointmentAction,
  type AppointmentServiceInput,
  type AppointmentSupplyInput,
} from '@/lib/actions/appointment'
import type {
  Appointment,
  AppointmentInsert,
  AppointmentUpdate,
} from '@/lib/models/appointment/appointment'
import type { UserRole } from '@/const/roles'

export interface AppointmentListResponse {
  data: Appointment[]
  total: number
  total_pages: number
}

export default class AppointmentService {
  async fetchItems(params?: {
    page?: number
    page_size?: number
    business_id?: string
    specialist_id?: string
    users_profile_id?: string
    status?: string[]
    start_date?: string
    end_date?: string
    user_role?: UserRole
    business_account_id?: string
  }): Promise<AppointmentListResponse> {
    try {
      return await fetchAppointmentsAction(params)
    } catch (error) {
      console.error('Error fetching appointments:', error)
      throw error
    }
  }

  async getById(id: string, withDetails = true): Promise<Appointment | null> {
    try {
      return await getAppointmentByIdAction(id, withDetails)
    } catch (error) {
      console.error('Error fetching appointment by ID:', error)
      throw error
    }
  }

  async createItem(
    data: AppointmentInsert,
    services?: AppointmentServiceInput[],
    supplies?: AppointmentSupplyInput[]
  ): Promise<{ success: boolean; data?: Appointment; error?: string }> {
    try {
      return await createAppointmentAction(data, services, supplies)
    } catch (error: any) {
      console.error('Error creating appointment:', error)
      throw error
    }
  }

  async updateItem(
    data: Appointment | Partial<Appointment>,
    options?: {
      generateInvoice?: boolean
      businessData?: {
        name: string
        address?: string
        phone?: string
        nit?: string
      }
      services?: AppointmentServiceInput[]
      supplies?: AppointmentSupplyInput[]
    }
  ): Promise<{
    success: boolean
    data?: Appointment
    error?: string
    invoiceGenerated?: boolean
    stockDeducted?: boolean
  }> {
    try {
      if (!data.id) {
        throw new Error('Appointment ID is required for update')
      }
      return await updateAppointmentAction(data.id, data, options)
    } catch (error: any) {
      console.error('Error updating appointment:', error)
      throw error
    }
  }

  async destroyItem(id: string): Promise<void> {
    try {
      const result = await deleteAppointmentAction(id)
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete appointment')
      }
    } catch (error) {
      console.error('Error deleting appointment:', error)
      throw new Error(`Failed to destroy appointment: ${error}`)
    }
  }
}
