'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'

interface PreviewDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    subject: string
    content: string
}

// Datos de ejemplo para la vista previa
const SAMPLE_DATA = {
    email: 'cliente@ejemplo.com',
    full_name: 'Juan Pérez García',
    nit: '900123456',
    company_name: 'Empresa Ejemplo S.A.S',
    phone: '+57 300 123 4567',
    total_days_overdue: '56',
    total_amount_due: '$4,350,000',
    invoices: [
        {
            invoice_number: 'INV-001',
            amount_due: '$1,500,000',
            due_date: '2024-02-15',
            days_overdue: '15'
        },
        {
            invoice_number: 'INV-002',
            amount_due: '$500,000',
            due_date: '2024-02-20',
            days_overdue: '10'
        },
        {
            invoice_number: 'INV-003',
            amount_due: '$2,350,000',
            due_date: '2024-01-30',
            days_overdue: '31'
        }
    ]
}

export function PreviewDialog({ open, onOpenChange, subject, content }: PreviewDialogProps) {
    // Reemplazar variables con datos de ejemplo (Soporte avanzado para bucles y tablas)
    const replaceVariables = (text: string) => {
        if (!text) return ''

        // 1. Parse HTML to DOM for robust manipulation
        const parser = new DOMParser()
        const doc = parser.parseFromString(text, 'text/html')

        // Helper to find text nodes containing a pattern
        const findNodes = (root: Node, pattern: RegExp) => {
            const nodes: { node: Node, match: RegExpMatchArray }[] = []
            const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)

            let currentNode: Node | null
            while (currentNode = walker.nextNode()) {
                const match = currentNode.textContent?.match(pattern)
                if (match) {
                    nodes.push({ node: currentNode, match })
                }
            }
            return nodes
        }

        // 2. Handle Loops: {{#each key}} ... {{/each}}
        // We process loops first as they change the structure
        const startPattern = /{{#each\s+(\w+)}}/
        const endPattern = /{{\/each}}/

        // Loop until no more #each markers are found to handle nested or sequential loops (though simple for now)
        let loopFound = true
        let iterations = 0
        const MAX_ITERATIONS = 10 // Safety break

        while (loopFound && iterations < MAX_ITERATIONS) {
            loopFound = false
            iterations++

            const startNodes = findNodes(doc.body, startPattern)
            if (startNodes.length === 0) break

            // Process first loop found (to avoid invalidating other node references)
            const { node: startNode, match } = startNodes[0]
            const key = match[1]
            loopFound = true

            // Find matching end node
            // Note: This simple logic assumes non-nested loops for the same key. 
            // For nested, we'd need a stack. Assuming flat loops for this MVP.
            const allEndNodes = findNodes(doc.body, endPattern)

            // Find the first end node that appears after the start node in document order
            let endNode: Node | null = null
            for (const en of allEndNodes) {
                if (startNode.compareDocumentPosition(en.node) & Node.DOCUMENT_POSITION_FOLLOWING) {
                    endNode = en.node
                    break
                }
            }

            if (!endNode) {
                console.warn('Found {{#each}} without {{/each}}')
                break
            }

            // Identify Context (Table Row vs Block)
            const startRow = startNode.parentElement?.closest('tr')
            const endRow = endNode.parentElement?.closest('tr')

            if (startRow && endRow && startRow.parentElement === endRow.parentElement) {
                // --- TABLE ROW REPETITION STRATEGY ---
                const tbody = startRow.parentElement!
                const dataArray = (SAMPLE_DATA as any)[key] as any[] | undefined

                // Collect template rows (rows between start and end, exclusive)
                // If start and end are on the same row, it's an inline loop (not supported well in tables here)
                // If start and end are different rows, we take everything between them + potentially the rows themselves if they only contain markers

                // Strategy: The marker rows often contain partial styling or are just for logic.
                // We assume the START row *might* contain content, or the content follows.
                // Tiptap usually puts {{#each}} in its own <p> in a <td>.

                // Let's identify the range of rows to replicate.
                // Case A: markers are in their own rows (or cells that effectively make them own rows)
                // Case B: Markers are mixed with content.

                // Simplification for this specific Tiptap template builder:
                // We assume user puts {{#each}} in one row, Template Rows, then {{/each}} in another row.
                // OR {{#each}} is at start of a row, content follows, {{/each}} at end.

                // Let's assume the rows between startRow and endRow are the "body".
                // If startRow == endRow, we replicate that single row.

                let templateRows: HTMLTableRowElement[] = []

                if (startRow === endRow) {
                    // Single row loop
                    templateRows = [startRow]
                } else {
                    // Multiple rows. 
                    // We need to decide if startRow is purely a marker or has content.
                    // For now, let's assume aggressive "marker stripping":
                    // If the text content of startRow is JUST the marker, we treat it as metadata and don't render it.
                    // But usually, it's safer to just iterate everything from startRow to endRow.

                    let curr: Element | null = startRow
                    while (curr && curr !== endRow.nextElementSibling) {
                        if (curr instanceof HTMLTableRowElement) {
                            templateRows.push(curr)
                        }
                        curr = curr.nextElementSibling
                    }
                }

                // Remove the markers from the text content of the template rows (in memory clone) to clean them up
                // BUT, better tactic: identifying the "Template" structure.

                // REVISED STRATEGY for "Blank Rows" issue:
                // The issue is likely that {{#each}} is in a row, and {{/each}} is in another, and there are empty p tags.
                // Let's proceed to generate N copies of these rows.

                const fragment = document.createDocumentFragment()

                if (Array.isArray(dataArray) && dataArray.length > 0) {
                    dataArray.forEach(item => {
                        templateRows.forEach(origRow => {
                            const clone = origRow.cloneNode(true) as HTMLTableRowElement

                            // 1. Remove the marker text from this clone
                            // We use a tree walker on the clone to strip the markers
                            const cloneWalker = document.createTreeWalker(clone, NodeFilter.SHOW_TEXT)
                            let n: Node | null
                            while (n = cloneWalker.nextNode()) {
                                if (n.textContent) {
                                    n.textContent = n.textContent.replace(startPattern, '').replace(endPattern, '')
                                }
                            }

                            // 2. Replace item variables
                            clone.innerHTML = clone.innerHTML.replace(/{{(\w+)}}/g, (m, varKey) => {
                                return (item as any)[varKey] !== undefined ? String((item as any)[varKey]) : m
                            })

                            // Only append if it's not effectively empty? 
                            // No, let's trust the user's row structure but mostly rely on the fact we stripped markers.
                            // If a row becomes empty because it only had a marker, we might want to hide it.
                            if (clone.textContent?.trim() === '') {
                                // Skip empty rows (fixes the "Blank Row" issue if the marker was the only thing there)
                                return
                            }

                            fragment.appendChild(clone)
                        })
                    })
                } else {
                    // Empty state
                    const tr = document.createElement('tr')
                    tr.style.backgroundColor = '#f9fafb'
                    tr.innerHTML = '<td colspan="100%" style="padding: 12px; text-align: center; color: #6b7280;">No hay datos de ejemplo disponibles.</td>'
                    fragment.appendChild(tr)
                }

                // Insert result
                tbody.insertBefore(fragment, startRow)

                // Remove original template rows
                templateRows.forEach(row => row.remove())

            } else {
                // --- BLOCK REPETITION STRATEGY (Non-Table) ---
                // Identify common ancestor range
                const range = document.createRange()
                range.setStartBefore(startNode)
                range.setEndAfter(endNode)

                const templateFragment = range.extractContents()
                // ... (Implementation for blocks would go here, skipping for now as Table is priority)
                // For now, just strip markers to prevent ugly display if not supported
                startNode.textContent = startNode.textContent?.replace(startPattern, '') || null
                endNode.textContent = endNode.textContent?.replace(endPattern, '') || null
            }
        }

        // 3. Handle Simple Variables (Global)
        // We do this on the serialized HTML to catch everything easily
        let processedHtml = doc.body.innerHTML
        Object.entries(SAMPLE_DATA).forEach(([key, value]) => {
            if (typeof value === 'string' || typeof value === 'number') {
                const regex = new RegExp(`{{${key}}}`, 'g')
                processedHtml = processedHtml.replace(regex, String(value))
            }
        })

        return processedHtml
    }

    const previewSubject = replaceVariables(subject)
    const previewContent = replaceVariables(content)

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[95vw] md:max-w-5xl lg:max-w-6xl h-[90vh] p-0 flex flex-col">
                <DialogHeader className="px-6 pt-6 pb-4 border-b">
                    <div className="flex items-start justify-between">
                        <div className="space-y-1.5">
                            <DialogTitle>Vista Previa del Correo</DialogTitle>
                            <p className="text-sm text-muted-foreground">
                                Esta es una simulación de cómo se verá el correo con datos de ejemplo
                            </p>
                        </div>
                        <Badge variant="secondary" className="ml-4">
                            Ejemplo
                        </Badge>
                    </div>
                </DialogHeader>

                <ScrollArea className="flex-1 px-6 pb-6 overflow-y-auto">
                    {/* Email metadata */}
                    <div className="space-y-3 mb-6 p-4 bg-muted/50">
                        <div className="grid grid-cols-[100px_1fr] gap-2 text-sm">
                            <span className="font-medium text-muted-foreground">Para:</span>
                            <span className="dark:text-white">{SAMPLE_DATA.email}</span>
                        </div>
                        <div className="grid grid-cols-[100px_1fr] gap-2 text-sm">
                            <span className="font-medium text-muted-foreground">Asunto:</span>
                            <span className="font-medium dark:text-white">{previewSubject || '(Sin asunto)'}</span>
                        </div>
                    </div>

                    {/* Email content */}
                    <div className="border bg-white dark:bg-gray-950 shadow-sm overflow-hidden">
                        <div
                            className="preview-content prose prose-sm sm:prose-base max-w-none p-8 dark:prose-invert min-h-[400px]"
                            dangerouslySetInnerHTML={{ __html: previewContent || '<p class="text-muted-foreground">(Contenido vacío)</p>' }}
                        />
                    </div>

                    {/* Sample data reference */}
                    <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900">
                        <h4 className="text-sm font-semibold mb-2 text-blue-900 dark:text-blue-100">
                            Datos de ejemplo utilizados:
                        </h4>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
                            {Object.entries(SAMPLE_DATA).map(([key, value]) => {
                                if (Array.isArray(value)) return null // Don't show array in simple list
                                return (
                                    <div key={key} className="flex gap-2">
                                        <code className="font-mono bg-blue-100 dark:bg-blue-900/50 px-1.5 py-0.5 rounded text-blue-800 dark:text-blue-200">
                                            {`{{${key}}}`}
                                        </code>
                                        <span className="text-muted-foreground">→</span>
                                        <span className="dark:text-white truncate max-w-[150px]" title={String(value)}>{value}</span>
                                    </div>
                                )
                            })}
                        </div>
                        <div className="mt-2 pt-2 border-t border-blue-200 dark:border-blue-900">
                            <p className="text-xs text-muted-foreground mb-1">
                                Variables disponibles en bucle <code>{'{{#each invoices}} ... {{/each}}'}</code>:
                            </p>
                            <div className="flex flex-wrap gap-2 text-xs">
                                {['invoice_number', 'amount_due', 'due_date', 'days_overdue'].map(v => (
                                    <code key={v} className="font-mono bg-blue-100 dark:bg-blue-900/50 px-1.5 py-0.5 rounded text-blue-800 dark:text-blue-200">
                                        {`{{${v}}}`}
                                    </code>
                                ))}
                            </div>
                        </div>
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    )
}
