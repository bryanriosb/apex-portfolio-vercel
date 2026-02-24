'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import { FileIcon, Loader2, Paperclip, Trash2, Upload } from 'lucide-react'
import { useActiveBusinessStore } from '@/lib/store/active-business-store'
import {
    createAttachmentAction,
    uploadAttachmentFileAction,
    getActiveAttachmentsAction,
    deleteAttachmentAction
} from '@/lib/actions/collection/attachment'
import { CollectionAttachment } from '@/lib/models/collection'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { AttachmentsList } from '@/components/collection/attachments/AttachmentsList'
import Loading from '@/components/ui/loading'

interface AttachmentManagerProps {
    mode: 'select' | 'manage'
    selectedIds?: string[]
    onSelectionChange?: (ids: string[]) => void
    maxFiles?: number
}

export function AttachmentManager({
    mode,
    selectedIds = [],
    onSelectionChange,
    maxFiles
}: AttachmentManagerProps) {
    const { activeBusiness } = useActiveBusinessStore()
    const [attachments, setAttachments] = useState<CollectionAttachment[]>([])
    const [loading, setLoading] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [search, setSearch] = useState('')
    const [refreshKey, setRefreshKey] = useState(0) // Used to reload table/list
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Only fetch manually if not in manage mode (manage mode uses DataTable via AttachmentsList)
    const fetchAttachments = async () => {
        if (!activeBusiness?.business_account_id || mode === 'manage') return

        setLoading(true)
        try {
            const data = await getActiveAttachmentsAction(activeBusiness.business_account_id)
            setAttachments(data)
        } catch (error) {
            console.error('Error loading attachments:', error)
            toast.error('Error al cargar adjuntos')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchAttachments()
    }, [activeBusiness?.business_account_id, refreshKey, mode])

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !activeBusiness?.business_account_id) return

        // Validate file type
        const allowedTypes = [
            'image/',
            'text/csv',
            'text/plain',
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ]

        const isValidType = allowedTypes.some(type => {
            if (type.endsWith('/')) return file.type.startsWith(type)
            return file.type === type
        })

        if (!isValidType) {
            toast.error('Tipo de archivo no permitido. Solo imágenes, CSV, TXT, XLSX y PDF.')
            if (fileInputRef.current) fileInputRef.current.value = ''
            return
        }

        setUploading(true)
        try {
            const newAttachmentData = {
                business_account_id: activeBusiness.business_account_id,
                name: file.name,
                description: '',
                file_size_bytes: file.size,
                file_type: file.type,
                storage_path: '',
                storage_bucket: 'collection-attachments',
                is_active: true
            }

            const createRes = await createAttachmentAction(newAttachmentData as any)
            if (!createRes.success || !createRes.data) {
                throw new Error(createRes.error || 'Error creating record')
            }

            const attachmentId = createRes.data.id

            const formData = new FormData()
            formData.append('file', file)
            formData.append('businessAccountId', activeBusiness.business_account_id)
            formData.append('attachmentId', attachmentId)

            const uploadRes = await uploadAttachmentFileAction(formData)

            if (!uploadRes.success || !uploadRes.path) {
                await deleteAttachmentAction(attachmentId)
                throw new Error(uploadRes.error || 'Error uploading file')
            }

            const { updateAttachmentAction } = await import('@/lib/actions/collection/attachment')
            await updateAttachmentAction(attachmentId, {
                storage_path: uploadRes.path
            })

            toast.success('Archivo subido correctamente')
            setRefreshKey(prev => prev + 1) // Trigger refresh

            if (mode === 'select' && onSelectionChange) {
                onSelectionChange([...selectedIds, attachmentId])
            }

        } catch (error: any) {
            console.error('Upload error:', error)
            toast.error(error.message || 'Error al subir archivo')
        } finally {
            setUploading(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation()
        if (!confirm('¿Estás seguro de eliminar este adjunto?')) return

        try {
            const res = await deleteAttachmentAction(id)
            if (res.success) {
                toast.success('Adjunto eliminado')
                setRefreshKey(prev => prev + 1) // Trigger refresh
                if (mode === 'select' && selectedIds.includes(id) && onSelectionChange) {
                    onSelectionChange(selectedIds.filter(sid => sid !== id))
                }
            } else {
                toast.error(res.error || 'Error al eliminar')
            }
        } catch (error) {
            toast.error('Error al eliminar')
        }
    }

    const toggleSelection = (id: string) => {
        if (!onSelectionChange) return
        if (selectedIds.includes(id)) {
            onSelectionChange(selectedIds.filter(sid => sid !== id))
        } else {
            onSelectionChange([...selectedIds, id])
        }
    }

    const filteredAttachments = attachments.filter(a =>
        a.name.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="space-y-3">
            {/* Header / Actions - Compact layout */}
            <div className="flex items-center justify-between gap-3">
                {mode === 'select' && (
                    <div className="relative flex-1 max-w-sm">
                        <Input
                            placeholder="Buscar adjuntos..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="h-9" // Compact height
                        />
                    </div>
                )}

                {/* Upload button */}
                <div className={cn("relative flex-shrink-0", mode === 'manage' && "ml-auto")}>
                    <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        onChange={handleFileUpload}
                        accept="image/*,.csv,.txt,.xlsx,.pdf"
                        disabled={uploading}
                    />
                    <Button
                        size={mode === 'select' ? 'sm' : 'default'}
                        variant={mode === 'select' ? 'secondary' : 'default'}
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                    >
                        {uploading ? (
                            <Loading className="mr-2 h-4 w-4" />
                        ) : (
                            <Upload className="mr-2 h-4 w-4" />
                        )}
                        {uploading ? 'Subiendo...' : 'Subir'}
                    </Button>
                </div>
            </div>

            {/* Content Switch */}
            {mode === 'manage' ? (
                // Table View
                <div key={refreshKey}>
                    <AttachmentsList />
                </div>
            ) : (
                // Compact Grid View (Select Mode)
                <div className="border  overflow-hidden bg-background">
                    <ScrollArea className="max-h-[180px]"> {/* Approx 3 rows height */}
                        {loading ? (
                            <div className="flex items-center justify-center p-8">
                                <Loading className="h-6 w-6 text-muted-foreground" />
                            </div>
                        ) : filteredAttachments.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-8 text-muted-foreground text-sm">
                                <Paperclip className="h-8 w-8 mb-3 opacity-20" />
                                <p>No hay adjuntos disponibles</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 text-sm">
                                {filteredAttachments.map((attachment, index) => {
                                    const isSelected = selectedIds.includes(attachment.id)
                                    // Add border bottom to all except last two on desktop, or last one on mobile
                                    const isLastRow = index >= filteredAttachments.length - (filteredAttachments.length % 2 === 0 ? 2 : 1)

                                    return (
                                        <div
                                            key={attachment.id}
                                            className={cn(
                                                "flex items-center gap-3 p-3 transition-colors cursor-pointer group hover:bg-muted/50",
                                                isSelected && "bg-primary/5 hover:bg-primary/10",
                                                "border-b md:border-r border-border md:odd:border-r md:even:border-r-0",
                                                isLastRow && "md:border-b-0"
                                            )}
                                            onClick={() => toggleSelection(attachment.id)}
                                        >
                                            <div className="flex-shrink-0">
                                                <Checkbox
                                                    checked={isSelected}
                                                    onCheckedChange={() => toggleSelection(attachment.id)}
                                                    className={cn("transition-all", isSelected && "border-primary bg-primary text-primary-foreground")}
                                                />
                                            </div>
                                            <div className="flex items-center justify-center w-8 h-8 bg-muted/50 text-muted-foreground group-hover:text-foreground transition-colors">
                                                <FileIcon className="h-4 w-4" />
                                            </div>
                                            <div className="flex-1 min-w-0 flex items-center justify-between">
                                                <div className="flex flex-col overflow-hidden mr-4">
                                                    <span className={cn("text-sm font-medium truncate", isSelected && "text-primary")}>
                                                        {attachment.name}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground truncate">
                                                        {format(new Date(attachment.created_at), 'dd MMM yyyy', { locale: es })}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-muted-foreground whitespace-nowrap">
                                                    {((attachment.file_size_bytes || 0) / 1024).toFixed(1)} KB
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </ScrollArea>
                </div>
            )}

            {mode === 'select' && selectedIds.length > 0 && (
                <div className="text-xs text-muted-foreground text-right font-medium">
                    {selectedIds.length} archivo{selectedIds.length !== 1 ? 's' : ''} seleccionado{selectedIds.length !== 1 ? 's' : ''}
                </div>
            )}
        </div>
    )
}
