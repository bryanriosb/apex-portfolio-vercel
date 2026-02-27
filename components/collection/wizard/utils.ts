// utils.ts - Utilidades para el wizard de campañas
import * as XLSX from 'xlsx'
import { parse, format, isValid } from 'date-fns'
import { FileData, REQUIRED_COLUMNS, COLUMN_MAPPING, COLUMN_LABELS, Invoice, GroupedClient } from './types'

/**
 * Normaliza un nombre de columna para facilitar el mapeo
 * - Elimina espacios al inicio y final (trim)
 * - Convierte a minúsculas
 * - Elimina tildes y caracteres especiales
 * - Normaliza espacios múltiples
 */
function normalizeColumnName(header: string): string {
  return String(header)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Elimina tildes
    .replace(/\s+/g, ' ') // Normaliza espacios múltiples a uno solo
}

/**
 * Convierte un número de serie de fecha de Excel a un objeto Date de JS
 */
export function excelSerialToDate(serial: number): Date {
  // El punto de referencia de Excel es 1899-12-30
  // 25569 es la diferencia en días entre 1899-12-30 y 1970-01-01 (Unix Epoch)
  const date = new Date(Math.round((serial - 25569) * 86400 * 1000))
  return date
}

export function tryParseDate(dateVal: any, inputFormat: string): Date | null {
  if (dateVal === null || dateVal === undefined) return null

  // Si ya es un objeto Date (gracias a cellDates: true en XLSX)
  if (dateVal instanceof Date && isValid(dateVal)) return dateVal

  // Si es un número (Excel Serial Date)
  if (typeof dateVal === 'number') {
    const date = excelSerialToDate(dateVal)
    if (isValid(date)) return date
  }

  // Ensure it's a string and trim
  const str = String(dateVal).trim()
  if (!str) return null

  // Si parece un número en string
  if (!isNaN(Number(str)) && str.length >= 5) {
    const date = excelSerialToDate(Number(str))
    if (isValid(date)) return date
  }

  // Map our simple formats to date-fns format strings
  const formatMap: Record<string, string> = {
    'DD-MM-AAAA': 'dd-MM-yyyy',
    'MM-DD-AAAA': 'MM-dd-yyyy',
    'AAAA-MM-DD': 'yyyy-MM-dd',
    'DD/MM/AAAA': 'dd/MM/yyyy',
    'MM/DD/AAAA': 'MM/dd/yyyy',
  }

  // If it's a predefined format, use the mapped version, otherwise assume it's a custom date-fns format
  const fnsFormat = formatMap[inputFormat] || inputFormat

  if (fnsFormat) {
    const parsed = parse(str, fnsFormat, new Date())
    if (isValid(parsed)) return parsed
  }

  return null
}

function formatDateOutput(date: Date | null, outputFormat: string, inputFormat?: string): string {
  if (!date) return ''

  if (outputFormat === 'same_as_input' && inputFormat) {
    const inputFormatMap: Record<string, string> = {
      'DD-MM-AAAA': 'dd-MM-yyyy',
      'MM-DD-AAAA': 'MM-dd-yyyy',
      'AAAA-MM-DD': 'yyyy-MM-dd',
      'DD/MM/AAAA': 'dd/MM/yyyy',
      'MM/DD/AAAA': 'MM/dd/yyyy',
    }
    const fnsFormat = inputFormatMap[inputFormat] || inputFormat
    return format(date, fnsFormat)
  }

  const formatMap: Record<string, string> = {
    'DD-MM-AAAA': 'dd-MM-yyyy',
    'AAAA-MM-DD': 'yyyy-MM-dd',
  }

  const fnsFormat = formatMap[outputFormat] || outputFormat || 'dd-MM-yyyy'
  return format(date, fnsFormat)
}

