import * as XLSX from 'xlsx'
import { format, parse, isValid } from 'date-fns'

export interface ParsedBankTransaction {
  transaction_date: string
  amount: number
  bank_name: string
  customer_nit: string | null
  customer_name_extract: string | null
  reference: string | null
  description: string | null
  agent_name: string | null
  receipt_status: string | null
  notes: string | null
  raw_data: Record<string, any>
  row_number: number
}

export interface BankSheetData {
  bankName: string
  sheetName: string
  rowCount: number
  columns: string[]
  transactions: ParsedBankTransaction[]
  errors: string[]
}

export interface WorkerMessage {
  type: 'progress' | 'complete' | 'error'
  progress?: number
  message?: string
  result?: {
    fileName: string
    sheets: BankSheetData[]
    totalTransactions: number
    totalErrors: string[]
  }
  error?: string
}

export interface DateFormatConfig {
  inputFormat: string
  outputFormat: string
}

const FORMAT_MAP: Record<string, string> = {
  'DD-MM-AAAA': 'dd-MM-yyyy',
  'MM-DD-AAAA': 'MM-dd-yyyy',
  'AAAA-MM-DD': 'yyyy-MM-dd',
  'DD/MM/AAAA': 'dd/MM/yyyy',
  'MM/DD/AAAA': 'MM/dd/yyyy',
}

const COLUMN_MAPPINGS: Record<string, string[]> = {
  fecha: ['FECHA', ' FECHA', 'Fecha', 'fecha_transaccion'],
  valor: ['VALOR', 'Valor', 'monto', 'amount'],
  nit: ['NIT', 'Nit', 'nit_cliente', 'documento'],
  nombre: ['NOMBRE CLIENTE', 'Nombre Cliente', 'razon_social', 'cliente'],
  referencia: ['REFERENCIA', 'Referencia', 'descripcion', 'concepto'],
  agente: ['AGENTE SIESA', 'EQUIPO FACT Y CARTERA', 'agente', 'gestor'],
  recibo: ['RECIBO', 'OK RECIBO', 'OK RECIBIO ', 'confirmado'],
  novedad: ['NOVEDAD', 'Novedad', 'nota', 'observacion'],
}

function normalizeColumnName(header: string): string {
  return String(header)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
}

function normalizeBankName(sheetName: string): string {
  return sheetName
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
}

function findColumnIndex(
  headers: string[],
  normalizedHeaders: string[],
  fieldKey: string
): number {
  const possibleNames = COLUMN_MAPPINGS[fieldKey] || []
  for (const name of possibleNames) {
    const normalized = normalizeColumnName(name)
    const index = normalizedHeaders.findIndex((h) => h === normalized)
    if (index !== -1) return index
  }
  return -1
}

function excelSerialToDate(serial: number): Date {
  return new Date(Math.round((serial - 25569) * 86400 * 1000))
}

function parseTransactionDate(
  rawValue: any,
  inputFormat: string
): { date: string | null; error?: string } {
  if (rawValue === null || rawValue === undefined || rawValue === '') {
    return { date: null, error: 'Fecha vacía' }
  }

  if (rawValue instanceof Date && isValid(rawValue)) {
    return { date: format(rawValue, 'yyyy-MM-dd') }
  }

  if (typeof rawValue === 'number') {
    const date = excelSerialToDate(rawValue)
    if (isValid(date)) {
      return { date: format(date, 'yyyy-MM-dd') }
    }
  }

  const strValue = String(rawValue).trim()
  if (!strValue) {
    return { date: null, error: 'Fecha vacía' }
  }

  if (/^\d{8}$/.test(strValue)) {
    const year = strValue.substring(0, 4)
    const month = strValue.substring(4, 6)
    const day = strValue.substring(6, 8)
    const isoDate = `${year}-${month}-${day}`
    const parsed = new Date(isoDate)
    if (isValid(parsed)) {
      return { date: isoDate }
    }
  }

  if (!isNaN(Number(strValue)) && strValue.length >= 5) {
    const date = excelSerialToDate(Number(strValue))
    if (isValid(date)) {
      return { date: format(date, 'yyyy-MM-dd') }
    }
  }

  const fnsFormat = FORMAT_MAP[inputFormat] || inputFormat

  try {
    const parsed = parse(strValue, fnsFormat, new Date())
    if (isValid(parsed)) {
      return { date: format(parsed, 'yyyy-MM-dd') }
    }
  } catch {
    // Fall through to error
  }

  return {
    date: null,
    error: `No se pudo parsear fecha '${rawValue}' con formato ${inputFormat}`,
  }
}

function normalizeNit(value: any): string | null {
  if (value === null || value === undefined || value === '') {
    return null
  }

  const strValue = String(value)
    .trim()
    .replace(/\.0$/, '')
    .replace(/[.,]/g, '')

  if (!strValue || strValue === '0' || strValue.toLowerCase() === 'nan') {
    return null
  }

  return strValue
}

function normalizeAmount(value: any): number | null {
  if (value === null || value === undefined || value === '') {
    return null
  }

  const num = Number(value)
  return isNaN(num) ? null : num
}

function getCellValue(row: any[], index: number): any {
  if (index === -1 || index >= row.length) return null
  return row[index]
}

