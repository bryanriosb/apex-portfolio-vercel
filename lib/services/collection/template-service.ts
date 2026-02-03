import { fetchTemplatesAction, createTemplateAction, type TemplateListResponse } from '@/lib/actions/collection'
import type { CollectionTemplate, CollectionTemplateInsert } from '@/lib/models/collection'

export interface TemplateServiceParams {
    business_account_id: string
    page?: number
    page_size?: number
    template_type?: 'email' | 'sms' | 'whatsapp' | string[]
    is_active?: boolean
    search?: string
}

/**
 * Service for Collection Templates compatible with DataTable
 */
export const TemplateService = {
    async fetchItems(params: TemplateServiceParams): Promise<TemplateListResponse> {
        return await fetchTemplatesAction(params)
    },

    async saveTemplate(data: CollectionTemplateInsert): Promise<CollectionTemplate> {
        const result = await createTemplateAction(data)
        if (!result.success || !result.data) {
            throw new Error(result.error || 'Error al guardar la plantilla')
        }
        return result.data
    },

    async getTemplate(id: string): Promise<CollectionTemplate> {
        const { getTemplateByIdAction } = await import('@/lib/actions/collection')
        const template = await getTemplateByIdAction(id)
        if (!template) {
            throw new Error('Plantilla no encontrada')
        }
        return template
    },

    async updateTemplate(id: string, data: any): Promise<CollectionTemplate> {
        const { updateTemplateAction } = await import('@/lib/actions/collection')
        const result = await updateTemplateAction(id, data)
        if (!result.success || !result.data) {
            throw new Error(result.error || 'Error al actualizar la plantilla')
        }
        return result.data
    }
}
