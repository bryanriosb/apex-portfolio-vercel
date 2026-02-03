'use client'

import { ColumnDef } from '@tanstack/react-table'
import { CollectionAttachment } from '@/lib/models/collection'
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
import { MoreHorizontal, Download, Pencil, Trash2, File } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { AttachmentActions } from './AttachmentActions'

function formatFileSize(bytes: number | null | undefined): string {
    if (!bytes) return '-'
    const mb = bytes / (1024 * 1024)
    if (mb >= 1) return `${mb.toFixed(2)} MB`
    const kb = bytes / 1024
    return `${kb.toFixed(2)} KB`
}

export const attachmentColumns: ColumnDef<CollectionAttachment>[] = [
    {
        accessorKey: 'name',
        header: 'Nombre',
        cell: ({ row }) => {
            const attachment = row.original
            return (
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <File className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium" title={attachment.name}>
                            {attachment.name.length > 40 ? `${attachment.name.substring(0, 40)}...` : attachment.name}
                        </span>
                    </div>
                    {attachment.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1 ml-6">
                            {attachment.description}
                        </p>
                    )}
                </div>
            )
        },
    },
    {
        accessorKey: 'file_type',
        header: 'Tipo',
        cell: ({ row }) => {
            const fileType = row.original.file_type
            if (!fileType) return '-'

            const typeLabel = fileType.split('/')[1]?.toUpperCase() || fileType
            return (
                <Badge variant="secondary" className="uppercase text-xs">
                    {typeLabel}
                </Badge>
            )
        },
    },
    {
        accessorKey: 'file_size_bytes',
        header: 'Tamaño',
        cell: ({ row }) => {
            return (
                <div className="text-sm text-muted-foreground">
                    {formatFileSize(row.original.file_size_bytes)}
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
                    {isActive ? 'Activo' : 'Inactivo'}
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
        cell: ({ row, table }) => {
            const attachment = row.original
            const meta = table.options.meta as any
            const refreshData = meta?.refreshData || (() => { })

            return (
                <AttachmentActions
                    attachment={attachment}
                    onRefresh={refreshData}
                    table={table}
                />
            )
        },
    },
]
