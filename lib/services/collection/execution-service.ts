import { fetchExecutionsAction, type ExecutionListResponse } from '@/lib/actions/collection'

export interface ExecutionServiceParams {
    page?: number
    page_size?: number
    business_id?: string
    status?: string | string[]
    search?: string
}

/**
 * Service for Collection Executions compatible with DataTable
 */
export const ExecutionService = {
    async fetchItems(params: ExecutionServiceParams): Promise<ExecutionListResponse> {
        return await fetchExecutionsAction(params)
    },
}
