import { rejects } from 'assert'

export interface ImportProgress {
  sessionId: string
  current: number
  total: number
  message: string
  status: 'idle' | 'processing' | 'completed' | 'error'
  errors: string[]
  startTime: number
  endTime?: number
}

export interface ImportResult<T = any> {
  success: boolean
  data?: T[]
  errors: string[]
  processed: number
  total: number
  duration: number
}

export interface ImportOptions {
  batchSize?: number
  onProgress?: (progress: ImportProgress) => void
  onError?: (error: Error, item: any, index: number) => void
  continueOnError?: boolean
}

// Almacenamiento temporal de progreso (en memoria - para desarrollo)
// En producción, usar Redis o base de datos
const progressStore: Map<string, ImportProgress> =
  (global as any).progressStore || ((global as any).progressStore = new Map())

export class GenericImportService {
  private generateSessionId(): string {
    return `import_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
  }

  public updateProgress(
    sessionId: string,
    updates: Partial<ImportProgress>,
    onProgress?: (progress: ImportProgress) => void
  ): void {
    const current = progressStore.get(sessionId)
    if (current) {
      const updated = { ...current, ...updates }
      progressStore.set(sessionId, updated)

      // Notificar callback si existe
      if (onProgress) {
        onProgress(updated)
      }
    }
  }

  // Nuevo método para actualización atómica del progreso
  public incrementProgress(
    sessionId: string,
    message: string,
    onProgress?: (progress: ImportProgress) => void
  ): void {
    const current = progressStore.get(sessionId)
    if (current) {
      const updated = {
        ...current,
        current: current.current + 1,
        message,
      }
      progressStore.set(sessionId, updated)

      if (onProgress) {
        onProgress(updated)
      }
    }
  }

  public createInitialProgress(
    sessionId: string,
    total: number
  ): ImportProgress {
    const progress: ImportProgress = {
      sessionId,
      current: 0,
      total,
      message: 'Iniciando importación...',
      status: 'idle',
      errors: [],
      startTime: Date.now(),
    }

    progressStore.set(sessionId, progress)
    return progress
  }

  async importWithProgress<T>(
    data: any[],
    processItem: (item: any, index: number, sessionId: string) => Promise<T>,
    options: ImportOptions = {},
    sessionId?: string
  ): Promise<ImportResult<T>> {
    // Usar sessionId proporcionado o generar uno nuevo
    const actualSessionId = sessionId || this.generateSessionId()
    const batchSize = options.batchSize || 10
    const continueOnError = options.continueOnError ?? true

    const progress = this.createInitialProgress(actualSessionId, data.length)
    const results: T[] = []
    const errors: string[] = []

    try {
      // Iniciar procesamiento
      this.updateProgress(
        actualSessionId,
        {
          status: 'processing',
          message: 'Iniciando procesamiento...',
        },
        options.onProgress
      )

      // Procesar en lotes
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize)

        // Procesar lote en paralelo
        const batchPromises = batch.map(async (item, batchIndex) => {
          const globalIndex = i + batchIndex
          try {
            const result = await processItem(item, globalIndex, actualSessionId)
            results.push(result)

            // Actualizar progreso de forma atómica
            this.incrementProgress(
              actualSessionId,
              `Procesado: ${item.name || item.code || `Item ${globalIndex + 1}`
              }`,
              options.onProgress
            )

            return result
          } catch (error: any) {
            const errorMessage = `Error en item ${globalIndex + 1}: ${error.message
              }`

            errors.push(errorMessage)
            this.updateProgress(
              actualSessionId,
              {
                errors: [...(progressStore.get(actualSessionId)?.errors || []), errorMessage],
              },
              options.onProgress
            )

            // Llamar callback de error si existe
            options.onError?.(error, item, globalIndex)
            if (continueOnError) {
              return null
            } else {
              throw error
            }
          }
        })

        // Esperar que termine el lote
        await Promise.all(batchPromises)

        // Pequeña pausa entre lotes para no sobrecargar
        if (i + batchSize < data.length) {
          await new Promise((resolve) => setTimeout(resolve, 10))
        }
      }

      // Completar
      const finalProgress = progressStore.get(actualSessionId)
      const finalErrors = finalProgress?.errors || errors
      const success = finalErrors.length === 0

      const endTime = Date.now()
      this.updateProgress(
        actualSessionId,
        {
          status: 'completed',
          current: results.length,
          message: `Importación completada: ${results.length} procesados, ${finalErrors.length} errores`,
          endTime,
          errors: finalErrors
        },
        options.onProgress
      )

      return {
        success,
        data: results.filter((r) => r !== null),
        errors: finalErrors,
        processed: results.length,
        total: data.length,
        duration: endTime - progress.startTime,
      }
    } catch (error: any) {
      console.log(`GenericImportService catch executed, continueOnError: ${continueOnError}, error:`, error.message)
      this.updateProgress(
        actualSessionId,
        {
          status: 'error',
          message: `Error fatal: ${error.message}`,
          errors: [...(progressStore.get(actualSessionId)?.errors || []), error.message],
          endTime: Date.now(),
        },
        options.onProgress
      )

      return {
        success: false,
        errors: [...errors, error.message],
        processed: results.length,
        total: data.length,
        duration: Date.now() - progress.startTime,
      }
    }
  }

  getProgress(sessionId: string): ImportProgress | null {
    return progressStore.get(sessionId) || null
  }

  // Limpiar progreso antiguo (útil para cleanup)
  cleanupOldProgress(maxAge: number = 3600000): void {
    // 1 hora por defecto
    const now = Date.now()
    for (const [sessionId, progress] of progressStore.entries()) {
      if (now - progress.startTime > maxAge) {
        progressStore.delete(sessionId)
      }
    }
  }

  // Función de sanitización profunda para eliminar prototipos y métodos
  private deepSanitize(obj: any): any {
    // Caso base: valores primitivos
    if (obj === null || obj === undefined) return obj
    if (typeof obj !== 'object') return obj

    // Arrays
    if (Array.isArray(obj)) {
      return obj.map((item) => this.deepSanitize(item))
    }

    // Objetos: crear nuevo objeto sin prototipo
    const sanitized = Object.create(null)

    // Solo copiar propiedades propias (no del prototipo)
    for (const key of Object.getOwnPropertyNames(obj)) {
      const descriptor = Object.getOwnPropertyDescriptor(obj, key)
      if (descriptor && descriptor.value !== undefined) {
        sanitized[key] = this.deepSanitize(descriptor.value)
      }
    }

    return sanitized
  }

  // Sanitizar progreso para evitar problemas de serialización con Client Components
  sanitizeProgress(progress: ImportProgress): ImportProgress {
    try {
      return this.deepSanitize({
        sessionId: progress.sessionId,
        current: progress.current,
        total: progress.total,
        message: progress.message,
        status: progress.status,
        errors: progress.errors.map((error) =>
          typeof error === 'string' ? error : String(error)
        ),
        startTime: progress.startTime,
        endTime: progress.endTime,
      })
    } catch (error) {
      console.error('Error sanitizing progress:', error)
      // Retornar una versión básica si hay problemas
      return Object.create(null, {
        sessionId: { value: progress.sessionId, enumerable: true },
        current: { value: progress.current, enumerable: true },
        total: { value: progress.total, enumerable: true },
        message: { value: 'Error procesando progreso', enumerable: true },
        status: { value: 'error', enumerable: true },
        errors: { value: ['Error interno de serialización'], enumerable: true },
        startTime: { value: progress.startTime, enumerable: true },
      })
    }
  }
}

const genericImportService = new GenericImportService()
export default genericImportService
