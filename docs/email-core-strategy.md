# Sistema de Estrategias de Envío de Correos

## Arquitectura del Sistema de Entrega de Email

### Flujo de Ejecución

```
┌─────────────────┐     ┌──────────────────┐     ┌──────────────┐     ┌─────────────────┐
│   Wizard UI     │────►│  BatchStrategy   │────►│     SQS      │────►│   Lambda SES    │
│  (createBatch)  │     │    Service       │     │    Queue     │     │    Consumer     │
└─────────────────┘     └──────────────────┘     └──────────────┘     └─────────────────┘
                               │                                                  │
                               ▼                                                  ▼
                        ┌──────────────┐                                  ┌─────────────────┐
                        │   Reputation │◄─────────────────────────────────│  SNS Events     │
                        │   Profile    │                                  │  (webhooks)     │
                        └──────────────┘                                  └─────────────────┘
```

El sistema de estrategias de envío de correos está diseñado para maximizar la deliverability de emails de Cartera, evitar carpetas de spam, y escalar desde 50 hasta 50,000+ emails manteniendo una reputación positiva con ISPs.

---

## Jerarquía de Tablas y Métricas

El sistema utiliza múltiples tablas con métricas similares pero propósitos diferentes:

### 1. email_reputation_profiles (Histórico Acumulado)

Almacena el estado de reputación de cada dominio remitente con métricas acumuladas desde su creación.

**Alcance**: Métricas ACUMULADAS históricas de TODOS los envíos del dominio.

**Campos clave**:

- `id`: UUID primary key
- `business_id`: Referencia al negocio
- `domain`: Dominio remitente (ej: bore.sas)
- `is_warmed_up`: Indica si el dominio completó warm-up
- `current_warmup_day`: Día actual en progresión (1-6+)
- `daily_sending_limit`: Cuota máxima para hoy
- `current_strategy`: Estrategia activa ('ramp_up', 'batch', 'conservative')
- `total_emails_sent`: Total histórico de emails enviados
- `total_emails_delivered`: Total histórico entregados
- `total_emails_opened`: Total histórico abiertos
- `total_emails_bounced`: Total histórico rebotados
- `delivery_rate`: Porcentaje de entrega = (delivered / sent) \* 100
- `open_rate`: Porcentaje de apertura
- `bounce_rate`: Porcentaje de rebote
- `has_reputation_issues`: Flag de problemas detectados

### 2. daily_sending_limits (Por Día Específico)

Controla los límites de envío para cada día y dominio.

**Alcance**: Métricas por DÍA específico para un dominio.

**Campos clave**:

- `reputation_profile_id`: FK al perfil de reputación
- `date`: Fecha del tracking (YYYY-MM-DD)
- `daily_limit`: Máximo permitido para este día
- `emails_sent`: Enviados hoy
- `emails_delivered`: Entregados hoy
- `emails_opened`: Abiertos hoy
- `day_open_rate`: Porcentaje de opens del día
- `day_delivery_rate`: Porcentaje de delivery del día
- `can_progress_to_next_day`: Si cumple umbrales para avanzar

### 3. execution_batches (Por Grupo Específico)

Grupos de clientes para envío organizado y rate-limited.

**Alcance**: Métricas GRANULARES por grupo específico de clientes.

**Campos clave**:

- `execution_id`: FK a la ejecución padre
- `batch_number`: Número secuencial (1, 2, 3...)
- `status`: Estado del batch ('pending', 'queued', 'processing', 'completed', 'failed', 'paused')
- `total_clients`: Total de clientes en el batch
- `client_ids`: Array de UUIDs de clientes
- `scheduled_for`: Cuándo debe ejecutarse
- `emails_sent`: Emails intentados en este batch
- `emails_delivered`: Entregados en este batch
- `emails_opened`: Abiertos en este batch
- `emails_bounced`: Rebotados en este batch

### 4. delivery_strategies (Configuración)

Configuración parametrizable de estrategias por negocio.

**Campos clave**:

- `business_id`: FK al negocio
- `strategy_type`: Tipo ('ramp_up', 'batch', 'conservative', 'aggressive')
- `is_default`: Estrategia por defecto
- `rampup_day_1_limit`, `rampup_day_2_limit`, etc.: Límites por día
- `batch_size`: Tamaño de cada grupo
- `batch_interval_minutes`: Tiempo entre batches
- `min_open_rate_threshold`: 20% mínimo
- `min_delivery_rate_threshold`: 95% mínimo
- `max_bounce_rate_threshold`: 5% máximo

