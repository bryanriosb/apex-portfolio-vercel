'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ChevronLeft, Save, Eye, Send } from 'lucide-react'
import { useState } from 'react'

interface BuilderHeaderProps {
    templateName: string
    onNameChange: (name: string) => void
    onSave: () => void
    onPreview: () => void
    isSaving: boolean
}

export function BuilderHeader({
    templateName,
    onNameChange,
    onSave,
    onPreview,
    isSaving
}: BuilderHeaderProps) {
    return (
        <div className="border-b bg-background sticky top-0 z-10 px-6 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1">
                <Link href="/admin/collection/templates">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div className="h-6 w-px bg-border" />
                <Input
                    value={templateName}
                    onChange={(e) => onNameChange(e.target.value)}
                    placeholder="Nombre de la plantilla..."
                    className="max-w-md border-transparent hover:border-input focus:border-input bg-transparent text-lg font-semibold px-2 h-9"
                />
            </div>

            <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={onPreview}>
                    <Eye className="h-4 w-4 mr-2" />
                    Vista Previa
                </Button>
                <Button size="sm" onClick={onSave} disabled={isSaving}>
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? 'Guardando...' : 'Guardar Plantilla'}
                </Button>
            </div>
        </div>
    )
}
