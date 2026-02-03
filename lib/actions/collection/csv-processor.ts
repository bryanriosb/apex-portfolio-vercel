'use server'

import * as XLSX from 'xlsx'
import type { CollectionClientInsert } from '@/lib/models/collection'

export interface CSVRow {
    email: string
    full_name: string
    company_name?: string
    phone?: string
    nit?: string
    amount_due: number
    invoice_number?: string
    due_date?: string
    days_overdue?: number
    [key: string]: any // For custom fields
}

export interface CSVValidationResult {
    valid: boolean
    errors: string[]
    warnings: string[]
    rowCount: number
    preview: CSVRow[]
    duplicateEmails: string[]
}

export interface CSVProcessResult {
    success: boolean
    data?: CSVRow[]
    error?: string
    rowCount: number
}

// Required columns
const REQUIRED_COLUMNS = ['email', 'full_name', 'amount_due']

// Optional but recommended columns
const RECOMMENDED_COLUMNS = [
    'company_name',
    'phone',
    'nit',
    'invoice_number',
    'due_date',
    'days_overdue',
]

/**
 * Parse CSV/Excel file
 */
export async function parseCSVFile(
    file: File
): Promise<CSVProcessResult> {
    try {
        const buffer = await file.arrayBuffer()
        const workbook = XLSX.read(buffer, { type: 'array' })

        // Get first sheet
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]

        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
            raw: false, // Convert to strings
            defval: '', // Default value for empty cells
        })

        if (!jsonData || jsonData.length === 0) {
            return {
                success: false,
                error: 'El archivo está vacío',
                rowCount: 0,
            }
        }

        // Normalize column names (lowercase, trim, replace spaces with underscore)
        const normalizedData = jsonData.map((row: any) => {
            const normalizedRow: any = {}
            Object.keys(row).forEach((key) => {
                const normalizedKey = key
                    .toLowerCase()
                    .trim()
                    .replace(/\s+/g, '_')
                    .replace(/[áàäâ]/g, 'a')
                    .replace(/[éèëê]/g, 'e')
                    .replace(/[íìïî]/g, 'i')
                    .replace(/[óòöô]/g, 'o')
                    .replace(/[úùüû]/g, 'u')
                normalizedRow[normalizedKey] = row[key]
            })
            return normalizedRow
        })

        return {
            success: true,
            data: normalizedData as CSVRow[],
            rowCount: normalizedData.length,
        }
    } catch (error: any) {
        console.error('Error parsing CSV:', error)
        return {
            success: false,
            error: error.message || 'Error al procesar el archivo',
            rowCount: 0,
        }
    }
}

/**
 * Validate CSV structure and data
 */
