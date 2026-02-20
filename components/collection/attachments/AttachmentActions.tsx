'use client'

import { useState } from 'react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Download, MoreHorizontal, Pencil, Trash2, Settings } from 'lucide-react'
import { CollectionAttachment } from '@/lib/models/collection'
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog'
import { AttachmentEditDialog } from './AttachmentEditDialog'
import { AttachmentRulesDialog } from './AttachmentRulesDialog'
import { deleteAttachmentAction } from '@/lib/actions/collection/attachment'
import { toast } from 'sonner'
import { getSupabaseClient } from '@/lib/actions/supabase' // Client-side download

interface AttachmentActionsProps {
    attachment: CollectionAttachment
    onRefresh: () => void
    table?: any
}

export function AttachmentActions({ attachment, onRefresh, table }: AttachmentActionsProps) {
    const [showEditDialog, setShowEditDialog] = useState(false)
    const [showRulesDialog, setShowRulesDialog] = useState(false)

    const handleDownload = async () => {
        try {
            const supabase = getSupabaseClient()
            if (!attachment.storage_path) {
                toast.error('Ruta de archivo no encontrada')
                return
            }

            const { data, error } = await (await supabase).storage
                .from(attachment.storage_bucket || 'collection-attachments')
                .download(attachment.storage_path)

            if (error) throw error

            const url = URL.createObjectURL(data)
            const a = document.createElement('a')
            a.href = url
            a.download = attachment.name
            document.body.appendChild(a)
            a.click()
            URL.revokeObjectURL(url)
            document.body.removeChild(a)
        } catch (error) {
            console.error('Download error:', error)
            toast.error('Error al descargar el archivo')
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
                    <DropdownMenuItem onClick={handleDownload}>
                        <Download className="mr-2 h-4 w-4" />
                        Descargar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowRulesDialog(true)}>
                        <Settings className="mr-2 h-4 w-4" />
                        Configurar Reglas
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        className="text-red-600 focus:text-red-600 focus:bg-red-50"
                        onClick={() => {
                            const meta = table?.options?.meta as any
                            if (meta?.openDeleteDialog) {
                                meta.openDeleteDialog([attachment.id])
                            }
                        }}
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Eliminar
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <AttachmentEditDialog
                open={showEditDialog}
                onOpenChange={setShowEditDialog}
                attachment={attachment}
                onSuccess={onRefresh}
            />

            <AttachmentRulesDialog
                open={showRulesDialog}
                onOpenChange={setShowRulesDialog}
                attachment={attachment}
                onSuccess={onRefresh}
            />
        </>
    )
}