---

## Las 3 Estrategias Principales

| Estrategia       | Uso                        | Límite Diario  | Batch Size | Tiempo 4200 clientes |
| ---------------- | -------------------------- | -------------- | ---------- | -------------------- |
| **ramp_up**      | Dominios nuevos            | 50→100→150→200 | 50         | ~26 días             |
| **batch**        | Dominios establecidos      | Ilimitado      | 500        | ~4-5 horas           |
| **conservative** | Recuperación de reputación | 10→20→30→50    | 10         | ~4-5 meses           |

---

## Estrategia RAMP_UP (Conservadora)

### Propósito

Establecer reputación positiva para nuevos dominios o IPs.

### Cuándo usar

- Nuevo dominio sin historial de envío
- Nueva IP dedicada de SES
- Dominio con reputación neutral o baja
- Requerimiento de compliance estricto

### Progresión Gradual

| Período  | Límite Diario | Batch Size | Intervalo | Días Acumulados |
| -------- | ------------- | ---------- | --------- | --------------- |
| Día 1    | 50 emails     | 25         | 60 min    | 2 batches       |
| Día 2    | 100 emails    | 50         | 60 min    | 4 batches       |
| Días 3-5 | 150 emails    | 75         | 60 min    | 10 batches      |
| Día 6+   | 200 emails    | 100        | 60 min    | Progresivo      |

### Condiciones para progresar al siguiente nivel

- Open Rate ≥ 20% (evidencia de engagement)
- Delivery Rate ≥ 95% (mínimo bounces)
- Bounce Rate ≤ 5% (sin problemas de listas)
- Sin complaints registrados
- Completado mínimo 24 horas en nivel actual

### Ejemplo con 4200 clientes

```
Día 1:   50 clientes  (2 batches)   - Total: 50
Día 2:   100 clientes (2 batches)   - Total: 150
Día 3:   150 clientes (2 batches)   - Total: 300
Día 4:   150 clientes (2 batches)   - Total: 450
Día 5:   150 clientes (2 batches)   - Total: 600
Día 6:   200 clientes (2 batches)   - Total: 800
...
Día 26:  200 clientes (último batch) - Total: 4200

Tiempo estimado: 26 días (con progresión exitosa)
Batches totales: 84
```

### Ventajas y desventajas

**Ventajas**:

- ✅ Mínimo riesgo de spam folders
- ✅ ISPs reconocen comportamiento positivo gradual
- ✅ Recuperación rápida ante bounces
- ✅ Base sólida para escalar posteriormente

**Desventajas**:

- ⏱️ Campañas grandes toman semanas en completar
- 📊 Requiere monitoreo constante de métricas

---

## Estrategia BATCH (Agresiva)

### Propósito

Maximizar throughput para dominios con reputación establecida.

### Cuándo usar

- Dominio con warm-up completado
- Open Rate consistente > 15%
- Bounce Rate < 3%
- Necesidad de velocidad (Cartera urgente)
- Alta confianza en listas de email

### Configuración típica

| Parámetro     | Default    | Mínimo | Máximo  |
| ------------- | ---------- | ------ | ------- |
| Batch Size    | 500 emails | 100    | 1000    |
| Intervalo     | 30 minutos | 10 min | 120 min |
| Batches/día   | 100        | 10     | 200     |
| Concurrentes  | 5 Lambdas  | 1      | 10      |
| Límite diario | 50,000     | 1,000  | 100,000 |

### Ejemplo con 4200 clientes

```
Configuración: batch_size=500, interval=30min

Batch 1  (T+0min):    500 clientes  - Procesando
Batch 2  (T+30min):   500 clientes  - En cola
Batch 3  (T+60min):   500 clientes  - En cola
Batch 4  (T+90min):   500 clientes  - En cola
Batch 5  (T+120min):  500 clientes  - En cola
Batch 6  (T+150min):  500 clientes  - En cola
Batch 7  (T+180min):  500 clientes  - En cola
Batch 8  (T+210min):  500 clientes  - En cola
Batch 9  (T+240min):  200 clientes  - En cola (último)

Tiempo estimado: 4-5 horas
Batches totales: 9
```

