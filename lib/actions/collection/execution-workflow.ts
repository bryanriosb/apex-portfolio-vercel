'use server'

import { getSupabaseAdminClient } from '@/lib/actions/supabase'
import { CollectionExecutionInsert } from '@/lib/models/collection'
import { CollectionClientInsert } from '@/lib/models/collection/client'
import { BatchStrategyService } from '@/lib/services/collection/batch-strategy-service'
import { SQSBatchService } from '@/lib/services/collection/sqs-batch-service'
import { EmailReputationService } from '@/lib/services/collection/email-reputation-service'
import { getCurrentUser } from '@/lib/services/auth/supabase-auth'

interface CreateExecutionWorkflowParams {
  executionData: CollectionExecutionInsert
  clients: any[] // Raw grouped clients from the wizard
  strategyConfig?: {
    strategyId?: string // ID de la estrategia de la DB
    strategyType: 'ramp_up' | 'batch' | 'conservative' | 'aggressive'
    domain: string // Dominio remitente (ej: bore.sas)
    provider?: string // Proveedor de email (brevo, ses, sendgrid, etc.)
    sendingIp?: string // IP dedicada de SES (opcional)
    customBatchSize?: number // Para estrategia batch: tamaño custom
    maxBatchesPerDay?: number // Para estrategia batch: máximo batches/día
    customIntervals?: number[] // Intervalos custom entre batches
    startImmediately?: boolean // Si true, encola inmediatamente; si false, solo crea batches
  }
}

interface WorkflowResult {
  success: boolean
  executionId?: string
  batchesCreated?: number
  totalClients?: number
  estimatedCompletionTime?: string | null
  message?: string
  error?: string
}

/**
 * Workflow principal para crear ejecuciones con sistema de batches inteligente
 * 
 * Características:
 * - Estrategia Ramp-Up: Para nuevos dominios, distribuye envíos en múltiples días
 * - Estrategia Batch: Para dominios establecidos, envíos agresivos con batches grandes
 * - Integración SQS: Encola batches para procesamiento asíncrono
 * - Control de reputación: Verifica límites diarios y métricas de engagement
 */
