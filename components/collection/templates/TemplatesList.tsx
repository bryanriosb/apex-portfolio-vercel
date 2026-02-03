'use client'

import { useMemo } from 'react'
import { DataTable } from '@/components/DataTable'
import { templateColumns } from './template-columns'
import { TemplateService } from '@/lib/services/collection'
import { useActiveBusinessStore } from '@/lib/store/active-business-store'
import type { FilterConfig } from '@/components/DataTable'
import { deleteTemplateAction } from '@/lib/actions/collection'

const typeFilters: FilterConfig = {
    column: 'template_type',
    title: 'Tipo',
    options: [
        { label: 'Email', value: 'email' },
        { label: 'SMS', value: 'sms' },
        { label: 'WhatsApp', value: 'whatsapp' },
    ],
}

const statusFilters: FilterConfig = {
    column: 'is_active',
    title: 'Estado',
    options: [
        { label: 'Activa', value: 'true' },
        { label: 'Inactiva', value: 'false' },
    ],
}

export function TemplatesList() {
    const { activeBusiness } = useActiveBusinessStore()

    const serviceParams = useMemo(() => {
        if (!activeBusiness?.business_account_id) return null
        return { business_account_id: activeBusiness.business_account_id }
    }, [activeBusiness?.business_account_id])

    if (!activeBusiness?.business_account_id || !serviceParams) {
        return (
            <div className="rounded-lg border border-dashed p-12 text-center">
                <p className="text-muted-foreground">
                    Selecciona una sucursal para ver las plantillas
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <DataTable
                key={activeBusiness.business_account_id}
                columns={templateColumns}
                service={TemplateService}
                defaultQueryParams={serviceParams}
                filters={[typeFilters, statusFilters]}
                searchConfig={{
                    column: 'name',
                    placeholder: 'Buscar por nombre...',
                    serverField: 'search',
                }}
                exportConfig={{
                    enabled: true,
                    tableName: 'plantillas-cobros',
                    businessId: activeBusiness.business_account_id,
                }}
                enableRowSelection={true}
                deleteConfig={{
                    enabled: true,
                    itemName: 'plantilla',
                    onDelete: async (ids) => {
                        for (const id of ids) {
                            const result = await deleteTemplateAction(id)
                            if (!result.success) {
                                throw new Error(result.error || `Error al eliminar la plantilla ${id}`)
                            }
                        }
                    }
                }}
                refreshKey={`collection-templates-${activeBusiness.business_account_id}`}
            />
        </div>
    )
}
