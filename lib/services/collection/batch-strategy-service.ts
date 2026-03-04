import { getSupabaseAdminClient } from '@/lib/actions/supabase'
import { DeliveryStrategy, DeliveryStrategyInsert, StrategyType } from '@/lib/models/collection/delivery-strategy'
import { ExecutionBatch, ExecutionBatchInsert } from '@/lib/models/collection/execution-batch'
import { CollectionClient } from '@/lib/models/collection/client'
import { EmailReputationService } from './email-reputation-service'

/**
 * Servicio para gestionar estrategias de batching inteligente
 * Implementa algoritmos Ramp-Up y Batch configurables
 */
export class BatchStrategyService {
  /**
   * Crea una estrategia de entrega personalizada
   */
  static async createStrategy(
    strategy: DeliveryStrategyInsert
  ): Promise<DeliveryStrategy> {
    const supabase = await getSupabaseAdminClient()

    // Si es default, desmarcar otras estrategias default del mismo negocio
    if (strategy.is_default) {
      await supabase
        .from('delivery_strategies')
        .update({ is_default: false })
        .eq('business_id', strategy.business_id)
        .eq('is_default', true)
    }

    const { data, error } = await supabase
      .from('delivery_strategies')
      .insert(strategy)
      .select()
      .single()

    if (error) {
      throw new Error(`Error creating delivery strategy: ${error.message}`)
    }

    return data as DeliveryStrategy
  }

  /**
   * Obtiene la estrategia por defecto para un negocio
   * Si no tiene, crea una estrategia ramp_up estándar
   */
  static async getDefaultStrategy(
    businessId: string
  ): Promise<DeliveryStrategy> {
    const supabase = await getSupabaseAdminClient()

    // Buscar estrategia default del negocio
    const { data: existing, error } = await supabase
      .from('delivery_strategies')
      .select('*')
      .eq('business_id', businessId)
      .eq('is_default', true)
      .eq('is_active', true)
      .single()

    if (existing) {
      return existing as DeliveryStrategy
    }

    // Buscar estrategia ramp_up estándar (global template)
    const { data: template } = await supabase
      .from('delivery_strategies')
      .select('*')
      .is('business_id', null)
      .eq('strategy_type', 'ramp_up')
      .single()

    if (template) {
      // Clonar como default para este negocio
      const { id: _id, created_at, updated_at, ...templateData } = template

      const newStrategy: DeliveryStrategyInsert = {
        ...templateData,
        business_id: businessId,
        is_default: true,
        name: `${template.name} (Default)`,
        created_by: null,
      }

      return this.createStrategy(newStrategy)
    }

    // Crear estrategia ramp_up básica
    return this.createStrategy({
      business_id: businessId,
      name: 'Ramp-Up Gradual Default',
      description: 'Estrategia conservadora para nuevos dominios',
      strategy_type: 'ramp_up',
      is_default: true,
      is_active: true,
    })
  }

