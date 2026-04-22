import type { DateFormatConfig, BankExtractParseResult, BankSheetData, ProgressCallback } from './import-service'

interface WorkerMessage {
  type: 'progress' | 'complete' | 'error'
  progress?: number
  message?: string
  result?: BankExtractParseResult
  error?: string
}

const WORKER_CODE = `
// Worker code for Excel parsing
let XLSX = null

async function loadXLSX() {
  if (XLSX) return XLSX
  try {
    // Try to load from CDN
    importScripts('https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js')
    XLSX = self.XLSX
    return XLSX
  } catch (e) {
    throw new Error('No se pudo cargar la librería XLSX')
  }
}

const FORMAT_MAP = {
  'DD-MM-AAAA': 'dd-MM-yyyy',
  'MM-DD-AAAA': 'MM-dd-yyyy',
  'AAAA-MM-DD': 'yyyy-MM-dd',
  'DD/MM/AAAA': 'dd/MM/yyyy',
  'MM/DD/AAAA': 'MM/dd/yyyy',
}

const COLUMN_MAPPINGS = {
  fecha: ['FECHA', ' FECHA', 'Fecha', 'fecha_transaccion'],
  valor: ['VALOR', 'Valor', 'monto', 'amount'],
  nit: ['NIT', 'Nit', 'nit_cliente', 'documento'],
  nombre: ['NOMBRE CLIENTE', 'Nombre Cliente', 'razon_social', 'cliente'],
  referencia: ['REFERENCIA', 'Referencia', 'descripcion', 'concepto'],
  agente: ['AGENTE SIESA', 'EQUIPO FACT Y CARTERA', 'agente', 'gestor'],
  recibo: ['RECIBO', 'OK RECIBO', 'OK RECIBIO ', 'confirmado'],
  novedad: ['NOVEDAD', 'Novedad', 'nota', 'observacion'],
}

function normalizeColumnName(header) {
  return String(header)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\\u0300-\\u036f]/g, '')
    .replace(/\\s+/g, ' ')
}

function normalizeBankName(sheetName) {
  return sheetName
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\\u0300-\\u036f]/g, '')
    .replace(/\\s+/g, ' ')
}

function findColumnIndex(headers, normalizedHeaders, fieldKey) {
  const possibleNames = COLUMN_MAPPINGS[fieldKey] || []
  for (const name of possibleNames) {
    const normalized = normalizeColumnName(name)
    const index = normalizedHeaders.findIndex(h => h === normalized)
    if (index !== -1) return index
  }
  return -1
}

function excelSerialToDate(serial) {
  return new Date(Math.round((serial - 25569) * 86400 * 1000))
}

function isValidDate(date) {
  return date instanceof Date && !isNaN(date.getTime())
}

function formatDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return year + '-' + month + '-' + day
}

function parseTransactionDate(rawValue, inputFormat) {
  if (rawValue === null || rawValue === undefined || rawValue === '') {
    return { date: null, error: 'Fecha vacía' }
  }

  if (rawValue instanceof Date && isValidDate(rawValue)) {
    return { date: formatDate(rawValue) }
  }

  if (typeof rawValue === 'number') {
    const date = excelSerialToDate(rawValue)
    if (isValidDate(date)) {
      return { date: formatDate(date) }
    }
  }

  const strValue = String(rawValue).trim()
  if (!strValue) {
    return { date: null, error: 'Fecha vacía' }
  }

  // YYYYMMDD format
  if (/^\\d{8}$/.test(strValue)) {
    const year = strValue.substring(0, 4)
    const month = strValue.substring(4, 6)
    const day = strValue.substring(6, 8)
    const isoDate = year + '-' + month + '-' + day
    const parsed = new Date(isoDate)
    if (isValidDate(parsed)) {
      return { date: isoDate }
    }
  }

  if (!isNaN(Number(strValue)) && strValue.length >= 5) {
    const date = excelSerialToDate(Number(strValue))
    if (isValidDate(date)) {
      return { date: formatDate(date) }
    }
  }

  return {
    date: null,
    error: "No se pudo parsear fecha '" + rawValue + "' con formato " + inputFormat
  }
}

function normalizeNit(value) {
  if (value === null || value === undefined || value === '') {
    return null
  }
  const strValue = String(value)
    .trim()
    .replace(/\\.0$/, '')
    .replace(/[.,]/g, '')
  if (!strValue || strValue === '0' || strValue.toLowerCase() === 'nan') {
    return null
  }
  return strValue
}

function normalizeAmount(value) {
  if (value === null || value === undefined || value === '') {
    return null
  }
  const num = Number(value)
  return isNaN(num) ? null : num
}

function getCellValue(row, index) {
  if (index === -1 || index >= row.length) return null
  return row[index]
}

self.onmessage = async function(e) {
  const { fileData, fileName, dateFormatConfig } = e.data

  try {
    self.postMessage({ type: 'progress', progress: 5, message: 'Cargando librerías...' })

    await loadXLSX()

    self.postMessage({ type: 'progress', progress: 10, message: 'Parseando archivo...' })

    const workbook = XLSX.read(fileData, {
      type: 'array',
      cellDates: true,
      cellNF: true,
      cellText: false,
    })

    self.postMessage({
      type: 'progress',
      progress: 20,
      message: workbook.SheetNames.length + ' hoja(s) detectada(s)'
    })

    const sheets = []
    const allErrors = []
    let totalTransactions = 0
    const totalSheets = workbook.SheetNames.length

    for (let sheetIndex = 0; sheetIndex < totalSheets; sheetIndex++) {
      const sheetName = workbook.SheetNames[sheetIndex]
      const worksheet = workbook.Sheets[sheetName]

      self.postMessage({
        type: 'progress',
        progress: 20 + Math.round((sheetIndex / totalSheets) * 10),
        message: 'Leyendo hoja ' + (sheetIndex + 1) + '/' + totalSheets + ': ' + sheetName
      })

      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

      if (jsonData.length <= 1) {
        continue
      }

      const bankName = normalizeBankName(sheetName)
      const rawHeaders = jsonData[0] || []
      const normalizedHeaders = rawHeaders.map(normalizeColumnName)
      const rows = jsonData.slice(1).filter(row =>
        row.some(cell => cell !== null && cell !== undefined && cell !== '')
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
        allErrors.push("Hoja '" + sheetName + "': Faltan columnas requeridas (FECHA, VALOR)")
        continue
      }

      const transactions = []
      const sheetErrors = []
      const rowsLength = rows.length
      const sheetProgressBase = 30 + (sheetIndex / totalSheets) * 60

      for (let i = 0; i < rowsLength; i++) {
        if (i % 25 === 0) {
          const rowProgress = (i / rowsLength) * 100
          const currentProgress = Math.min(90, Math.round(sheetProgressBase + (rowProgress / totalSheets) * 0.8))
          self.postMessage({
            type: 'progress',
            progress: currentProgress,
            message: bankName + ': fila ' + (i + 1) + ' de ' + rowsLength
          })
        }

        const row = rows[i]
        const rowNumber = i + 2

        const rawFecha = getCellValue(row, fechaIdx)
        const rawValor = getCellValue(row, valorIdx)

        const dateResult = parseTransactionDate(rawFecha, dateFormatConfig.inputFormat)
        if (!dateResult.date) {
          sheetErrors.push('Fila ' + rowNumber + ': ' + dateResult.error)
          continue
        }

        const amount = normalizeAmount(rawValor)
        if (amount === null) {
          sheetErrors.push('Fila ' + rowNumber + ": Valor inválido '" + rawValor + "'")
          continue
        }

        const nit = normalizeNit(getCellValue(row, nitIdx))
        const rawNit = getCellValue(row, nitIdx)

        transactions.push({
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
        })
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

    self.postMessage({ type: 'progress', progress: 95, message: 'Finalizando análisis...' })

    self.postMessage({
      type: 'complete',
      result: {
        fileName,
        sheets,
        totalTransactions,
        totalErrors: allErrors,
      }
    })
  } catch (error) {
    self.postMessage({ type: 'error', error: error.message || 'Error desconocido' })
  }
}
`

