'use client'

import { useState, useEffect } from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

interface HtmlEditDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    initialContent: string
    onSave: (content: string) => void
}

export function HtmlEditDialog({
    open,
    onOpenChange,
    initialContent,
    onSave
}: HtmlEditDialogProps) {
    const [content, setContent] = useState(initialContent)

    useEffect(() => {
        if (open) {
            setContent(initialContent)
        }
    }, [open, initialContent])

    const handleSave = () => {
        onSave(content)
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[800px] h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Editar HTML</DialogTitle>
                    <DialogDescription>
                        Edita el código HTML directamente. Ten cuidado, un HTML mal formado puede romper el diseño.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex-1 py-4">
                    <Textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className="w-full h-full font-mono text-xs"
                        placeholder="<div>...</div>"
                    />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSave}>Guardar Cambios</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
