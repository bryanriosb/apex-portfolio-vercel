'use client'

import { useMemo } from 'react'
import { DataTable } from '@/components/DataTable'
import { attachmentColumns } from './attachment-columns'
import { AttachmentService } from '@/lib/services/collection'
import { useActiveBusinessStore } from '@/lib/store/active-business-store'
import type { FilterConfig } from '@/components/DataTable'
import { deleteAttachmentAction } from '@/lib/actions/collection/attachment'
import { toast } from 'sonner'

const statusFilters: FilterConfig = {
    column: 'is_active',
    title: 'Estado',
    options: [
        { label: 'Activo', value: 'true' },
        { label: 'Inactivo', value: 'false' },
    ],
}

export function AttachmentsList() {
    const { activeBusiness } = useActiveBusinessStore()

    const serviceParams = useMemo(() => {
        if (!activeBusiness?.business_account_id) return null
        return { business_account_id: activeBusiness.business_account_id }
    }, [activeBusiness?.business_account_id])

    if (!activeBusiness?.business_account_id || !serviceParams) {
        return (
            <div className="rounded-lg border border-dashed p-12 text-center">
                <p className="text-muted-foreground">
                    Selecciona una sucursal para ver los adjuntos
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <DataTable
                key={activeBusiness.business_account_id}
                columns={attachmentColumns}
                service={AttachmentService}
                defaultQueryParams={serviceParams}
                filters={[statusFilters]}
                searchConfig={{
                    column: 'name',
                    placeholder: 'Buscar por nombre...',
                    serverField: 'search',
                }}
                exportConfig={{
                    enabled: true,
                    tableName: 'adjuntos-cobros',
                    businessId: activeBusiness.business_account_id,
                }}
                enableRowSelection={true}
                deleteConfig={{
                    enabled: true,
                    itemName: 'adjunto',
                    onDelete: async (ids) => {
                        for (const id of ids) {
                            const result = await deleteAttachmentAction(id)
                            if (!result.success) {
                                throw new Error(result.error || `Error al eliminar el adjunto ${id}`)
                            }
                        }
                    }
                }}
                refreshKey={`collection-attachments-${activeBusiness.business_account_id}`}
            />
        </div>
    )
}