export async function createExecutionWithClientsAction({
  executionData,
  clients,
  strategyConfig,
}: CreateExecutionWorkflowParams): Promise<WorkflowResult> {
  const supabase = await getSupabaseAdminClient()

  try {
    // Validar configuración de estrategia
    if (!strategyConfig) {
      throw new Error('Strategy configuration is required. Must specify strategyType and domain.')
    }

    const { strategyId, strategyType, domain } = strategyConfig

    if (!domain) {
      throw new Error('Domain is required for reputation tracking and deliverability.')
    }

    // 1. Create Execution
    const { data: execution, error: execError } = await supabase
      .from('collection_executions')
      .insert({
        ...executionData,
        status: 'pending',
        total_clients: clients.length,
      })
      .select()
      .single()

    if (execError || !execution) {
      throw new Error(`Error creating execution: ${execError?.message}`)
    }

    // 2. Prepare Clients Data
    const clientsToInsert: CollectionClientInsert[] = clients.map((client) => {
      const totalAmount =
        client.total?.total_amount_due ??
        client.invoices.reduce(
          (sum: number, inv: any) => sum + Number(inv.amount_due || 0),
          0
        )

      const totalDaysOverdue = client.total?.total_days_overdue ?? 0

      const email = client.customer?.email || client.invoices[0]?.email
      const fullName =
        client.customer?.full_name || client.invoices[0]?.full_name
      const companyName =
        client.customer?.company_name || client.invoices[0]?.company_name
      const phone = client.customer?.phone || client.invoices[0]?.phone
      const nit = client.nit

      return {
        execution_id: execution.id,
        customer_id: client.customer?.id,
        invoices: client.invoices,
        status: 'pending',
        custom_data: {
          invoices_count: client.invoices.length,
          total_amount_due: totalAmount,
          total_days_overdue: totalDaysOverdue,
          total_invoices:
            client.total?.total_invoices ?? client.invoices.length,
          email,
          full_name: fullName,
          company_name: companyName,
          phone,
          nit,
        },
      }
    })

    console.log(`Creating execution with ${clientsToInsert.length} clients`)

    // 3. Insert Clients (Batch)
    const { data: insertedClients, error: clientsError } = await supabase
      .from('collection_clients')
      .insert(clientsToInsert)
      .select()

    if (clientsError) {
      // Rollback: delete execution
      await supabase
        .from('collection_executions')
        .delete()
        .eq('id', execution.id)
      throw new Error(`Error inserting clients: ${clientsError.message}`)
    }

    console.log(`Successfully inserted ${insertedClients?.length} clients`)

    // 4. Crear o obtener perfil de reputación para el dominio
    const reputationProfile = await EmailReputationService.getOrCreateReputationProfile(
      executionData.business_id,
      domain,
      strategyConfig.provider || 'brevo', // Default a Brevo si no se especifica
      strategyConfig.sendingIp
    )

    console.log(`Reputation profile: ${reputationProfile.domain} - Day ${reputationProfile.current_warmup_day} - Limit ${reputationProfile.daily_sending_limit}`)

    // 5. Crear batches según estrategia
    const batches = await BatchStrategyService.createBatches(
      insertedClients || [],
      execution.id,
      executionData.business_id,
      strategyType,
      domain,
      {
        strategyId: strategyId,
        customBatchSize: strategyConfig.customBatchSize,
        maxBatchesPerDay: strategyConfig.maxBatchesPerDay,
        customIntervals: strategyConfig.customIntervals,
        startDate: new Date(),
      }
    )

    console.log(`Created ${batches.length} batches with strategy: ${strategyType} (ID: ${strategyId || 'default'})`)

    // 6. Encolar batches en SQS (si se solicita inicio inmediato o está programado)
    let queueResult = null

    if (executionData.execution_mode === 'immediate' || strategyConfig.startImmediately) {
      // Encolar todos los batches pendientes
      queueResult = await SQSBatchService.enqueueBatches(
        batches,
        {
          delaySeconds: 0,
          maxConcurrent: strategyType === 'batch' || strategyType === 'aggressive' ? 5 : 1,
        }
      )

      console.log(`Queued ${queueResult.queuedCount} batches to SQS`)

      if (queueResult.failedCount > 0) {
        console.warn(`Failed to queue ${queueResult.failedCount} batches`)
      }

      // Actualizar estado de ejecución
      await supabase
        .from('collection_executions')
        .update({
          status: 'processing',
          started_at: new Date().toISOString(),
          sqs_queue_url: process.env.SQS_BATCH_QUEUE_URL,
        })
        .eq('id', execution.id)

    } else if (executionData.execution_mode === 'scheduled' && executionData.scheduled_at) {
      // Para ejecuciones programadas, los batches ya tienen scheduled_for configurado
      // Se encolarán automáticamente cuando llegue el momento (via Lambda scheduler)

      // Actualizar ejecución con información de programación
      await supabase
        .from('collection_executions')
        .update({
          status: 'pending', // Se mantendrá pending hasta que se encole el primer batch
          scheduled_at: executionData.scheduled_at,
        })
        .eq('id', execution.id)

      console.log(`Scheduled execution with ${batches.length} batches starting at ${executionData.scheduled_at}`)
    }

    // 7. Calcular tiempo estimado de finalización
    const lastBatch = batches[batches.length - 1]
    const estimatedCompletionTime = lastBatch?.scheduled_for

    // 8. Retornar resultado
    const result: WorkflowResult = {
      success: true,
      executionId: execution.id,
      batchesCreated: batches.length,
      totalClients: clients.length,
      estimatedCompletionTime: estimatedCompletionTime,
      message: `Successfully created execution with ${batches.length} batches using ${strategyType} strategy. ${queueResult ? `${queueResult.queuedCount} batches queued to SQS.` : 'Scheduled for later processing.'}`,
    }

    return result

  } catch (error: any) {
    console.error('Workflow Error:', error)
    return {
      success: false,
      error: error.message || 'Unknown error occurred',
    }
  }
}

/**
 * Reintenta encolar batches fallidos de una ejecución
 */
export async function retryFailedBatchesAction(
  executionId: string
): Promise<{ success: boolean; retried: number; succeeded: number; failed: number; message?: string }> {
  const supabase = await getSupabaseAdminClient()

  try {
    const result = await SQSBatchService.retryFailedBatches(executionId)

    return {
      success: true,
      retried: result.retried,
      succeeded: result.succeeded,
      failed: result.failed,
      message: `Retried ${result.retried} batches: ${result.succeeded} succeeded, ${result.failed} failed`,
    }
  } catch (error: any) {
    console.error('Retry Error:', error)
    return {
      success: false,
      retried: 0,
      succeeded: 0,
      failed: 0,
      message: error.message,
    }
  }
}

/**
 * Obtiene el progreso de una ejecución incluyendo métricas de batches
 */
export async function getExecutionProgressAction(
  executionId: string
): Promise<{
  success: boolean
  progress?: {
    totalBatches: number
    completedBatches: number
    pendingBatches: number
    totalClients: number
    processedClients: number
    completionPercentage: number
    estimatedCompletionTime?: string
    queueStats?: {
      totalQueued: number
      totalInFlight: number
      totalProcessed: number
      totalFailed: number
    }
  }
  error?: string
}> {
  const supabase = await getSupabaseAdminClient()

  try {
    const progress = await BatchStrategyService.getExecutionProgress(executionId)
    const queueStats = await SQSBatchService.getQueueStats(executionId)

    return {
      success: true,
      progress: {
        ...progress,
        estimatedCompletionTime: progress.estimatedCompletionTime?.toISOString() || undefined,
        queueStats,
      },
    }
  } catch (error: any) {
    console.error('Progress Error:', error)
    return {
      success: false,
      error: error.message,
    }
  }
}