### Ventajas y desventajas

**Ventajas**:

- ✅ Alta velocidad de procesamiento
- ✅ Eficiente para campañas urgentes
- ✅ Mejor uso de recursos AWS
- ✅ Costos más bajos (menos días = menos cómputo)

**Desventajas**:

- ⚠️ Requiere reputación establecida
- ⚠️ Mayor riesgo si listas no están limpias
- ⚠️ Difícil recuperación si hay problemas

---

## Estrategia CONSERVATIVE (Recuperación)

### Propósito

Recuperar reputación de dominios con problemas.

### Cuándo usar

- Bounce Rate > 10% en los últimos envíos
- Complaints recibidos
- Emails yendo a spam
- Blacklist en algún ISP
- Revisión activa por parte de AWS SES

### Progresión ultra-conservadora

| Día | Límite | Batch Size | Intervalo | Requisitos estrictos  |
| --- | ------ | ---------- | --------- | --------------------- |
| 1-2 | 10-20  | 10         | 2 horas   | 25% opens, 0% bounces |
| 3-5 | 30     | 15         | 2 horas   | 25% opens, <2% bounce |
| 6+  | 50     | 25         | 2 horas   | 25% opens, <1% bounce |

### Comportamiento especial

- Pausa automática ante CUALQUIER bounce > 2%
- Pausa automática ante CUALQUIER complaint
- Auto-resume después de 6 horas solo si métricas mejoran
- Notificación inmediata a administradores

### Ejemplo con 4200 clientes

```
Día 1:   10 clientes   (1 batch)    - Extremadamente cuidadoso
Día 2:   20 clientes   (2 batches)
Día 3:   30 clientes   (2 batches)
...
Día 140: 50 clientes   (último batch)

Tiempo estimado: 4-5 meses (recuperación gradual)
```

### Ventajas y desventajas

**Ventajas**:

- ✅ Máxima seguridad para recuperar trust
- ✅ ISPs ven compromiso genuino de calidad
- ✅ Permite limpiar listas progresivamente

**Desventajas**:

- ⏱️ Tiempo de recuperación muy largo
- 📊 Requiere atención constante

---

## Proceso de Creación de Batches

### Flujo principal (`batch-strategy-service.ts:145-269`)

```typescript
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
  }
): Promise<ExecutionBatch[]>
```

### Paso 1: Obtener perfil de reputación

```typescript
const reputationProfile =
  await EmailReputationService.getOrCreateReputationProfile(businessId, domain)
```

El perfil contiene:

- `current_warmup_day`: Día actual (1-6+)
- `daily_sending_limit`: Cuota máxima para hoy
- `is_warmed_up`: Si completó warm-up

### Paso 2: Obtener estrategia configurada

```typescript
let strategy: DeliveryStrategy

if (options?.strategyId) {
  // Usar estrategia específica por ID
  const { data: strategyById } = await supabase
    .from('delivery_strategies')
    .select('*')
    .eq('id', options.strategyId)
    .single()

  strategy = strategyById
} else {
  // Buscar por tipo o usar default
  strategy = await this.getDefaultStrategy(businessId)
}
```

### Paso 3: Verificar cuota disponible

```typescript
const quotaInfo = await EmailReputationService.getRemainingDailyQuota(
  reputationProfile.id,
  options?.startDate || new Date()
)
// Retorna: { canSend, remaining, dailyLimit, emailsSent }
```

### Paso 4: Seleccionar algoritmo según tipo

```typescript
switch (strategy.strategy_type) {
  case 'ramp_up':
  case 'conservative':
    batches = this.calculateRampUpBatches(
      clients,
      executionId,
      strategy,
      reputation
    )
    break

  case 'batch':
  case 'aggressive':
    batches = this.calculateBatchBatches(
      clients,
      executionId,
      strategy,
      options
    )
    break
}
```

### Paso 5: Persistir batches en BD

```typescript
const { data: createdBatches, error } = await supabase
  .from('execution_batches')
  .insert(batches)
  .select()
```

---

## Algoritmo Ramp-Up (`batch-strategy-service.ts:274-363`)

