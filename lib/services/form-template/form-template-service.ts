import {
  fetchFormTemplatesAction,
  getFormTemplateByIdAction,
  getDefaultFormTemplateAction,
  createFormTemplateAction,
  updateFormTemplateAction,
  deleteFormTemplateAction,
  type FormTemplateListResponse,
} from '@/lib/actions/form-template'
import type {
  FormTemplate,
  FormTemplateInsert,
  FormTemplateUpdate,
} from '@/lib/models/form-template/form-template'

export default class FormTemplateService {
  async fetchItems(params: {
    business_id: string
    is_active?: boolean
  }): Promise<FormTemplateListResponse> {
    return fetchFormTemplatesAction(params)
  }

  async getById(id: string): Promise<FormTemplate | null> {
    return getFormTemplateByIdAction(id)
  }

  async getDefault(businessId: string): Promise<FormTemplate | null> {
    return getDefaultFormTemplateAction(businessId)
  }

  async createItem(
    data: FormTemplateInsert
  ): Promise<{ success: boolean; data?: FormTemplate; error?: string }> {
    return createFormTemplateAction(data)
  }

  async updateItem(
    id: string,
    data: FormTemplateUpdate
  ): Promise<{ success: boolean; data?: FormTemplate; error?: string }> {
    return updateFormTemplateAction(id, data)
  }

  async deleteItem(id: string): Promise<{ success: boolean; error?: string }> {
    return deleteFormTemplateAction(id)
  }
}
