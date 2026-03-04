'use client'

import { uploadTemplateAction, deleteTemplateAction, listTemplatesAction, type TemplateType } from '@/lib/actions/template-storage'

export class ImportTemplateStorageService {
  async uploadPlansTemplate(
    file: File
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', 'plans')

    return await uploadTemplateAction(formData)
  }

  async deleteTemplate(templateUrl: string): Promise<{ success: boolean; error?: string }> {
    return deleteTemplateAction(templateUrl)
  }

  async listPlansTemplates(): Promise<{ success: boolean; data?: any[]; error?: string }> {
    return listTemplatesAction('plans')
  }

  async listTemplates(type: TemplateType): Promise<{ success: boolean; data?: any[]; error?: string }> {
    return listTemplatesAction(type)
  }
}

export default ImportTemplateStorageService