export async function parseInvoiceFile(
  file: File,
  inputFormat: string,
  outputFormat: string = 'DD-MM-AAAA'
): Promise<FileData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = async (e) => {
      try {
        const data = e.target?.result
        let workbook: XLSX.WorkBook

        if (file.name.endsWith('.csv')) {
          workbook = XLSX.read(data, {
            type: 'binary',
            cellDates: true,
            cellNF: true,
            cellText: false
          })
        } else {
          workbook = XLSX.read(data, {
            type: 'array',
            cellDates: true,
            cellNF: true,
            cellText: false
          })
        }

        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

        if (jsonData.length === 0) {
          reject(new Error('El archivo está vacío'))
          return
        }

        // Procesar headers normalizándolos para soportar diferentes formatos
        const rawHeaders = (jsonData[0] as any[])
        const normalizedHeaders = rawHeaders.map((h) => normalizeColumnName(h))
        const rows = jsonData.slice(1).filter((row: any) => row.length > 0)

        // Crear mapeo de columnas encontradas a nombres internos
        const columnMapping = new Map<string, string>()
        normalizedHeaders.forEach((header) => {
          if (COLUMN_MAPPING[header]) {
            columnMapping.set(header, COLUMN_MAPPING[header])
          }
        })

        // Validate required columns usando headers normalizados
        // Verificamos si cada columna requerida existe en los headers normalizados
        // o si tiene un mapeo válido en COLUMN_MAPPING
        const missingColumns = REQUIRED_COLUMNS.filter((col) => {
          // Normalizar el nombre de la columna requerida para la búsqueda
          const normalizedCol = normalizeColumnName(col)

          // Verificar si existe directamente en los headers normalizados
          if (normalizedHeaders.includes(normalizedCol)) {
            return false
          }

          // Verificar si hay un mapeo válido: buscar si algún header normalizado
          // mapea a la misma columna interna que esta columna requerida
          const requiredInternalName = COLUMN_MAPPING[normalizedCol]
          if (requiredInternalName) {
            const hasMapping = normalizedHeaders.some(
              header => COLUMN_MAPPING[header] === requiredInternalName
            )
            if (hasMapping) return false
          }

          return true
        }).map(col => COLUMN_LABELS[col] || col)

        const valid = missingColumns.length === 0

        if (!valid) {
          resolve({
            fileName: file.name,
            rowCount: rows.length,
            columns: normalizedHeaders,
            valid: false,
            missingColumns,
            groupedClients: new Map(),
          })
          return
        }

        // Función helper para obtener valor de columna con mapeo
        // Busca en rawHeaders usando el nombre normalizado
        const getColumnValue = (row: any[], spanishCol: string): any => {
          // Encontrar el índice de la columna buscando en headers normalizados
          const colIndex = normalizedHeaders.findIndex(h => h === spanishCol)
          if (colIndex !== -1 && row[colIndex] !== undefined) {
            return row[colIndex]
          }
          // Si no encuentra por nombre exacto, buscar por mapeo
          const englishCol = COLUMN_MAPPING[spanishCol]
          if (englishCol && englishCol !== spanishCol) {
            const mappedIndex = normalizedHeaders.findIndex(h => COLUMN_MAPPING[h] === englishCol)
            if (mappedIndex !== -1 && row[mappedIndex] !== undefined) {
              return row[mappedIndex]
            }
          }
          return undefined
        }

        // Group by NIT
        const grouped = new Map<string, GroupedClient>()

        rows.forEach((row: any) => {

          const nit = String(getColumnValue(row, 'nit') || '').trim()
          if (!nit) return

          const amountDue = Number(getColumnValue(row, 'monto') || 0)
          const daysOverdue = Number(getColumnValue(row, 'dias_mora') || 0)

          const rawInvoiceDate = getColumnValue(row, 'fecha_factura')
          const rawDueDate = getColumnValue(row, 'fecha_vencimiento')

          const parsedInvoiceDate = tryParseDate(rawInvoiceDate, inputFormat)
          const parsedDueDate = tryParseDate(rawDueDate, inputFormat)

          const formattedInvoiceDate = parsedInvoiceDate ? formatDateOutput(parsedInvoiceDate, outputFormat, inputFormat) : String(rawInvoiceDate || '')
          const formattedDueDate = parsedDueDate ? formatDateOutput(parsedDueDate, outputFormat, inputFormat) : String(rawDueDate || '')

          const invoice: Invoice = {
            amount_due: getColumnValue(row, 'monto'),
            invoice_number: getColumnValue(row, 'numero_factura'),
            invoice_date: formattedInvoiceDate,
            due_date: formattedDueDate,
            days_overdue: getColumnValue(row, 'dias_mora'),
            // Ensure we include the raw values
            invoice_date_raw: rawInvoiceDate,
            due_date_raw: rawDueDate,
          }

          if (grouped.has(nit)) {
            const client = grouped.get(nit)!
            client.invoices.push(invoice)
            client.total.total_amount_due += amountDue
            client.total.total_days_overdue = Math.max(
              client.total.total_days_overdue,
              daysOverdue
            )
            client.total.total_invoices += 1
          } else {
            grouped.set(nit, {
              nit,
              invoices: [invoice],
              status: 'pending',
              total: {
                total_amount_due: amountDue,
                total_days_overdue: daysOverdue,
                total_invoices: 1,
              },
            })
          }
        })

        resolve({
          fileName: file.name,
          rowCount: rows.length,
          columns: normalizedHeaders,
          valid: true,
          missingColumns: [],
          groupedClients: grouped,
        })
      } catch (error: any) {
        reject(error)
      }
    }

    reader.onerror = () => reject(new Error('Error al leer el archivo'))

    if (file.name.endsWith('.csv')) {
      reader.readAsBinaryString(file)
    } else {
      reader.readAsArrayBuffer(file)
    }
  })
}