export async function validateCSVStructure(
    data: CSVRow[]
): Promise<CSVValidationResult> {
    const errors: string[] = []
    const warnings: string[] = []
    const duplicateEmails: string[] = []

    if (!data || data.length === 0) {
        errors.push('El archivo no contiene datos')
        return {
            valid: false,
            errors,
            warnings,
            rowCount: 0,
            preview: [],
            duplicateEmails: [],
        }
    }

    // Check required columns
    const firstRow = data[0]
    const columns = Object.keys(firstRow)

    REQUIRED_COLUMNS.forEach((col) => {
        if (!columns.includes(col)) {
            errors.push(`Columna requerida faltante: ${col}`)
        }
    })

    // Check for recommended columns
    RECOMMENDED_COLUMNS.forEach((col) => {
        if (!columns.includes(col)) {
            warnings.push(`Columna recomendada faltante: ${col}`)
        }
    })

    // Validate data quality
    const emails = new Set<string>()
    const emailCounts: Record<string, number> = {}

    data.forEach((row, index) => {
        const rowNum = index + 2 // Excel row number (header is 1)

        // Validate email
        if (!row.email || row.email.trim() === '') {
            errors.push(`Fila ${rowNum}: Email vacío`)
        } else {
            const email = row.email.trim().toLowerCase()
            if (!isValidEmail(email)) {
                errors.push(`Fila ${rowNum}: Email inválido - ${row.email}`)
            }

            // Check duplicates
            emailCounts[email] = (emailCounts[email] || 0) + 1
            if (emailCounts[email] > 1 && !duplicateEmails.includes(email)) {
                duplicateEmails.push(email)
                warnings.push(`Email duplicado encontrado: ${email}`)
            }

            emails.add(email)
        }

        // Validate full_name
        if (!row.full_name || row.full_name.trim() === '') {
            errors.push(`Fila ${rowNum}: Nombre completo vacío`)
        }

        // Validate amount_due
        if (!row.amount_due || isNaN(Number(row.amount_due))) {
            errors.push(`Fila ${rowNum}: Monto pendiente inválido`)
        } else if (Number(row.amount_due) <= 0) {
            warnings.push(`Fila ${rowNum}: Monto pendiente es cero o negativo`)
        }

        // Validate due_date format if present
        if (row.due_date && row.due_date.trim() !== '') {
            const date = new Date(row.due_date)
            if (isNaN(date.getTime())) {
                warnings.push(`Fila ${rowNum}: Fecha de vencimiento inválida`)
            }
        }
    })

    // Get preview (first 10 rows)
    const preview = data.slice(0, 10)

    return {
        valid: errors.length === 0,
        errors,
        warnings,
        rowCount: data.length,
        preview,
        duplicateEmails,
    }
}

/**
 * Map CSV rows to CollectionClient inserts
 */
export async function mapCSVToClients(
    executionId: string,
    csvData: CSVRow[]
): Promise<CollectionClientInsert[]> {
    return csvData.map((row) => {
        // Extract custom fields (anything not in standard columns)
        const customData: Record<string, any> = {}
        const standardColumns = [
            'email',
            'full_name',
            'company_name',
            'phone',
            'nit',
            'amount_due',
            'invoice_number',
            'due_date',
            'days_overdue',
        ]

        Object.keys(row).forEach((key) => {
            if (!standardColumns.includes(key) && row[key]) {
                customData[key] = row[key]
            }
        })

        return {
            execution_id: executionId,
            email: row.email.trim().toLowerCase(),
            full_name: row.full_name.trim(),
            company_name: row.company_name?.trim() || null,
            phone: row.phone?.trim() || null,
            nit: row.nit?.trim() || null,
            amount_due: Number(row.amount_due),
            invoice_number: row.invoice_number?.trim() || null,
            due_date: row.due_date ? formatDate(row.due_date) : null,
            days_overdue: row.days_overdue ? Number(row.days_overdue) : null,
            custom_data: Object.keys(customData).length > 0 ? customData : {},
            status: 'pending',
        }
    })
}

/**
 * Detect duplicate emails
 */
export async function detectDuplicates(csvData: CSVRow[]): Promise<string[]> {
    const emailCounts: Record<string, number> = {}
    const duplicates: string[] = []

    csvData.forEach((row) => {
        const email = row.email.trim().toLowerCase()
        emailCounts[email] = (emailCounts[email] || 0) + 1
    })

    Object.entries(emailCounts).forEach(([email, count]) => {
        if (count > 1) {
            duplicates.push(email)
        }
    })

    return duplicates
}

/**
 * Remove duplicate emails (keep first occurrence)
 */
export async function removeDuplicates(csvData: CSVRow[]): Promise<CSVRow[]> {
    const seen = new Set<string>()
    const unique: CSVRow[] = []

    csvData.forEach((row) => {
        const email = row.email.trim().toLowerCase()
        if (!seen.has(email)) {
            seen.add(email)
            unique.push(row)
        }
    })

    return unique
}

// Helper functions
function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
}

function formatDate(dateString: string): string | null {
    try {
        const date = new Date(dateString)
        if (isNaN(date.getTime())) return null
        return date.toISOString().split('T')[0] // YYYY-MM-DD
    } catch {
        return null
    }
}