```typescript
private static calculateRampUpBatches(
  clients: CollectionClient[],
  executionId: string,
  strategy: DeliveryStrategy,
  reputationProfile: { id, current_warmup_day, daily_sending_limit },
  quotaInfo: { canSend, remaining, dailyLimit }
): ExecutionBatchInsert[]
```

### Lógica de división

```typescript
function calculateRampUpBatches(clients, executionId, strategy, reputation) {
  const batches = []
  let clientIndex = 0
  let currentDay = new Date()
  let batchNumber = 1

  while (clientIndex < clients.length) {
    // Determinar límite para el día actual
    const warmupDay = reputation.current_warmup_day
    const dailyLimit = getRampUpLimitForDay(
      warmupDay + floor(batchNumber / 2),
      strategy
    )

    // Calcular cuántos ya programamos para hoy
    const scheduledToday = batches
      .filter((b) => isSameDay(b.scheduled_for, currentDay))
      .reduce((sum, b) => sum + b.total_clients, 0)

    const remainingToday = dailyLimit - scheduledToday

    if (remainingToday <= 0) {
      // Pasar al siguiente día
      currentDay.setDate(currentDay.getDate() + 1)
      continue
    }

    // Calcular tamaño del batch
    const batchSize = Math.min(
      strategy.batch_size || 50,
      remainingToday,
      clients.length - clientIndex
    )

    // Seleccionar clientes
    const batchClients = clients.slice(clientIndex, clientIndex + batchSize)

    // Calcular hora de envío (horario laboral)
    const scheduledTime = calculateSendTime(
      currentDay,
      strategy.preferred_send_hour_start || 9,
      strategy.preferred_send_hour_end || 17,
      strategy.avoid_weekends !== false
    )

    batches.push({
      execution_id: executionId,
      batch_number: batchNumber,
      batch_name: `Batch ${batchNumber} - Día ${floor((batchNumber - 1) / 2) + 1} Ramp-Up`,
      status: 'pending',
      total_clients: batchSize,
      client_ids: batchClients.map((c) => c.id),
      scheduled_for: scheduledTime.toISOString(),
    })

    clientIndex += batchSize
    batchNumber++
  }

  return batches
}
```

### Determinar límite por día

```typescript
private static getRampUpLimitForDay(day: number, strategy: DeliveryStrategy): number {
  if (day === 1) return strategy.rampup_day_1_limit || 50
  if (day === 2) return strategy.rampup_day_2_limit || 100
  if (day >= 3 && day <= 5) return strategy.rampup_day_3_5_limit || 150
  return strategy.rampup_day_6_plus_limit || 200
}
```

### Calcular hora de envío óptima

```typescript
private static calculateSendTime(date: Date, startHour, endHour, avoidWeekends): Date {
  let sendTime = new Date(date)

  // Si es fin de semana y debemos evitarlo, mover a lunes
  if (avoidWeekends) {
    const dayOfWeek = sendTime.getDay()
    if (dayOfWeek === 0) {  // Domingo
      sendTime.setDate(sendTime.getDate() + 1)
    } else if (dayOfWeek === 6) {  // Sábado
      sendTime.setDate(sendTime.getDate() + 2)
    }
  }

  // Establecer hora dentro del rango preferido
  const currentHour = sendTime.getHours()
  if (currentHour < startHour) {
    sendTime.setHours(startHour, 0, 0, 0)
  } else if (currentHour > endHour) {
    sendTime.setHours(startHour, 0, 0, 0)
    sendTime.setDate(sendTime.getDate() + 1)
  }

  return sendTime
}
```

---

## Algoritmo Batch (`batch-strategy-service.ts:381-437`)

```typescript
private static calculateBatchBatches(
  clients: CollectionClient[],
  executionId: string,
  strategy: DeliveryStrategy,
  options?: { customBatchSize, customIntervals, startDate }
): ExecutionBatchInsert[]
```

### Lógica de división