  /**
   * Obtiene todas las estrategias de entrega para un negocio
   */
  static async getBusinessStrategies(
    businessId: string
  ): Promise<DeliveryStrategy[]> {
    const supabase = await getSupabaseAdminClient()

    const { data, error } = await supabase
      .from('delivery_strategies')
      .select('*')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Error fetching business strategies: ${error.message}`)
    }

    return (data || []) as DeliveryStrategy[]
  }

  /**
   * Obtiene una estrategia por ID
   */
  static async getStrategyById(
    strategyId: string
  ): Promise<DeliveryStrategy | null> {
    const supabase = await getSupabaseAdminClient()

    const { data, error } = await supabase
      .from('delivery_strategies')
      .select('*')
      .eq('id', strategyId)
      .single()

    if (error) {
      return null
    }

    return data as DeliveryStrategy
  }

  /**
    * Algoritmo principal: Divide clientes en batches según estrategia
    * Si se proporciona strategyId, usa esa estrategia específica de la DB
    */
  static async createBatches(
    clients: CollectionClient[],
    executionId: string,
    businessId: string,
    strategyType: StrategyType,
    domain: string,
    options?: {
      strategyId?: string
      customBatchSize?: number
      maxBatchesPerDay?: number
      customIntervals?: number[]
      startDate?: Date
      isImmediate?: boolean  // <-- NUEVO: para ejecuciones inmediatas
    }
  ): Promise<ExecutionBatch[]> {
    const supabase = await getSupabaseAdminClient()

    // 1. Obtener o crear perfil de reputación
    const reputationProfile =
      await EmailReputationService.getOrCreateReputationProfile(
        businessId,
        domain
      )

    // 2. Obtener timezone del negocio (necesario para EventBridge scheduling)
    const { data: businessData } = await supabase
      .from('businesses')
      .select('timezone')
      .eq('id', businessId)
      .single()
    const businessTimezone = businessData?.timezone || 'America/Bogota'

    // 3. Obtener estrategia
    let strategy: DeliveryStrategy

    if (options?.strategyId) {
      // Usar la estrategia específica por ID
      const { data: strategyById } = await supabase
        .from('delivery_strategies')
        .select('*')
        .eq('id', options.strategyId)
        .single()

      if (strategyById) {
        strategy = strategyById as DeliveryStrategy
      } else {
        // Si no existe, buscar por tipo
        const { data: strategyByType } = await supabase
          .from('delivery_strategies')
          .select('*')
          .eq('business_id', businessId)
          .eq('strategy_type', strategyType)
          .eq('is_active', true)
          .single()

        if (strategyByType) {
          strategy = strategyByType as DeliveryStrategy
        } else {
          strategy = await this.getDefaultStrategy(businessId)
        }
      }
    } else {
      // Comportamiento original: buscar por tipo
      if (options?.customBatchSize || strategyType === 'batch') {
        const { data: batchStrategy } = await supabase
          .from('delivery_strategies')
          .select('*')
          .eq('business_id', businessId)
          .eq('strategy_type', 'batch')
          .eq('is_active', true)
          .single()

        if (batchStrategy) {
          strategy = batchStrategy as DeliveryStrategy
        } else {
          strategy = await this.getDefaultStrategy(businessId)
        }
      } else {
        strategy = await this.getDefaultStrategy(businessId)
      }
    }

    // 4. Verificar cuota disponible según reputación
    const quotaInfo = await EmailReputationService.getRemainingDailyQuota(
      reputationProfile.id,
      options?.startDate || new Date()
    )

    // 5. Seleccionar algoritmo según estrategia
    let batches: ExecutionBatchInsert[] = []

    switch (strategy.strategy_type) {
      case 'ramp_up':
      case 'conservative':
        batches = this.calculateRampUpBatches(
          clients,
          executionId,
          strategy,
          reputationProfile,
          quotaInfo,
          businessTimezone,
          options?.startDate,
          options?.isImmediate
        )
        break

      case 'batch':
      case 'aggressive':
        batches = this.calculateBatchBatches(
          clients,
          executionId,
          strategy,
          businessTimezone,
          options
        )
        break

      default:
        throw new Error(`Unknown strategy type: ${strategy.strategy_type}`)
    }

    // 6. Persistir batches en BD
    if (batches.length === 0) {
      return []
    }

    const { data: createdBatches, error } = await supabase
      .from('execution_batches')
      .insert(batches)
      .select()

    if (error) {
      throw new Error(`Error creating batches: ${error.message}`)
    }

    return createdBatches as ExecutionBatch[]
  }

  /**
   * Algoritmo Ramp-Up Gradual
   */
  private static calculateRampUpBatches(
    clients: CollectionClient[],
    executionId: string,
    strategy: DeliveryStrategy,
    reputationProfile: {
      id: string
      current_warmup_day: number
      daily_sending_limit: number
    },
    quotaInfo: { canSend: boolean; remaining: number; dailyLimit: number },
    timezone: string,
    startDate?: Date,
    isImmediate?: boolean
  ): ExecutionBatchInsert[] {
    const batches: ExecutionBatchInsert[] = []
    let clientIndex = 0
    let currentDay = new Date(startDate || new Date())
    let batchNumber = 1
    const totalClients = clients.length
    const intervalMinutes = strategy.batch_interval_minutes || 60

    const warmupDay = reputationProfile.current_warmup_day
    let dailyLimit =
      quotaInfo.remaining > 0
        ? Math.min(quotaInfo.remaining, quotaInfo.dailyLimit)
        : this.getRampUpLimitForDay(warmupDay, strategy)

    while (clientIndex < totalClients) {
      const batchesToday = batches.filter((b) => {
        if (!b.scheduled_for) return false
        const batchDate = new Date(b.scheduled_for)
        return batchDate.toDateString() === currentDay.toDateString()
      })

      const sentToday = batchesToday.reduce((sum, b) => sum + b.total_clients, 0)
      const remainingToday = dailyLimit - sentToday

      if (remainingToday <= 0) {
        currentDay = new Date(currentDay)
        currentDay.setDate(currentDay.getDate() + 1)
        const nextDayWarmup = warmupDay + Math.floor(batches.length / 2) + 1
        dailyLimit = this.getRampUpLimitForDay(nextDayWarmup, strategy)
        continue
      }

      const batchSize = Math.min(
        strategy.batch_size || 50,
        remainingToday,
        totalClients - clientIndex
      )

      const batchClients = clients.slice(clientIndex, clientIndex + batchSize)
      const clientIds = batchClients.map((c) => c.id)

      // Calcular tiempo base usando la nueva lógica de horarios
      let baseTime: Date
      
      if (isImmediate && batches.length > 0) {
        // Para ejecuciones inmediatas con batches previos, usar el último batch + intervalo
        const lastBatch = batches[batches.length - 1]
        const lastScheduledTime = lastBatch.scheduled_for 
          ? new Date(lastBatch.scheduled_for)
          : new Date()
        baseTime = new Date(lastScheduledTime.getTime() + intervalMinutes * 60000)
      } else {
        baseTime = isImmediate 
          ? new Date() 
          : currentDay
      }
      
      const baseScheduledTime = this.calculateSendTime(
        baseTime,
        strategy,
        timezone,
        isImmediate
      )
      
      // Para ejecuciones inmediatas, ya aplicamos el offset arriba
      // Para programadas, usar el offset tradicional basado en batches del día
      const scheduledTime = isImmediate && batches.length > 0
        ? baseScheduledTime
        : new Date(baseScheduledTime.getTime() + batchesToday.length * intervalMinutes * 60000)

      batches.push({
        execution_id: executionId,
        strategy_id: strategy.id,
        batch_number: batchNumber,
        batch_name: `Batch ${batchNumber} - Día ${Math.floor((batchNumber - 1) / 2) + 1} Ramp-Up`,
        status: 'pending',
        total_clients: batchClients.length,
        client_ids: clientIds,
        scheduled_for: scheduledTime.toISOString(),
        timezone,
      })

      clientIndex += batchSize
      batchNumber++

      if (clientIndex < totalClients && batchSize >= remainingToday) {
        currentDay = new Date(currentDay)
        currentDay.setDate(currentDay.getDate() + 1)
        const nextDayWarmup = warmupDay + Math.floor(batchNumber / 2)
        dailyLimit = this.getRampUpLimitForDay(nextDayWarmup, strategy)
      }
    }

    return batches
  }

  /**
   * Obtiene el límite de envío para un día específico de warm-up
   */
  private static getRampUpLimitForDay(
    day: number,
    strategy: DeliveryStrategy
  ): number {
    if (day === 1) return strategy.rampup_day_1_limit || 50
    if (day === 2) return strategy.rampup_day_2_limit || 100
    if (day >= 3 && day <= 5) return strategy.rampup_day_3_5_limit || 150
    return strategy.rampup_day_6_plus_limit || 200
  }

  /**
   * Algoritmo Batch Agresivo
   */
  private static calculateBatchBatches(
    clients: CollectionClient[],
    executionId: string,
    strategy: DeliveryStrategy,
    timezone: string,
    options?: {
      customBatchSize?: number
      customIntervals?: number[]
      startDate?: Date
      isImmediate?: boolean
    }
  ): ExecutionBatchInsert[] {
    const batches: ExecutionBatchInsert[] = []
    const batchSize = options?.customBatchSize || strategy.batch_size || 100
    const intervalMinutes = strategy.batch_interval_minutes || 60
    const totalClients = clients.length

    let clientIndex = 0
    let batchNumber = 1
    let currentTime = new Date(options?.startDate || new Date())
    const isImmediate = options?.isImmediate

    while (clientIndex < totalClients) {
      const remainingClients = totalClients - clientIndex
      const currentBatchSize = Math.min(batchSize, remainingClients)

      const batchClients = clients.slice(
        clientIndex,
        clientIndex + currentBatchSize
      )
      const clientIds = batchClients.map((c) => c.id)

      // Calcular tiempo base usando la nueva lógica de horarios
      const interval =
        options?.customIntervals?.[batchNumber - 1] ??
        (batchNumber === 1 ? 0 : intervalMinutes)

      let baseTime: Date
      
      if (isImmediate && batches.length > 0) {
        // Para ejecuciones inmediatas con batches previos, usar el último batch + intervalo
        const lastBatch = batches[batches.length - 1]
        const lastScheduledTime = lastBatch.scheduled_for 
          ? new Date(lastBatch.scheduled_for)
          : new Date()
        baseTime = new Date(lastScheduledTime.getTime() + intervalMinutes * 60000)
      } else {
        baseTime = isImmediate 
          ? new Date() 
          : currentTime
      }
      
      const baseScheduledTime = this.calculateSendTime(
        baseTime,
        strategy,
        timezone,
        isImmediate
      )
      
      // Aplicar offset de intervalo (solo si no es inmediato con batches previos)
      const scheduledTime = isImmediate && batches.length > 0
        ? baseScheduledTime
        : new Date(baseScheduledTime.getTime() + interval * 60000)
      
      // Actualizar currentTime para la siguiente iteración (solo modo no inmediato)
      if (!isImmediate) {
        currentTime = scheduledTime
      }

      batches.push({
        execution_id: executionId,
        strategy_id: strategy.id,
        batch_number: batchNumber,
        batch_name: `Batch ${batchNumber} - ${currentBatchSize} clientes`,
        status: 'pending',
        total_clients: batchClients.length,
        client_ids: clientIds,
        scheduled_for: scheduledTime.toISOString(),
        timezone,
      })

      clientIndex += currentBatchSize
      batchNumber++
    }

    return batches
  }

  /**
   * Calcula la hora óptima de envío respetando preferencias de horario
   * Para ejecuciones inmediatas: si está dentro del rango envía ahora, si no programa para el inicio del rango
   * Para ejecuciones programadas: ajusta la hora al rango permitido
   */
  private static calculateSendTime(
    baseDate: Date,
    strategy: DeliveryStrategy,
    timezone: string,
    isImmediate: boolean = false
  ): Date {
    const startHour = strategy.preferred_send_hour_start ?? 9
    const endHour = strategy.preferred_send_hour_end ?? 17
    const avoidWeekends = strategy.avoid_weekends ?? true

    // Convertir a hora local del negocio
    const localDate = new Date(
      baseDate.toLocaleString('en-US', { timeZone: timezone })
    )
    const localHour = localDate.getHours()

    if (isImmediate) {
      // Para ejecuciones inmediatas
      if (localHour >= startHour && localHour <= endHour) {
        // Estamos dentro del rango, enviar ahora
        return baseDate
      } else if (localHour < startHour) {
        // Es antes del inicio, programar para hoy a la hora de inicio
        const scheduledTime = new Date(baseDate)
        scheduledTime.setHours(startHour, 0, 0, 0)
        return scheduledTime
      } else {
        // Es después del fin, programar para mañana a la hora de inicio
        const scheduledTime = new Date(baseDate)
        scheduledTime.setDate(scheduledTime.getDate() + 1)
        scheduledTime.setHours(startHour, 0, 0, 0)

        // Verificar si cae en fin de semana
        if (avoidWeekends) {
          const dayOfWeek = scheduledTime.getDay()
          if (dayOfWeek === 0) {
            // Domingo, mover a lunes
            scheduledTime.setDate(scheduledTime.getDate() + 1)
          } else if (dayOfWeek === 6) {
            // Sábado, mover a lunes
            scheduledTime.setDate(scheduledTime.getDate() + 2)
          }
        }
        return scheduledTime
      }
    } else {
      // Para ejecuciones programadas, ajustar al rango
      const scheduledTime = new Date(baseDate)

      // Si es fin de semana y debemos evitarlo, mover a lunes
      if (avoidWeekends) {
        const dayOfWeek = scheduledTime.getDay()
        if (dayOfWeek === 0) {
          scheduledTime.setDate(scheduledTime.getDate() + 1)
        } else if (dayOfWeek === 6) {
          scheduledTime.setDate(scheduledTime.getDate() + 2)
        }
      }

      // Ajustar hora al rango permitido
      const hour = scheduledTime.getHours()
      if (hour < startHour) {
        scheduledTime.setHours(startHour, 0, 0, 0)
      } else if (hour > endHour) {
        scheduledTime.setHours(startHour, 0, 0, 0)
        scheduledTime.setDate(scheduledTime.getDate() + 1)
      }

      return scheduledTime
    }
  }

  /**
   * Obtiene los batches pendientes de una ejecución
   */
  static async getPendingBatches(
    executionId: string,
    limit: number = 50
  ): Promise<ExecutionBatch[]> {
    const supabase = await getSupabaseAdminClient()

    const { data, error } = await supabase
      .from('execution_batches')
      .select('*')
      .eq('execution_id', executionId)
      .in('status', ['pending', 'queued'])
      .order('batch_number', { ascending: true })
      .limit(limit)

    if (error) {
      throw new Error(`Error fetching pending batches: ${error.message}`)
    }

    return data as ExecutionBatch[]
  }

  /**
   * Actualiza el estado de un batch
   */
  static async updateBatchStatus(
    batchId: string,
    status: ExecutionBatch['status'],
    metrics?: {
      emailsSent?: number
      emailsDelivered?: number
      emailsOpened?: number
      emailsBounced?: number
      errorMessage?: string
    }
  ): Promise<void> {
    const supabase = await getSupabaseAdminClient()

    const updateData: any = { status }

    if (metrics) {
      if (metrics.emailsSent !== undefined)
        updateData.emails_sent = metrics.emailsSent
      if (metrics.emailsDelivered !== undefined)
        updateData.emails_delivered = metrics.emailsDelivered
      if (metrics.emailsOpened !== undefined)
        updateData.emails_opened = metrics.emailsOpened
      if (metrics.emailsBounced !== undefined)
        updateData.emails_bounced = metrics.emailsBounced
      if (metrics.errorMessage !== undefined)
        updateData.error_message = metrics.errorMessage
    }

    if (status === 'processing') {
      updateData.processed_at = new Date().toISOString()
    } else if (status === 'completed') {
      updateData.completed_at = new Date().toISOString()
    }

    const { error } = await supabase
      .from('execution_batches')
      .update(updateData)
      .eq('id', batchId)

    if (error) {
      throw new Error(`Error updating batch status: ${error.message}`)
    }
  }

  /**
   * Asigna batch_id a los collection_clients basándose en los batches creados.
   * Debe llamarse después de crear los batches y antes de iniciar el procesamiento.
   */
  static async assignClientsToBatches(
    clients: CollectionClient[],
    batches: ExecutionBatch[]
  ): Promise<void> {
    const supabase = await getSupabaseAdminClient()

    // Crear un mapa de client_id -> batch_id
    const clientToBatchMap = new Map<string, string>()

    for (const batch of batches) {
      for (const clientId of batch.client_ids) {
        clientToBatchMap.set(clientId, batch.id)
      }
    }

    // Agrupar clients por batch_id para hacer updates masivos
    const batchToClientsMap = new Map<string, string[]>()
    for (const client of clients) {
      const batchId = clientToBatchMap.get(client.id)
      if (batchId) {
        if (!batchToClientsMap.has(batchId)) {
          batchToClientsMap.set(batchId, [])
        }
        batchToClientsMap.get(batchId)!.push(client.id)
      }
    }

    if (batchToClientsMap.size === 0) {
      console.log('[BatchStrategyService] No clients to assign to batches')
      return
    }

    // Realizar updates masivos por batch_id usando rpc para evitar el problema de upsert
    let totalAssigned = 0
    for (const [batchId, clientIds] of batchToClientsMap.entries()) {
      // Procesar en lotes de 100 para evitar queries muy grandes
      const BATCH_SIZE = 100
      for (let i = 0; i < clientIds.length; i += BATCH_SIZE) {
        const batchClientIds = clientIds.slice(i, i + BATCH_SIZE)
        
        const { error } = await supabase
          .from('collection_clients')
          .update({ batch_id: batchId })
          .in('id', batchClientIds)

        if (error) {
          console.error(`[BatchStrategyService] Error assigning batch_id ${batchId} to clients:`, error)
          throw new Error(`Error assigning clients to batches: ${error.message}`)
        }
        
        totalAssigned += batchClientIds.length
      }
    }

    console.log(`[BatchStrategyService] Assigned batch_id to ${totalAssigned} clients across ${batches.length} batches`)
  }

  /**
   * Calcula métricas de progreso de una ejecución
   */
  static async getExecutionProgress(
    executionId: string
  ): Promise<{
    totalBatches: number
    completedBatches: number
    pendingBatches: number
    totalClients: number
    processedClients: number
    completionPercentage: number
    estimatedCompletionTime?: Date
  }> {
    const supabase = await getSupabaseAdminClient()

    const { data: batches, error } = await supabase
      .from('execution_batches')
      .select('*')
      .eq('execution_id', executionId)

    if (error || !batches) {
      return {
        totalBatches: 0,
        completedBatches: 0,
        pendingBatches: 0,
        totalClients: 0,
        processedClients: 0,
        completionPercentage: 0,
      }
    }

    const totalBatches = batches.length
    const completedBatches = batches.filter(
      (b) => b.status === 'completed'
    ).length
    const pendingBatches = batches.filter((b) =>
      ['pending', 'queued', 'processing'].includes(b.status)
    ).length
    const totalClients = batches.reduce((sum, b) => sum + b.total_clients, 0)
    const processedClients = batches
      .filter((b) => b.status === 'completed')
      .reduce((sum, b) => sum + b.emails_sent, 0)

    // Calcular tiempo estimado de finalización
    let estimatedCompletionTime: Date | undefined
    const lastPendingBatch = batches
      .filter((b) => ['pending', 'queued'].includes(b.status))
      .sort((a, b) => {
        const dateA = a.scheduled_for ? new Date(a.scheduled_for).getTime() : 0
        const dateB = b.scheduled_for ? new Date(b.scheduled_for).getTime() : 0
        return dateB - dateA
      })[0]

    if (lastPendingBatch?.scheduled_for) {
      estimatedCompletionTime = new Date(lastPendingBatch.scheduled_for)
    }

    return {
      totalBatches,
      completedBatches,
      pendingBatches,
      totalClients,
      processedClients,
      completionPercentage:
        totalBatches > 0 ? (completedBatches / totalBatches) * 100 : 0,
      estimatedCompletionTime,
    }
  }
}
