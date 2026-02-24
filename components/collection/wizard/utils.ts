// utils.ts - Utilidades para el wizard de campañas
import * as XLSX from 'xlsx'
import { parse, format, isValid } from 'date-fns'
import { FileData, REQUIRED_COLUMNS, Invoice, GroupedClient } from './types'

function tryParseDate(dateStr: string, inputFormat: string): Date | null {
  if (!dateStr) return null

  // Ensure it's a string and trim
  const str = String(dateStr).trim()
  if (!str) return null

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
          workbook = XLSX.read(data, { type: 'binary' })
        } else {
          workbook = XLSX.read(data, { type: 'array' })
        }

        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

        if (jsonData.length === 0) {
          reject(new Error('El archivo está vacío'))
          return
        }

        const headers = (jsonData[0] as any[]).map((h) =>
          String(h).toLowerCase().trim()
        )
        const rows = jsonData.slice(1).filter((row: any) => row.length > 0)

        // Validate required columns
        const missingColumns = REQUIRED_COLUMNS.filter(
          (col) => !headers.includes(col)
        )
        const valid = missingColumns.length === 0

        if (!valid) {
          resolve({
            fileName: file.name,
            rowCount: rows.length,
            columns: headers,
            valid: false,
            missingColumns,
            groupedClients: new Map(),
          })
          return
        }

        // Group by NIT
        const grouped = new Map<string, GroupedClient>()

        rows.forEach((row: any) => {
          const rowData: any = {}
          headers.forEach((header, index) => {
            rowData[header] = row[index]
          })

          const nit = String(rowData['nit'] || '').trim()
          if (!nit) return

          const amountDue = Number(rowData['amount_due'] || 0)
          const daysOverdue = Number(rowData['days_overdue'] || 0)

          const rawInvoiceDate = rowData['invoice_date']
          const rawDueDate = rowData['due_date']

          const parsedInvoiceDate = tryParseDate(rawInvoiceDate, inputFormat)
          const parsedDueDate = tryParseDate(rawDueDate, inputFormat)

          const formattedInvoiceDate = parsedInvoiceDate ? formatDateOutput(parsedInvoiceDate, outputFormat, inputFormat) : String(rawInvoiceDate || '')
          const formattedDueDate = parsedDueDate ? formatDateOutput(parsedDueDate, outputFormat, inputFormat) : String(rawDueDate || '')

          const invoice: Invoice = {
            amount_due: rowData['amount_due'],
            invoice_number: rowData['invoice_number'],
            invoice_date: formattedInvoiceDate,
            due_date: formattedDueDate,
            days_overdue: rowData['days_overdue'],
            ...rowData,
            // Ensure we override the raw rowData with our formatted dates
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
          columns: headers,
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
