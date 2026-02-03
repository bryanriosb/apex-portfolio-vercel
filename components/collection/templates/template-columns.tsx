'use client'

import { ColumnDef } from '@tanstack/react-table'
import { CollectionTemplate } from '@/lib/models/collection'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Eye, Pencil, Copy, Trash2, Mail, MessageSquare, MessageCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { PreviewDialog } from './builder/PreviewDialog'
import { createTemplateAction, deleteTemplateAction } from '@/lib/actions/collection'
import { useDataRefreshStore } from '@/lib/store/data-refresh-store'
import { useActiveBusinessStore } from '@/lib/store/active-business-store'
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog'

const templateTypeIcons = {
    email: Mail,
    sms: MessageSquare,
    whatsapp: MessageCircle,
}

const templateTypeLabels = {
    email: 'Email',
    sms: 'SMS',
    whatsapp: 'WhatsApp',
}

export const templateColumns: ColumnDef<CollectionTemplate>[] = [
    {
        accessorKey: 'name',
        header: 'Nombre',
        cell: ({ row }) => {
            const template = row.original
            return (
                <div className="space-y-1">
                    <div className="font-medium">{template.name}</div>
                    {template.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1">
                            {template.description}
                        </p>
                    )}
                </div>
            )
        },
    },
    {
        accessorKey: 'template_type',
        header: 'Tipo',
        cell: ({ row }) => {
            const type = row.original.template_type
            const Icon = templateTypeIcons[type]
            const label = templateTypeLabels[type]

            return (
                <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{label}</span>
                </div>
            )
        },
    },
    {
        accessorKey: 'subject',
        header: 'Asunto',
        cell: ({ row }) => {
            const subject = row.original.subject
            return (
                <div className="text-sm text-muted-foreground max-w-xs truncate">
                    {subject || '-'}
                </div>
            )
        },
    },
    {
        accessorKey: 'is_active',
        header: 'Estado',
        cell: ({ row }) => {
            const isActive = row.original.is_active
            return (
                <Badge variant={isActive ? 'outline' : 'secondary'}>
                    {isActive ? 'Activa' : 'Inactiva'}
                </Badge>
            )
        },
    },
    {
        accessorKey: 'created_at',
        header: 'Creado',
        cell: ({ row }) => {
            const date = new Date(row.original.created_at)
            return (
                <div className="text-sm text-muted-foreground">
                    {formatDistanceToNow(date, { addSuffix: true, locale: es })}
                </div>
            )
        },
    },
    {
        id: 'actions',
        cell: ({ row, table }) => <ActionsCell template={row.original} table={table} />,
    },
]

function ActionsCell({ template, table }: { template: CollectionTemplate, table: any }) {
    const router = useRouter()
    const { activeBusiness } = useActiveBusinessStore()
    const { triggerRefresh } = useDataRefreshStore()
    const [previewOpen, setPreviewOpen] = useState(false)
    const [isDuplicating, setIsDuplicating] = useState(false)

    const refreshKey = activeBusiness?.business_account_id
        ? `collection-templates-${activeBusiness.business_account_id}`
        : null

    const handleDuplicate = async () => {
        try {
            setIsDuplicating(true)
            const { id: _, created_at: __, updated_at: ___, ...data } = template
            const result = await createTemplateAction({
                ...data,
                name: `${data.name} (Copia)`,
            })

            if (result.success) {
                toast.success('Plantilla duplicada correctamente')
                if (refreshKey) triggerRefresh(refreshKey)
            } else {
                toast.error(result.error || 'Error al duplicar la plantilla')
            }
        } catch (error) {
            toast.error('Error al duplicar la plantilla')
        } finally {
            setIsDuplicating(false)
        }
    }

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Abrir menú</span>
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setPreviewOpen(true)}>
                        <Eye className="mr-2 h-4 w-4" />
                        Vista Previa
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push(`/admin/collection/templates/edit/${template.id}`)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDuplicate} disabled={isDuplicating}>
                        <Copy className="mr-2 h-4 w-4" />
                        Duplicar
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => {
                            const meta = table.options.meta as any
                            if (meta?.openDeleteDialog) {
                                meta.openDeleteDialog([template.id])
                            }
                        }}
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Eliminar
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <PreviewDialog
                open={previewOpen}
                onOpenChange={setPreviewOpen}
                subject={template.subject || ''}
                content={template.content_html || ''}
            />
        </>
    )
}
