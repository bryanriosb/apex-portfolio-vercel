'use server'

import { getSupabaseAdminClient } from '@/lib/actions/supabase'
import { CollectionExecutionInsert } from '@/lib/models/collection'
import { CollectionClientInsert } from '@/lib/models/collection/client'
import { BatchStrategyService } from '@/lib/services/collection/batch-strategy-service'
import { EmailReputationService } from '@/lib/services/collection/email-reputation-service'
import { ClientProcessor } from '@/lib/services/collection/client-processor'
import { fetchThresholdsAction } from '@/lib/actions/collection/notification-threshold'
import { getBusinessByIdAction } from '@/lib/actions/business'
import { CollectionService } from '@/lib/services/collection/collection-service'

interface CreateExecutionWorkflowParams {
  executionData: CollectionExecutionInsert
  clients: any[]
  strategyConfig?: {
    strategyId?: string
    strategyType: 'ramp_up' | 'batch' | 'conservative' | 'aggressive'
    domain: string
    provider?: string
    sendingIp?: string
    customBatchSize?: number
    maxBatchesPerDay?: number
    customIntervals?: number[]
    startImmediately?: boolean
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

export async function createExecutionWithClientsAction({
  executionData,
  clients,
  strategyConfig,
}: CreateExecutionWorkflowParams): Promise<WorkflowResult> {
  const supabase = await getSupabaseAdminClient()

  try {
    if (!strategyConfig) {
      throw new Error('Strategy configuration is required. Must specify strategyType and domain.')
    }

    const { strategyId, strategyType, domain } = strategyConfig

    if (!domain) {
      throw new Error('Domain is required for reputation tracking and deliverability.')
    }

    // Determine template ID (fallback logic)
    let emailTemplateId = executionData.email_template_id

    if (!emailTemplateId) {
      try {
        const thresholdsResponse = await fetchThresholdsAction(executionData.business_id)
        if (thresholdsResponse.data.length > 0) {
          const lowestThreshold = thresholdsResponse.data[0]
          if (lowestThreshold.email_template_id) {
            emailTemplateId = lowestThreshold.email_template_id
          }
        }
      } catch (err) {
        console.error('Error fetching fallback template from thresholds:', err)
      }
    }

    // 1. Create Execution
    const { data: execution, error: execError } = await supabase
      .from('collection_executions')
      .insert({
        ...executionData,
        email_template_id: emailTemplateId,
        status: 'pending',
        total_clients: clients.length,
      })
      .select()
      .single()

    if (execError || !execution) {
      throw new Error(`Error creating execution: ${execError?.message}`)
    }

    // 2. Process clients with thresholds
    const processedClients = await ClientProcessor.processClientsWithThresholds({
      clients,
      business_id: executionData.business_id,
      execution_id: execution.id,
    })

    const clientsToInsert: CollectionClientInsert[] = processedClients.map((processed) => ({
      execution_id: processed.execution_id!,
      customer_id: processed.customer_id,
      invoices: processed.invoices,
      status: processed.status as CollectionClientInsert['status'],
      email_template_id: processed.email_template_id,
      threshold_id: processed.threshold_id,
      custom_data: processed.custom_data,
    }))

    // 3. Insert Clients
    const { data: insertedClients, error: clientsError } = await supabase
      .from('collection_clients')
      .insert(clientsToInsert)
      .select()

    if (clientsError) {
      await supabase.from('collection_executions').delete().eq('id', execution.id)
      throw new Error(`Error inserting clients: ${clientsError.message}`)
    }

    console.log(`Successfully inserted ${insertedClients?.length} clients`)

    // 4. Create or get reputation profile
    await EmailReputationService.getOrCreateReputationProfile(
      executionData.business_id,
      domain,
      strategyConfig.provider || 'brevo',
      strategyConfig.sendingIp
    )

    // 5. Create batches (timezone is now populated automatically in createBatches)
    const isImmediate = executionData.execution_mode === 'immediate' || strategyConfig.startImmediately
    const batches = await BatchStrategyService.createBatches(
      insertedClients || [],
      execution.id,
      executionData.business_id,
      strategyType,
      domain,
      {
        strategyId,
        customBatchSize: strategyConfig.customBatchSize,
        maxBatchesPerDay: strategyConfig.maxBatchesPerDay,
        customIntervals: strategyConfig.customIntervals,
        startDate: new Date(),
        isImmediate,  // <-- Pasar flag para ejecuciones inmediatas
      }
    )

    console.log(`Created ${batches.length} batches with strategy: ${strategyType}`)

    // 5.5 Assign batch_id to clients for metric tracking
    if (insertedClients && insertedClients.length > 0 && batches.length > 0) {
      await BatchStrategyService.assignClientsToBatches(insertedClients, batches)
    }

    // Verificar si el primer batch tiene scheduled_for en el futuro
    const firstBatch = batches[0]
    const isScheduledForFuture = firstBatch?.scheduled_for 
      ? new Date(firstBatch.scheduled_for) > new Date()
      : false

    // 6. Immediate mode: invoke Lambda directly — no SQS
    if ((executionData.execution_mode === 'immediate' || strategyConfig.startImmediately) && !isScheduledForFuture) {
      await supabase
        .from('collection_executions')
        .update({ status: 'processing', started_at: new Date().toISOString() })
        .eq('id', execution.id)

      await CollectionService.startImmediateExecution(execution.id)

    } else if (executionData.execution_mode === 'scheduled' || isScheduledForFuture) {
      // Scheduled mode: create EventBridge One-time schedule for first batch
      try {
        // Si es inmediata pero fuera de horario, usar el scheduled_for del primer batch
        // Si es scheduled, usar la fecha programada
        const scheduledDate = isScheduledForFuture && firstBatch?.scheduled_for
          ? new Date(firstBatch.scheduled_for)
          : new Date(executionData.scheduled_at!)
        
        const business = await getBusinessByIdAction(executionData.business_id)
        const businessTimezone = business?.timezone || 'America/Bogota'

        const { ruleName } = await CollectionService.scheduleExecution(
          execution.id,
          scheduledDate,
          businessTimezone
        )

        await supabase
          .from('collection_executions')
          .update({
            status: 'pending',
            scheduled_at: scheduledDate.toISOString(),
            eventbridge_rule_name: ruleName,
          })
          .eq('id', execution.id)

        console.log(`Successfully created EventBridge schedule: ${ruleName} for ${scheduledDate.toISOString()}`)
      } catch (scheduleError: any) {
        console.error('Failed to schedule execution:', scheduleError)
        await supabase.from('collection_executions').delete().eq('id', execution.id)
        throw new Error(`Failed to schedule execution in EventBridge: ${scheduleError.message}`)
      }
    }

    const lastBatch = batches[batches.length - 1]
    const estimatedCompletionTime = lastBatch?.scheduled_for ?? null

    let message: string
    if (isScheduledForFuture) {
      message = `Ejecución creada con ${batches.length} batches (${strategyType}). Está fuera del horario permitido, se ejecutará el ${firstBatch?.scheduled_for}.`
    } else if (executionData.execution_mode === 'scheduled' && executionData.scheduled_at) {
      message = `Ejecución programada creada con ${batches.length} batches (${strategyType}). EventBridge configurado para ${executionData.scheduled_at}.`
    } else {
      message = `Ejecución creada con ${batches.length} batches (${strategyType}). Procesamiento iniciado.`
    }

    return {
      success: true,
      executionId: execution.id,
      batchesCreated: batches.length,
      totalClients: clients.length,
      estimatedCompletionTime,
      message,
    }

  } catch (error: any) {
    console.error('Workflow Error:', error)
    return {
      success: false,
      error: error.message || 'Unknown error occurred',
    }
  }
}

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
  }
  error?: string
}> {
  try {
    const progress = await BatchStrategyService.getExecutionProgress(executionId)

    return {
      success: true,
      progress: {
        ...progress,
        estimatedCompletionTime: progress.estimatedCompletionTime?.toISOString() || undefined,
      },
    }
  } catch (error: any) {
    console.error('Progress Error:', error)
    return { success: false, error: error.message }
  }
}
