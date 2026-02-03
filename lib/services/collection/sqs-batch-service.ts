import {
  SQSClient,
  SendMessageCommand,
  SendMessageBatchCommand,
  SendMessageBatchRequestEntry,
  DeleteMessageCommand,
} from '@aws-sdk/client-sqs'
import { ExecutionBatch } from '@/lib/models/collection/execution-batch'
import {
  BatchQueueMessage,
  BatchQueueMessageInsert,
} from '@/lib/models/collection/batch-queue-message'
import { BatchStrategyService } from './batch-strategy-service'
import { getSupabaseAdminClient } from '@/lib/actions/supabase'

// Initialize SQS Client
const sqsClient = new SQSClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
})

/**
 * Servicio para gestionar el encolado de batches en SQS
 * Controla la distribución y procesamiento de mensajes
 */
export class SQSBatchService {
  private static readonly SQS_BATCH_QUEUE_URL = process.env.SQS_BATCH_QUEUE_URL || ''
  private static readonly MAX_BATCH_SIZE = 10 // SQS permite máximo 10 mensajes por batch

  /**
   * Encola batches en SQS para procesamiento asíncrono
   *
   * @param batches - Batches a encolar
   * @param options - Opciones de encolado
   * @returns Información de los mensajes encolados
   */
  static async enqueueBatches(
    batches: ExecutionBatch[],
    options?: {
      delaySeconds?: number // Retraso inicial (0-900 segundos)
      maxConcurrent?: number // Máximo de batches a encolar simultáneamente
    }
  ): Promise<{
    success: boolean
    queuedCount: number
    failedCount: number
    messages: BatchQueueMessage[]
  }> {
    const supabase = await getSupabaseAdminClient()

    if (!this.SQS_BATCH_QUEUE_URL) {
      throw new Error('SQS_BATCH_QUEUE_URL environment variable is not set')
    }

    if (batches.length === 0) {
      return { success: true, queuedCount: 0, failedCount: 0, messages: [] }
    }

    const messages: BatchQueueMessage[] = []
    let queuedCount = 0
    let failedCount = 0

    // Procesar en grupos de máximo 10 (límite de SQS batch)
    for (let i = 0; i < batches.length; i += this.MAX_BATCH_SIZE) {
      const batchGroup = batches.slice(i, i + this.MAX_BATCH_SIZE)

      try {
        // Preparar mensajes para SQS (DelaySeconds no soportado en colas FIFO para batch)
        const sqsEntries: SendMessageBatchRequestEntry[] = batchGroup.map(
          (batch, index) => ({
            Id: `${batch.id}`,
            MessageBody: JSON.stringify({
              batch_id: batch.id,
              execution_id: batch.execution_id,
              batch_number: batch.batch_number,
              client_ids: batch.client_ids,
              total_clients: batch.total_clients,
              scheduled_for: batch.scheduled_for,
            }),
            MessageGroupId: batch.execution_id,
            MessageDeduplicationId: `${batch.execution_id}-${batch.batch_number}-${batch.id}`,
            MessageAttributes: {
              batch_id: {
                DataType: 'String',
                StringValue: batch.id,
              },
              execution_id: {
                DataType: 'String',
                StringValue: batch.execution_id,
              },
              batch_number: {
                DataType: 'Number',
                StringValue: batch.batch_number.toString(),
              },
            },
          })
        )

        // Enviar batch a SQS
        const command = new SendMessageBatchCommand({
          QueueUrl: this.SQS_BATCH_QUEUE_URL,
          Entries: sqsEntries,
        })

        const result = await sqsClient.send(command)

        // Procesar resultados exitosos
        if (result.Successful) {
          for (const success of result.Successful) {
            const batch = batchGroup.find((b) => b.id === success.Id)
            if (batch) {
              // Actualizar batch en BD
              await BatchStrategyService.updateBatchStatus(batch.id, 'queued')

              // Guardar referencia del mensaje
              const messageInsert: BatchQueueMessageInsert = {
                batch_id: batch.id,
                sqs_queue_url: this.SQS_BATCH_QUEUE_URL,
                sqs_message_id: success.MessageId!,
                status: 'queued',
                payload: {
                  batch_id: batch.id,
                  execution_id: batch.execution_id,
                  batch_number: batch.batch_number,
                },
              }

              const { data: message } = await supabase
                .from('batch_queue_messages')
                .insert(messageInsert)
                .select()
                .single()

              if (message) {
                messages.push(message as BatchQueueMessage)
              }

              queuedCount++
            }
          }
        }

        // Procesar fallos
        if (result.Failed && result.Failed.length > 0) {
          failedCount += result.Failed.length
          console.error('Failed to send SQS messages:', result.Failed)

          // Actualizar batches fallidos
          for (const failure of result.Failed) {
            const batch = batchGroup.find((b) => b.id === failure.Id)
            if (batch) {
              await BatchStrategyService.updateBatchStatus(batch.id, 'failed', {
                errorMessage: failure.Message || 'SQS send failed',
              })
            }
          }
        }
      } catch (error) {
        console.error('Error sending batch to SQS:', error)
        failedCount += batchGroup.length

        // Marcar todos los batches del grupo como fallidos
        for (const batch of batchGroup) {
          await BatchStrategyService.updateBatchStatus(batch.id, 'failed', {
            errorMessage:
              error instanceof Error ? error.message : 'Unknown error',
          })
        }
      }
    }

    return {
      success: failedCount === 0,
      queuedCount,
      failedCount,
      messages,
    }
  }