let workerBlobUrl: string | null = null

function getWorkerBlobUrl(): string {
  if (!workerBlobUrl) {
    const blob = new Blob([WORKER_CODE], { type: 'application/javascript' })
    workerBlobUrl = URL.createObjectURL(blob)
  }
  return workerBlobUrl
}

export function parseExcelWithWorker(
  file: File,
  dateFormatConfig: DateFormatConfig,
  onProgress?: ProgressCallback
): Promise<BankExtractParseResult> {
  return new Promise((resolve, reject) => {
    const workerUrl = getWorkerBlobUrl()
    const worker = new Worker(workerUrl)

    worker.onmessage = (e: MessageEvent<WorkerMessage>) => {
      const { type, progress, message, result, error } = e.data

      if (type === 'progress') {
        onProgress?.(progress ?? 0, message)
      } else if (type === 'complete') {
        worker.terminate()
        resolve(result!)
      } else if (type === 'error') {
        worker.terminate()
        reject(new Error(error || 'Error en el worker'))
      }
    }

    worker.onerror = (e) => {
      worker.terminate()
      reject(new Error(e.message || 'Error en el worker'))
    }

    // Read file and send to worker
    const reader = new FileReader()
    reader.onload = (e) => {
      const fileData = e.target?.result as ArrayBuffer
      worker.postMessage({
        fileData,
        fileName: file.name,
        dateFormatConfig,
      })
    }
    reader.onerror = () => {
      worker.terminate()
      reject(new Error('Error al leer el archivo'))
    }
    reader.readAsArrayBuffer(file)
  })
}

export function isWorkerSupported(): boolean {
  return typeof Worker !== 'undefined'
}
