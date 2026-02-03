import {
  fetchMedicalRecordsAction,
  getMedicalRecordByIdAction,
  createMedicalRecordAction,
  updateMedicalRecordAction,
  deleteMedicalRecordAction,
  deleteMedicalRecordsAction,
  archiveMedicalRecordAction,
  getCustomerMedicalHistoryAction,
  getLatestMedicalRecordAction,
  signMedicalRecordAsSpecialistAction,
  type MedicalRecordListResponse,
} from '@/lib/actions/medical-record'
import type {
  MedicalRecord,
  MedicalRecordInsert,
  MedicalRecordUpdate,
  MedicalRecordWithDetails,
} from '@/lib/models/medical-record/medical-record'

export default class MedicalRecordService {
  async fetchItems(params?: {
    page?: number
    page_size?: number
    business_id?: string
    customer_id?: string
    specialist_id?: string
    record_type?: string
    status?: string
    search?: string
    date_from?: string
    date_to?: string
  }): Promise<MedicalRecordListResponse> {
    return fetchMedicalRecordsAction(params)
  }

  async getById(id: string): Promise<MedicalRecordWithDetails | null> {
    return getMedicalRecordByIdAction(id)
  }

  async createItem(
    data: MedicalRecordInsert
  ): Promise<{ success: boolean; data?: MedicalRecord; error?: string }> {
    return createMedicalRecordAction(data)
  }

  async updateItem(
    id: string,
    data: MedicalRecordUpdate
  ): Promise<{ success: boolean; data?: MedicalRecord; error?: string }> {
    return updateMedicalRecordAction(id, data)
  }

  async archiveItem(id: string): Promise<{ success: boolean; error?: string }> {
    return archiveMedicalRecordAction(id)
  }

  async destroyItem(id: string): Promise<{ success: boolean; error?: string }> {
    return deleteMedicalRecordAction(id)
  }

  async destroyMany(
    ids: string[]
  ): Promise<{ success: boolean; deletedCount: number; error?: string }> {
    return deleteMedicalRecordsAction(ids)
  }

  async getCustomerHistory(
    businessId: string,
    customerId: string
  ): Promise<MedicalRecord[]> {
    return getCustomerMedicalHistoryAction(businessId, customerId)
  }

  async getLatestRecord(
    businessId: string,
    customerId: string
  ): Promise<MedicalRecord | null> {
    return getLatestMedicalRecordAction(businessId, customerId)
  }

  async signAsSpecialist(
    medicalRecordId: string,
    signatureData: string
  ): Promise<{ success: boolean; error?: string }> {
    return signMedicalRecordAsSpecialistAction(medicalRecordId, signatureData)
  }
}
