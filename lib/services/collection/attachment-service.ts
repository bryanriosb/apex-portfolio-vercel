import { fetchAttachmentsAction, type AttachmentListResponse } from '@/lib/actions/collection'

export interface AttachmentServiceParams {
    business_account_id: string
    page?: number
    page_size?: number
    is_active?: boolean
    search?: string
}

/**
 * Service for Collection Attachments compatible with DataTable
 */
export const AttachmentService = {
    async fetchItems(params: AttachmentServiceParams): Promise<AttachmentListResponse> {
        return await fetchAttachmentsAction(params)
    },
}
