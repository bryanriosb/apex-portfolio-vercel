import * as XLSX from 'xlsx'
import { format, parse, isValid } from 'date-fns'
import type { BankTransactionInsert } from '@/lib/models/bank-transactions'
import { parseExcelWithWorker, isWorkerSupported } from './excel-worker-client'

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

export interface BankExtractParseResult {
  fileName: string
  sheets: BankSheetData[]
  totalTransactions: number
  totalErrors: string[]
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

export function normalizeColumnName(header: string): string {
  return String(header)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
}

export function normalizeBankName(sheetName: string): string {
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
    const index = normalizedHeaders.findIndex(h => h === normalized)
    if (index !== -1) return index
  }
  
  return -1
}

export function excelSerialToDate(serial: number): Date {
  return new Date(Math.round((serial - 25569) * 86400 * 1000))
}

export function parseTransactionDate(
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

  // Detectar formato YYYYMMDD (8 dígitos numéricos) - usado por BANCOLOMBIA
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
    error: `No se pudo parsear fecha '${rawValue}' con formato ${inputFormat}` 
  }
}

export function normalizeNit(value: any): string | null {
  if (value === null || value === undefined || value === '') {
    return null
  }

  // First remove the .0 suffix (Excel artifact), then remove remaining dots and commas
  const strValue = String(value)
    .trim()
    .replace(/\.0$/, '')
    .replace(/[.,]/g, '')

  if (!strValue || strValue === '0' || strValue.toLowerCase() === 'nan') {
    return null
  }

  return strValue
}

export function normalizeAmount(value: any): number | null {
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

export type ProgressCallback = (progress: number, message?: string) => void

const YIELD_INTERVAL = 25

function yieldToMain(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      setTimeout(resolve, 0)
    })
  })
}

export async function parseBankExtractFile(
  file: File,
  dateFormatConfig: DateFormatConfig,
  onProgress?: ProgressCallback
): Promise<BankExtractParseResult> {
  // Use Web Worker if supported for better UI responsiveness
  if (isWorkerSupported()) {
    try {
      return await parseExcelWithWorker(file, dateFormatConfig, onProgress)
    } catch (workerError) {
      console.warn('Worker failed, falling back to main thread:', workerError)
      // Fall through to main thread processing
    }
  }

  // Fallback: process on main thread with yielding
  return new Promise((resolve, reject) => {
    onProgress?.(5, 'Leyendo archivo...')

    const reader = new FileReader()

    reader.onload = async (e) => {
      try {
        onProgress?.(15, 'Parseando estructura del archivo...')
        await yieldToMain()

        const data = e.target?.result
        const workbook = XLSX.read(data, {
          type: 'array',
          cellDates: true,
          cellNF: true,
          cellText: false,
        })

        onProgress?.(30, `${workbook.SheetNames.length} hoja(s) detectada(s)`)
        await yieldToMain()

        const sheets: BankSheetData[] = []
        const allErrors: string[] = []
        let totalTransactions = 0
        const totalSheets = workbook.SheetNames.length

        for (let sheetIndex = 0; sheetIndex < totalSheets; sheetIndex++) {
          const sheetName = workbook.SheetNames[sheetIndex]
          const worksheet = workbook.Sheets[sheetName]

          onProgress?.(
            35 + Math.round((sheetIndex / totalSheets) * 10),
            `Leyendo hoja ${sheetIndex + 1}/${totalSheets}: ${sheetName}`
          )
          await yieldToMain()

          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

          if (jsonData.length <= 1) {
            continue
          }

          const bankName = normalizeBankName(sheetName)

          const rawHeaders = jsonData[0] || []
          const normalizedHeaders = rawHeaders.map(normalizeColumnName)
          const rows = jsonData.slice(1).filter((row) => row.some((cell) => cell !== null && cell !== undefined && cell !== ''))

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

          const sheetProgressBase = 45 + (sheetIndex / totalSheets) * 45

          for (let i = 0; i < rowsLength; i++) {
            if (i % YIELD_INTERVAL === 0) {
              const rowProgress = (i / rowsLength) * 100
              const currentProgress = Math.min(90, Math.round(sheetProgressBase + (rowProgress / totalSheets) * 0.8))
              onProgress?.(
                currentProgress,
                `${bankName}: fila ${i + 1} de ${rowsLength}`
              )
              await yieldToMain()
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
              customer_name_extract: getCellValue(row, nombreIdx) ? String(getCellValue(row, nombreIdx)).trim() : null,
              reference: getCellValue(row, referenciaIdx) ? String(getCellValue(row, referenciaIdx)).trim() : null,
              description: null,
              agent_name: getCellValue(row, agenteIdx) ? String(getCellValue(row, agenteIdx)).trim() : null,
              receipt_status: getCellValue(row, reciboIdx) ? String(getCellValue(row, reciboIdx)).trim() : null,
              notes: getCellValue(row, novedadIdx) ? String(getCellValue(row, novedadIdx)).trim() : null,
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

        onProgress?.(95, 'Finalizando análisis...')
        await yieldToMain()

        resolve({
          fileName: file.name,
          sheets,
          totalTransactions,
          totalErrors: allErrors,
        })
      } catch (error: any) {
        reject(error)
      }
    }

    reader.onerror = () => reject(new Error('Error al leer el archivo'))
    reader.readAsArrayBuffer(file)
  })
}

export function prepareTransactionInserts(
  businessId: string,
  batchId: string,
  transactions: ParsedBankTransaction[],
  customerMatches: Record<string, string>,
  fileName: string
): BankTransactionInsert[] {
  return transactions.map((tx) => {
    let status: BankTransactionInsert['status'] = 'unidentified'
    let customerId: string | null = null

    if (!tx.customer_nit) {
      status = 'no_nit'
    } else if (customerMatches[tx.customer_nit]) {
      status = 'identified'
      customerId = customerMatches[tx.customer_nit]
    }

    return {
      business_id: businessId,
      import_batch_id: batchId,
      transaction_date: tx.transaction_date,
      amount: tx.amount,
      bank_name: tx.bank_name,
      customer_id: customerId,
      customer_nit: tx.customer_nit,
      customer_name_extract: tx.customer_name_extract,
      reference: tx.reference,
      description: tx.description,
      agent_name: tx.agent_name,
      receipt_status: tx.receipt_status,
      notes: tx.notes,
      status,
      source_file_name: fileName,
      source_sheet_name: tx.bank_name,
      raw_data: tx.raw_data,
    }
  })
}