  /**
   * Encola un único batch en SQS
   */
  static async enqueueSingleBatch(
    batch: ExecutionBatch,
    delaySeconds?: number
  ): Promise<BatchQueueMessage | null> {
    const supabase = await getSupabaseAdminClient()

    if (!this.SQS_BATCH_QUEUE_URL) {
      throw new Error('SQS_BATCH_QUEUE_URL environment variable is not set')
    }

    try {
      const command = new SendMessageCommand({
        QueueUrl: this.SQS_BATCH_QUEUE_URL,
        MessageBody: JSON.stringify({
          batch_id: batch.id,
          execution_id: batch.execution_id,
          batch_number: batch.batch_number,
          client_ids: batch.client_ids,
          total_clients: batch.total_clients,
          scheduled_for: batch.scheduled_for,
        }),
        DelaySeconds: delaySeconds && delaySeconds <= 900 ? delaySeconds : 0,
        MessageGroupId: batch.execution_id,
        MessageDeduplicationId: `${batch.execution_id}-${batch.batch_number}-${batch.id}`,
        MessageAttributes: {
          batch_id: {
            DataType: 'String',
            StringValue: batch.id,
          },
          execution_id: {
            DataType: 'String',
            StringValue: batch.execution_id,
          },
        },
      })

      const result = await sqsClient.send(command)

      // Actualizar batch
      await BatchStrategyService.updateBatchStatus(batch.id, 'queued')

      // Guardar mensaje
      const messageInsert: BatchQueueMessageInsert = {
        batch_id: batch.id,
        sqs_queue_url: this.SQS_BATCH_QUEUE_URL,
        sqs_message_id: result.MessageId!,
        status: 'queued',
        payload: {
          batch_id: batch.id,
          execution_id: batch.execution_id,
        },
      }

      const { data: message } = await supabase
        .from('batch_queue_messages')
        .insert(messageInsert)
        .select()
        .single()

      return message as BatchQueueMessage
    } catch (error) {
      console.error('Error enqueueing single batch:', error)
      await BatchStrategyService.updateBatchStatus(batch.id, 'failed', {
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      })
      return null
    }
  }

  /**
   * Elimina un mensaje de SQS después de procesarlo exitosamente
   */
  static async deleteMessage(
    messageId: string,
    receiptHandle: string
  ): Promise<boolean> {
    const supabase = await getSupabaseAdminClient()

    if (!this.SQS_BATCH_QUEUE_URL) {
      throw new Error('SQS_BATCH_QUEUE_URL environment variable is not set')
    }

    try {
      const command = new DeleteMessageCommand({
        QueueUrl: this.SQS_BATCH_QUEUE_URL,
        ReceiptHandle: receiptHandle,
      })

      await sqsClient.send(command)

      // Actualizar estado en BD
      await supabase
        .from('batch_queue_messages')
        .update({
          status: 'processed',
          processed_at: new Date().toISOString(),
        })
        .eq('sqs_message_id', messageId)
        .eq('sqs_queue_url', this.SQS_BATCH_QUEUE_URL)

      return true
    } catch (error) {
      console.error('Error deleting SQS message:', error)
      return false
    }
  }