export function parseExcelInWorker(
  fileData: ArrayBuffer,
  fileName: string,
  dateFormatConfig: DateFormatConfig,
  postMessage: (message: WorkerMessage) => void
): void {
  try {
    postMessage({ type: 'progress', progress: 10, message: 'Parseando archivo...' })

    const workbook = XLSX.read(fileData, {
      type: 'array',
      cellDates: true,
      cellNF: true,
      cellText: false,
    })

    postMessage({
      type: 'progress',
      progress: 20,
      message: `${workbook.SheetNames.length} hoja(s) detectada(s)`,
    })

    const sheets: BankSheetData[] = []
    const allErrors: string[] = []
    let totalTransactions = 0
    const totalSheets = workbook.SheetNames.length

    for (let sheetIndex = 0; sheetIndex < totalSheets; sheetIndex++) {
      const sheetName = workbook.SheetNames[sheetIndex]
      const worksheet = workbook.Sheets[sheetName]

      postMessage({
        type: 'progress',
        progress: 20 + Math.round((sheetIndex / totalSheets) * 10),
        message: `Leyendo hoja ${sheetIndex + 1}/${totalSheets}: ${sheetName}`,
      })

      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

      if (jsonData.length <= 1) {
        continue
      }

      const bankName = normalizeBankName(sheetName)

      const rawHeaders = jsonData[0] || []
      const normalizedHeaders = rawHeaders.map(normalizeColumnName)
      const rows = jsonData.slice(1).filter((row) =>
        row.some((cell) => cell !== null && cell !== undefined && cell !== '')
      )

      const fechaIdx = findColumnIndex(rawHeaders, normalizedHeaders, 'fecha')
      const valorIdx = findColumnIndex(rawHeaders, normalizedHeaders, 'valor')
      const nitIdx = findColumnIndex(rawHeaders, normalizedHeaders, 'nit')
      const nombreIdx = findColumnIndex(rawHeaders, normalizedHeaders, 'nombre')
      const referenciaIdx = findColumnIndex(rawHeaders, normalizedHeaders, 'referencia')
      const agenteIdx = findColumnIndex(rawHeaders, normalizedHeaders, 'agente')
      const reciboIdx = findColumnIndex(rawHeaders, normalizedHeaders, 'recibo')
      const novedadIdx = findColumnIndex(rawHeaders, normalizedHeaders, 'novedad')

      if (fechaIdx === -1 || valorIdx === -1) {
        allErrors.push(`Hoja '${sheetName}': Faltan columnas requeridas (FECHA, VALOR)`)
        continue
      }

      const transactions: ParsedBankTransaction[] = []
      const sheetErrors: string[] = []
      const rowsLength = rows.length

      const sheetProgressBase = 30 + (sheetIndex / totalSheets) * 60

      for (let i = 0; i < rowsLength; i++) {
        if (i % 25 === 0) {
          const rowProgress = (i / rowsLength) * 100
          const currentProgress = Math.min(
            90,
            Math.round(sheetProgressBase + (rowProgress / totalSheets) * 0.8)
          )
          postMessage({
            type: 'progress',
            progress: currentProgress,
            message: `${bankName}: fila ${i + 1} de ${rowsLength}`,
          })
        }

        const row = rows[i]
        const rowNumber = i + 2

        const rawFecha = getCellValue(row, fechaIdx)
        const rawValor = getCellValue(row, valorIdx)

        const dateResult = parseTransactionDate(rawFecha, dateFormatConfig.inputFormat)
        if (!dateResult.date) {
          sheetErrors.push(`Fila ${rowNumber}: ${dateResult.error}`)
          continue
        }

        const amount = normalizeAmount(rawValor)
        if (amount === null) {
          sheetErrors.push(`Fila ${rowNumber}: Valor inválido '${rawValor}'`)
          continue
        }

        const nit = normalizeNit(getCellValue(row, nitIdx))
        const rawNit = getCellValue(row, nitIdx)

        const transaction: ParsedBankTransaction = {
          transaction_date: dateResult.date,
          amount,
          bank_name: bankName,
          customer_nit: nit,
          customer_name_extract: getCellValue(row, nombreIdx)
            ? String(getCellValue(row, nombreIdx)).trim()
            : null,
          reference: getCellValue(row, referenciaIdx)
            ? String(getCellValue(row, referenciaIdx)).trim()
            : null,
          description: null,
          agent_name: getCellValue(row, agenteIdx)
            ? String(getCellValue(row, agenteIdx)).trim()
            : null,
          receipt_status: getCellValue(row, reciboIdx)
            ? String(getCellValue(row, reciboIdx)).trim()
            : null,
          notes: getCellValue(row, novedadIdx)
            ? String(getCellValue(row, novedadIdx)).trim()
            : null,
          raw_data: {
            fecha: rawFecha,
            valor: rawValor,
            nit: rawNit,
            nombre: getCellValue(row, nombreIdx),
            referencia: getCellValue(row, referenciaIdx),
            agente: getCellValue(row, agenteIdx),
            recibo: getCellValue(row, reciboIdx),
            novedad: getCellValue(row, novedadIdx),
          },
          row_number: rowNumber,
        }

        transactions.push(transaction)
      }

      sheets.push({
        bankName,
        sheetName,
        rowCount: rows.length,
        columns: rawHeaders.map(String),
        transactions,
        errors: sheetErrors,
      })

      totalTransactions += transactions.length
      allErrors.push(...sheetErrors)
    }

    postMessage({ type: 'progress', progress: 95, message: 'Finalizando análisis...' })

    postMessage({
      type: 'complete',
      result: {
        fileName,
        sheets,
        totalTransactions,
        totalErrors: allErrors,
      },
    })
  } catch (error: any) {
    postMessage({ type: 'error', error: error.message || 'Error desconocido' })
  }
}
