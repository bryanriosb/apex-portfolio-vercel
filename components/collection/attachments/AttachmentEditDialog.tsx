'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { updateAttachmentAction } from '@/lib/actions/collection/attachment'
import { CollectionAttachment } from '@/lib/models/collection'
import { Loader2 } from 'lucide-react'

interface AttachmentEditDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    attachment: CollectionAttachment
    onSuccess: () => void
}

export function AttachmentEditDialog({
    open,
    onOpenChange,
    attachment,
    onSuccess
}: AttachmentEditDialogProps) {
    const [name, setName] = useState(attachment.name)
    const [description, setDescription] = useState(attachment.description || '')
    const [isSaving, setIsSaving] = useState(false)

    const handleSave = async () => {
        if (!name.trim()) {
            toast.error('El nombre es requerido')
            return
        }

        try {
            setIsSaving(true)
            const result = await updateAttachmentAction(attachment.id, {
                name,
                description
            })

            if (result.success) {
                toast.success('Adjunto actualizado correctamente')
                onSuccess()
                onOpenChange(false)
            } else {
                toast.error(result.error || 'Error al actualizar el adjunto')
            }
        } catch (error) {
            console.error('Error updating attachment:', error)
            toast.error('Error al actualizar el adjunto')
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Editar Adjunto</DialogTitle>
                    <DialogDescription>
                        Modifica los detalles del archivo adjunto.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">
                            Nombre
                        </Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="col-span-3"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="description" className="text-right">
                            Descripción
                        </Label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="col-span-3"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Guardar Cambios
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