  /**
   * Calcula el delay según la programación del batch
   * Retorna segundos hasta que debe ejecutarse
   */
  private static calculateDelaySeconds(batch: ExecutionBatch): number {
    if (!batch.scheduled_for) {
      return 0 // Sin delay, ejecutar inmediatamente
    }

    const scheduledTime = new Date(batch.scheduled_for).getTime()
    const now = Date.now()
    const delayMs = scheduledTime - now

    // SQS permite máximo 15 minutos (900 segundos) de delay
    const maxDelaySeconds = 900
    const delaySeconds = Math.floor(delayMs / 1000)

    return Math.max(0, Math.min(delaySeconds, maxDelaySeconds))
  }

  /**
   * Obtiene mensajes de la cola para procesamiento (usado por Lambda consumer)
   */
  static async getMessagesFromQueue(
    maxMessages: number = 10,
    waitTimeSeconds: number = 20,
    visibilityTimeout: number = 300 // 5 minutos para procesar
  ): Promise<
    Array<{
      messageId: string
      receiptHandle: string
      body: any
      attributes: Record<string, string>
    }>
  > {
    if (!this.SQS_BATCH_QUEUE_URL) {
      throw new Error('SQS_BATCH_QUEUE_URL environment variable is not set')
    }

    // Nota: Esta función es llamada por la Lambda consumer de SQS
    // La Lambda recibe mensajes automáticamente via trigger, no necesita hacer ReceiveMessage
    // Este método es por si se necesita procesamiento manual

    return []
  }

  /**
   * Reintenta encolar batches que fallaron
   */
  static async retryFailedBatches(
    executionId: string,
    maxRetries: number = 3
  ): Promise<{
    retried: number
    succeeded: number
    failed: number
  }> {
    const supabase = await getSupabaseAdminClient()

    // Buscar batches fallidos
    const { data: failedBatches, error } = await supabase
      .from('execution_batches')
      .select('*')
      .eq('execution_id', executionId)
      .eq('status', 'failed')
      .lt('retry_count', maxRetries)

    if (error || !failedBatches || failedBatches.length === 0) {
      return { retried: 0, succeeded: 0, failed: 0 }
    }

    let succeeded = 0
    let failed = 0

    for (const batch of failedBatches) {
      // Incrementar contador de reintentos
      await supabase
        .from('execution_batches')
        .update({
          retry_count: batch.retry_count + 1,
          status: 'pending',
          error_message: null,
        })
        .eq('id', batch.id)

      // Reintentar encolar
      const message = await this.enqueueSingleBatch(batch as ExecutionBatch)

      if (message) {
        succeeded++
      } else {
        failed++
      }
    }

    return {
      retried: failedBatches.length,
      succeeded,
      failed,
    }
  }

  /**
   * Obtiene estadísticas de la cola
   */
  static async getQueueStats(executionId?: string): Promise<{
    totalQueued: number
    totalInFlight: number
    totalProcessed: number
    totalFailed: number
    totalInDLQ: number
  }> {
    const supabase = await getSupabaseAdminClient()

    let query = supabase
      .from('batch_queue_messages')
      .select('status', { count: 'exact' })

    if (executionId) {
      // Filtrar por batches de una ejecución específica
      const { data: batchIds } = await supabase
        .from('execution_batches')
        .select('id')
        .eq('execution_id', executionId)

      if (batchIds && batchIds.length > 0) {
        query = query.in(
          'batch_id',
          batchIds.map((b) => b.id)
        )
      }
    }

    const { data, error } = await query

    if (error || !data) {
      return {
        totalQueued: 0,
        totalInFlight: 0,
        totalProcessed: 0,
        totalFailed: 0,
        totalInDLQ: 0,
      }
    }

    const counts = {
      queued: data.filter((d) => d.status === 'queued').length,
      in_flight: data.filter((d) => d.status === 'in_flight').length,
      processed: data.filter((d) => d.status === 'processed').length,
      failed: data.filter((d) => d.status === 'failed').length,
      dlq: data.filter((d) => d.status === 'dlq').length,
    }

    return {
      totalQueued: counts.queued,
      totalInFlight: counts.in_flight,
      totalProcessed: counts.processed,
      totalFailed: counts.failed,
      totalInDLQ: counts.dlq,
    }
  }

  /**
   * Limpia mensajes antiguos procesados de la tabla de tracking
   */
  static async cleanupOldMessages(olderThanDays: number = 7): Promise<number> {
    const supabase = await getSupabaseAdminClient()

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)

    const { data, error } = await supabase
      .from('batch_queue_messages')
      .delete()
      .in('status', ['processed', 'failed', 'dlq'])
      .lt('created_at', cutoffDate.toISOString())
      .select('id')

    if (error) {
      console.error('Error cleaning up old messages:', error)
      return 0
    }

    return data?.length || 0
  }
}