```typescript
function calculateBatchBatches(clients, executionId, strategy, options) {
  const batches = []
  const batchSize = options?.customBatchSize || strategy.batch_size || 100
  const intervalMinutes = strategy.batch_interval_minutes || 60

  let clientIndex = 0
  let batchNumber = 1
  let currentTime = new Date(options?.startDate || new Date())

  while (clientIndex < clients.length) {
    const currentBatchSize = Math.min(batchSize, clients.length - clientIndex)

    const batchClients = clients.slice(
      clientIndex,
      clientIndex + currentBatchSize
    )

    // Calcular intervalo (primer batch inmediato, demás con delay)
    const interval =
      options?.customIntervals?.[batchNumber - 1] ??
      (batchNumber === 1 ? 0 : intervalMinutes)

    if (interval > 0) {
      currentTime = new Date(currentTime.getTime() + interval * 60000)
    }

    batches.push({
      execution_id: executionId,
      batch_number: batchNumber,
      batch_name: `Batch ${batchNumber} - ${currentBatchSize} clientes`,
      status: 'pending',
      total_clients: currentBatchSize,
      client_ids: batchClients.map((c) => c.id),
      scheduled_for: currentTime.toISOString(),
    })

    clientIndex += currentBatchSize
    batchNumber++
  }

  return batches
}
```

---

## Evaluación de Progresión de Warm-Up

### Evaluación automática (`email-reputation-service.ts:291-395`)

```typescript
static async evaluateWarmupProgression(
  reputationProfileId: string,
  date: Date = new Date()
): Promise<{
  canProgress: boolean
  currentDay: number
  nextDay: number
  newLimit: number
  reason: string
}>
```

### Lógica de evaluación

```typescript
async function evaluateWarmupProgression(profileId) {
  const profile = await this.getReputationProfileById(profileId)
  const dailyLimit = await this.getDailyLimit(profileId, today)

  // Obtener métricas del día
  const openRate = dailyLimit.day_open_rate || 0
  const deliveryRate = dailyLimit.day_delivery_rate || 0
  const bounceRate = dailyLimit.day_bounce_rate || 0

  // Validar umbrales
  const meetsOpenRate = openRate >= profile.required_open_rate // ≥20%
  const meetsDeliveryRate = deliveryRate >= profile.required_delivery_rate // ≥95%
  const meetsBounceRate = bounceRate <= 5.0 // ≤5%

  if (!meetsOpenRate) {
    return {
      canProgress: false,
      reason: `Open rate too low: ${openRate}% (required: ${profile.required_open_rate}%)`,
    }
  }

  if (!meetsDeliveryRate) {
    return {
      canProgress: false,
      reason: `Delivery rate too low: ${deliveryRate}% (required: ${profile.required_delivery_rate}%)`,
    }
  }

  if (!meetsBounceRate) {
    return {
      canProgress: false,
      reason: `Bounce rate too high: ${bounceRate}% (max: 5%)`,
    }
  }

  // Calcular nuevo día y límite
  const currentDay = profile.current_warmup_day
  const nextDay = currentDay + 1
  let newLimit = profile.daily_sending_limit

  if (nextDay === 2) newLimit = 100
  else if (nextDay >= 3 && nextDay <= 5) newLimit = 150
  else if (nextDay >= 6) newLimit = Math.min(200, profile.max_sending_limit)

  const isWarmedUp = nextDay >= 6 && newLimit >= 200

  // Actualizar perfil
  await supabase
    .from('email_reputation_profiles')
    .update({
      current_warmup_day: nextDay,
      daily_sending_limit: newLimit,
      is_warmed_up: isWarmedUp,
      warmup_completed_date: isWarmedUp ? new Date() : null,
    })
    .eq('id', profileId)

  return {
    canProgress: true,
    currentDay,
    nextDay,
    newLimit,
    reason: `All metrics passed: Open ${openRate}%, Delivery ${deliveryRate}%, Bounce ${bounceRate}%`,
  }
}
```

---

## Estados de un Batch

| Estado       | Descripción                                      |
| ------------ | ------------------------------------------------ |
| `pending`    | Creado, esperando ser encolado                   |
| `queued`     | En SQS, esperando Lambda                         |
| `processing` | Lambda consumiendo actualmente                   |
| `completed`  | Todos los emails enviados exitosamente           |
| `failed`     | Error en procesamiento                           |
| `paused`     | Detenido temporalmente por bounce alto/complaint |

---

## Servicios Principales

### BatchStrategyService

**Ubicación**: `/lib/services/collection/batch-strategy-service.ts`

**Responsabilidades**:

1. Algoritmos de división de clientes en batches
2. Selección de estrategia según reputación
3. Cálculo de tiempos de envío óptimos
4. Tracking de progreso de ejecución

**Métodos principales**:

