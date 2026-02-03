'use client'

import { useMemo } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MoveHorizontal, Copy, Table as TableIcon, List } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { TemplateType } from '@/lib/models/collection/template'


// Generic variables that insert simple keys
const GENERIC_VARIABLES = [
    { key: 'email', label: 'Email' },
    { key: 'full_name', label: 'Nombre Completo' },
    { key: 'nit', label: 'NIT' },
    { key: 'company_name', label: 'Empresa' },
    { key: 'phone', label: 'Teléfono' },
    { key: 'total_amount_due', label: 'Deuda Total' },
    { key: 'total_days_overdue', label: 'Total Días Mora' },
    { key: 'total_invoices', label: 'Total de Facturas' },
]

// Special snippet variables that insert HTML structures
const SNIPPET_VARIABLES = [
    {
        key: 'invoices_table',
        label: 'Tabla de Facturas',
        icon: TableIcon,
        snippet: `<table style="width: 100%; border-collapse: collapse; margin-top: 10px;"><thead><tr style="background-color: #f3f4f6;"><th style="padding: 8px; border: 1px solid #e5e7eb; text-align: left;">No. Factura</th><th style="padding: 8px; border: 1px solid #e5e7eb; text-align: right;">Monto</th><th style="padding: 8px; border: 1px solid #e5e7eb; text-align: center;">Vencimiento</th><th style="padding: 8px; border: 1px solid #e5e7eb; text-align: center;">Días</th></tr></thead><tbody><tr style="display:none"><td colspan="4">{{#each invoices}}</td></tr><tr><td style="padding: 8px; border: 1px solid #e5e7eb;">{{invoice_number}}</td><td style="padding: 8px; border: 1px solid #e5e7eb; text-align: right;">{{amount_due}}</td><td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center;">{{due_date}}</td><td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center;">{{days_overdue}}</td></tr><tr style="display:none"><td colspan="4">{{/each}}</td></tr></tbody></table><p> </p>`
    },
    {
        key: 'invoices_list',
        label: 'Lista de Facturas',
        icon: List,
        snippet: `<ul style="margin-top: 10px; margin-bottom: 10px; padding-left: 20px;">{{#each invoices}}<li><strong>Factura {{invoice_number}}</strong>: {{amount_due}} - Vence: {{due_date}} ({{days_overdue}} días)</li>{{/each}}</ul><p> </p>`
    }
]

// Combined for usage detection
const ALL_VARIABLES_FOR_USAGE = [
    ...GENERIC_VARIABLES,
    // We map snippets to 'invoices' key for basic detection if needed, 
    // but detection logic relies on exact keymatch in content.
    { key: 'invoices', label: 'Facturas' }
]

interface VariablesSidebarProps {
    onInsertVariable: (variable: string, isRaw?: boolean) => void
    content?: string
    description: string
    onDescriptionChange: (value: string) => void
    templateType: TemplateType
    onTemplateTypeChange: (value: TemplateType) => void
}

export function VariablesSidebar({
    onInsertVariable,
    content = '',
    description,
    onDescriptionChange,
    templateType,
    onTemplateTypeChange
}: VariablesSidebarProps) {
    // Detect used variables
    const usedVariables = useMemo(() => {
        const regex = /\{\{(\w+)\}\}/g
        const matches = content.matchAll(regex)
        const usedKeys = new Set<string>()

        for (const match of matches) {
            usedKeys.add(match[1])
        }

        return ALL_VARIABLES_FOR_USAGE.filter(v => usedKeys.has(v.key))
    }, [content])

    return (
        <div className="w-[400px] border-l bg-white dark:bg-gray-950 dark:border-gray-800 flex flex-col h-full sticky top-0">
            <ScrollArea className="flex-1">
                <div className="p-5 space-y-6">
                    {/* Template Configuration */}
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Tipo de Plantilla</Label>
                            <Select
                                value={templateType}
                                onValueChange={(val) => onTemplateTypeChange(val as TemplateType)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="email">Email</SelectItem>
                                    <SelectItem value="sms" disabled>SMS (Próximamente)</SelectItem>
                                    <SelectItem value="whatsapp" disabled>WhatsApp (Próximamente)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Descripción (Opcional)</Label>
                            <Textarea
                                value={description}
                                onChange={(e) => onDescriptionChange(e.target.value)}
                                placeholder="Descripción interna..."
                                className="resize-none h-[80px]"
                            />
                        </div>
                    </div>

                    <Separator />

                    {/* Used Variables Section */}
                    {usedVariables.length > 0 && (
                        <section>
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Usadas</h3>
                            <div className="space-y-3">
                                {usedVariables.map((variable) => (
                                    <div
                                        key={variable.key}
                                        className="flex justify-between items-center px-1 h-8 text-[13px] text-gray-700 dark:text-gray-300"
                                    >
                                        <span>{variable.label}</span>
                                        <span className="font-mono text-[11px] bg-gray-100 dark:bg-gray-800 px-2 py-1">
                                            {variable.key}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Available Variables Section */}
                    <section>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Variables disponibles</h3>

                        <div className="flex justify-between items-center mb-2 px-1">
                            <div className="text-[11px] font-normal text-gray-400 dark:text-gray-500 uppercase tracking-wide">Tipo</div>
                            <div className="text-[11px] font-normal text-gray-400 dark:text-gray-500 uppercase tracking-wide">Etiqueta</div>
                        </div>

                        <div className="space-y-3">
                            {/* Generic Variables */}
                            {GENERIC_VARIABLES.map((variable) => (
                                <div
                                    key={variable.key}
                                    className="flex justify-between items-center cursor-pointer group px-1 h-8 hover:opacity-80 transition-opacity"
                                    onClick={() => onInsertVariable(variable.key, false)}
                                    title={`Insertar {{${variable.key}}}`}
                                >
                                    <div className="text-[13px] text-gray-700 dark:text-gray-300 font-medium truncate min-w-0 flex-1 text-left">
                                        {variable.label}
                                    </div>
                                    <div className="px-2 flex-shrink-0">
                                        <MoveHorizontal className="h-3 w-3 text-gray-300 dark:text-gray-600" />
                                    </div>
                                    <div className="flex justify-end min-w-0 flex-1">
                                        <span className="font-mono text-[11px] text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-2 py-1 truncate block text-right">
                                            {variable.key}
                                        </span>
                                    </div>
                                </div>
                            ))}

                            <Separator className="my-2" />

                            {/* Snippet Variables (Table/List) */}
                            {SNIPPET_VARIABLES.map((snippet) => (
                                <div
                                    key={snippet.key}
                                    className="flex justify-between items-center cursor-pointer group px-1 h-8 hover:opacity-80 transition-opacity"
                                    onClick={() => onInsertVariable(snippet.snippet, true)}
                                    title={`Insertar estructura: ${snippet.label}`}
                                >
                                    <div className="text-[13px] text-gray-700 dark:text-gray-300 font-medium truncate min-w-0 flex-1 text-left flex items-center gap-2">
                                        <snippet.icon className="h-3.5 w-3.5 text-blue-500" />
                                        {snippet.label}
                                    </div>
                                    <div className="px-2 flex-shrink-0">
                                        <MoveHorizontal className="h-3 w-3 text-gray-300 dark:text-gray-600" />
                                    </div>
                                    <div className="flex justify-end min-w-0 flex-1">
                                        <span className="font-mono text-[11px] text-gray-400 dark:text-gray-500 italic block text-right">
                                            Inserción HTML
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </ScrollArea>
        </div>
    )
}