```typescript
// Crear batches según estrategia seleccionada
static async createBatches(
  clients,
  executionId,
  businessId,
  strategyType,
  domain,
  options?
): Promise<ExecutionBatch[]>

// Obtener batches pendientes de procesar
static async getPendingBatches(executionId, limit?): Promise<ExecutionBatch[]>

// Actualizar estado de un batch
static async updateBatchStatus(
  batchId,
  status,
  metrics?
): Promise<void>

// Obtener métricas de progreso
static async getExecutionProgress(executionId): Promise<{
  totalBatches,
  completedBatches,
  pendingBatches,
  totalClients,
  processedClients,
  completionPercentage,
  estimatedCompletionTime?
}>
```

### EmailReputationService

**Ubicación**: `/lib/services/collection/email-reputation-service.ts`

**Responsabilidades**:

1. Gestión de perfiles de reputación por dominio
2. Control de límites diarios de envío
3. Actualización de métricas (delivery, open, bounce)
4. Evaluación de progresión en warm-up
5. Pausa/reanudación de envíos

**Métodos principales**:

```typescript
// Obtener o crear perfil de reputación
static async getOrCreateReputationProfile(
  businessId,
  domain,
  provider?,
  sendingIp?
): Promise<EmailReputationProfile>

// Verificar cuota disponible para hoy
static async getRemainingDailyQuota(
  reputationProfileId,
  date?
): Promise<{ canSend, remaining, dailyLimit, emailsSent }>

// Evaluar si puede progresar al siguiente día
static async evaluateWarmupProgression(
  reputationProfileId,
  date?
): Promise<{ canProgress, currentDay, nextDay, newLimit, reason }>

// Actualizar métricas tras recibir eventos SES
static async updateDeliveryMetrics(
  reputationProfileId,
  metrics: { delivered?, opened?, bounced?, complaint? }
): Promise<void>

// Pausar envíos por problemas
static async pauseSending(
  reputationProfileId,
  reason,
  pauseMinutes?
): Promise<void>

// Reanudar envíos manualmente
static async resumeSending(reputationProfileId): Promise<void>
```

---

## Ejemplos de Uso

### Crear ejecución con estrategia Ramp-Up

```typescript
const result = await createExecutionWithClientsAction({
  executionData: {
    business_id: 'uuid-business',
    created_by: 'uuid-user',
    name: 'Campaña Cartera Febrero - Nuevo Dominio',
    description: 'Primera campaña con bore.sas',
    email_template_id: 'uuid-template',
    execution_mode: 'immediate',
    fallback_enabled: true,
    fallback_days: 3,
  },
  clients: clients, // Array de 4200 clientes
  strategyConfig: {
    strategyType: 'ramp_up', // Conservadora para nuevo dominio
    domain: 'bore.sas',
    sendingIp: '192.168.1.1',
    startImmediately: true,
  },
})

// Resultado:
// {
//   success: true,
//   executionId: 'uuid-execution',
//   batchesCreated: 84,
//   totalClients: 4200,
//   estimatedCompletionTime: '2026-02-26T17:00:00Z',
//   message: 'Successfully created execution with 84 batches...'
// }
```

### Crear ejecución con estrategia Batch

```typescript
const result = await createExecutionWithClientsAction({
  executionData: {
    business_id: 'uuid-business',
    created_by: 'uuid-user',
    name: 'Campaña Cartera Urgente',
    email_template_id: 'uuid-template',
    execution_mode: 'immediate',
  },
  clients: clients,
  strategyConfig: {
    strategyType: 'batch', // Agresiva para dominio establecido
    domain: 'bore.sas',
    customBatchSize: 500,
    customIntervals: [0, 30, 30, 30, 30, 30, 30, 30, 30],
    startImmediately: true,
  },
})

// Resultado: 9 batches, completado en ~4-5 horas
```

### Obtener progreso de ejecución

```typescript
const progress = await getExecutionProgressAction('uuid-execution')

// {
//   success: true,
//   progress: {
//     totalBatches: 84,
//     completedBatches: 12,
//     pendingBatches: 72,
//     totalClients: 4200,
//     processedClients: 600,
//     completionPercentage: 14.29,
//     estimatedCompletionTime: '2026-02-26T17:00:00Z',
//     queueStats: {
//       totalQueued: 84,
//       totalInFlight: 2,
//       totalProcessed: 10,
//       totalFailed: 0
//     }
//   }
// }
```

---

## Consistencia de Métricas

### Relación jerárquica

```
daily_sending_limits (día) → email_reputation_profiles (dominio acumulado)
     ↓
execution_batches (grupos) → collection_executions (ejecución agregada)
```

### Consistencia requerida

- `collection_executions.emails_sent` = SUM(`execution_batches.emails_sent`) WHERE execution_id = X
- `email_reputation_profiles.total_*` = SUM(`daily_sending_limits.*`) WHERE reputation_profile_id = X

### Vista de verificación

```sql
CREATE VIEW execution_metrics_consistency_check AS
SELECT
  ce.id as execution_id,
  ce.emails_sent as exec_emails_sent,
  COALESCE(ebp.emails_sent, 0) as batch_emails_sent,
  ce.emails_sent - COALESCE(ebp.emails_sent, 0) as diff_sent,
  CASE
    WHEN ce.emails_sent = COALESCE(ebp.emails_sent, 0)
    THEN TRUE
    ELSE FALSE
  END as is_consistent
FROM collection_executions ce
LEFT JOIN execution_batch_progress ebp ON ce.id = ebp.execution_id
WHERE ce.status IN ('processing', 'completed', 'failed')
  AND ce.emails_sent > 0;
```

---

## KPIs y Alertas

### Métricas objetivo

| Métrica                   | Objetivo | Alerta si...                   |
| ------------------------- | -------- | ------------------------------ |
| **Delivery Rate**         | > 98%    | < 95% (riesgo de spam)         |
| **Open Rate**             | > 20%    | < 15% (contenido/asunto malo)  |
| **Bounce Rate**           | < 2%     | > 5% (pausar inmediatamente)   |
| **Complaint Rate**        | < 0.1%   | > 0.1% (pausar inmediatamente) |
| **Batch Processing Time** | < 5 min  | > 10 min (revisar Lambda)      |
| **SQS Queue Depth**       | < 100    | > 500 (escalar consumers)      |

### Umbrales para progresión

| Umbral                | Valor | Descripción                         |
| --------------------- | ----- | ----------------------------------- |
| Open Rate mínimo      | 20%   | Engagement requerido para progresar |
| Delivery Rate mínimo  | 95%   | Entregas exitosas requerido         |
| Bounce Rate máximo    | 5%    | Límite para continuar envíos        |
| Complaint Rate máximo | 0.1%  | Pausa inmediata si se excede        |

---

## Troubleshooting

### Emails van a Spam Folder

**Síntomas**:

- Open rate < 10%
- Delivery rate alto pero pocos opens
- Clientes reportan no recibir emails

**Diagnóstico**:

```typescript
const profile = await EmailReputationService.getReputationProfileById(profileId)

if (profile.bounce_rate > 5) {
  console.log('Problema: Bounce rate alto')
}

if (!profile.is_warmed_up && profile.current_warmup_day < 3) {
  console.log('Problema: Dominio muy nuevo')
}
```

**Solución**:

1. Si dominio nuevo (< día 3): Normal, continuar ramp_up gradualmente
2. Si bounce rate alto: Pausar y limpiar listas
3. Si complaint rate alto: Revisar contenido y asunto

### Cuota diaria agotada

**Síntomas**:

- `canSend: false` en quota check
- Batches programados pero no encolados

**Diagnóstico**:

```typescript
const quota = await EmailReputationService.getRemainingDailyQuota(profileId)
console.log(`Remaining: ${quota.remaining}/${quota.dailyLimit}`)

if (dailyLimit.paused_until) {
  console.log(`Pausado hasta: ${dailyLimit.paused_until}`)
  console.log(`Razón: ${dailyLimit.pause_reason}`)
}
```

**Solución**:

1. Si múltiples ejecuciones: Priorizar y reprogramar excedentes
2. Si pausa activa: Verificar si podemos reanudar
3. Si métricas excelentes: Aumentar límite gradualmente

---

## Documentos Relacionados

- `delivery_strategy.md`: Documentación detallada completa
- `email_batching_system.md`: Arquitectura del sistema de batching
- `email_provider_README.md`: Configuración de proveedores
- `email_provider_architecture.md`: Arquitectura de proveedores email

---

**Última actualización**: Febrero 2026
