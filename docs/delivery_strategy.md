# Sistema de Estrategias de Entrega de Email

## Sistema de Email Batching Inteligente para AWS SES

### Objetivo

Sistema diseñado para maximizar la deliverability de emails de Cartera, evitar carpetas de spam, y escalar desde 50 hasta 50,000+ emails manteniendo una reputación positiva con ISPs.

---

## Arquitectura del Sistema

```
Usuario (Wizard)
       │
       ▼
┌─────────────────────────┐
│  createExecutionWith    │
│  ClientsAction          │
│  (execution-workflow.ts)│
└─────────────────────────┘
       │
       ├─► 1. Crea execution en collection_executions
       ├─► 2. Inserta clientes en collection_clients
       ├─► 3. Crea/actualiza email_reputation_profiles
       ├─► 4. Ejecuta BatchStrategyService.createBatches()
       └─► 5. Encola en SQS via SQSBatchService
       │
       ▼
┌─────────────────────────┐
│   AWS SQS Queue         │
│   (FIFO recomendado)      │
└─────────────────────────┘
       │
       ▼
┌─────────────────────────┐
│  Lambda Consumer          │
│  (collection-email-worker)│
│  - Recibe batch de SQS    │
│  - Obtiene clientes       │
│  - Envía via SES          │
│  - Actualiza métricas     │
└─────────────────────────┘
       │
       ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│      AWS SES            │────►│    SNS Events           │
│   (Email Delivery)      │     │  (delivery/bounce/open) │
└─────────────────────────┘     └─────────────────────────┘
                                          │
                                          ▼
                               ┌─────────────────────────┐
                               │  Lambda Event Handler   │
                               │  Actualiza métricas en  │
                               │  email_reputation_profiles│
                               └─────────────────────────┘
```

---

## Estrategias de Entrega

### 1. ESTRATEGIA RAMP_UP (Conservadora)

**Propósito**: Establecer reputación positiva para nuevos dominios o IPs

**Cuándo usar**:

- Nuevo dominio sin historial de envío
- Nueva IP dedicada de SES
- Dominio con reputación neutral o baja
- Requerimiento de compliance estricto

**Progresión Gradual**:

| Período  | Límite Diario | Batch Size | Intervalo | Días Acumulados |
| -------- | ------------- | ---------- | --------- | --------------- |
| Día 1    | 50 emails     | 25         | 60 min    | 2 batches       |
| Día 2    | 100 emails    | 50         | 60 min    | 4 batches       |
| Días 3-5 | 150 emails    | 75         | 60 min    | 10 batches      |
| Día 6+   | 200 emails    | 100        | 60 min    | Progresivo      |

**Condiciones para Progresar al Siguiente Nivel**:

- Open Rate ≥ 20% (evidencia de engagement)
- Delivery Rate ≥ 95% (mínimo bounces)
- Bounce Rate ≤ 5% (sin problemas de listas)
- Sin complaints registrados
- Completado mínimo 24 horas en nivel actual

**Ejemplo con 4200 Clientes**:

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

**Ventajas**:

- ✅ Mínimo riesgo de spam folders
- ✅ ISPs reconocen comportamiento positivo gradual
- ✅ Recuperación rápida ante bounces
- ✅ Base sólida para escalar posteriormente

**Desventajas**:

- ⏱️ Campañas grandes toman semanas en completar
- 📊 Requiere monitoreo constante de métricas

---

### 2. ESTRATEGIA BATCH (Agresiva)

**Propósito**: Maximizar throughput para dominios con reputación establecida

**Cuándo usar**:

- Dominio con warm-up completado
- Open Rate consistente > 15%
- Bounce Rate < 3%
- Necesidad de velocidad (Cartera urgente)
- Alta confianza en listas de email

**Configuración Típica**:

| Parámetro     | Default    | Mínimo | Máximo  |
| ------------- | ---------- | ------ | ------- |
| Batch Size    | 500 emails | 100    | 1000    |
| Intervalo     | 30 minutos | 10 min | 120 min |
| Batches/día   | 100        | 10     | 200     |
| Concurrentes  | 5 Lambdas  | 1      | 10      |
| Límite diario | 50,000     | 1,000  | 100,000 |

**Ejemplo con 4200 Clientes**:

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

### 3. ESTRATEGIA CONSERVATIVE (Recuperación)

**Propósito**: Recuperar reputación de dominios con problemas

**Cuándo usar**:

- Bounce Rate > 10% en los últimos envíos
- Complaints recibidos
- Emails yendo a spam
- Blacklist en algún ISP
- Revisión activa por parte de AWS SES

**Progresión Ultra-Conservadora**:

| Día | Límite | Batch Size | Intervalo | Requisitos Estrictos  |
| --- | ------ | ---------- | --------- | --------------------- |
| 1-2 | 10-20  | 10         | 2 horas   | 25% opens, 0% bounces |
| 3-5 | 30     | 15         | 2 horas   | 25% opens, <2% bounce |
| 6+  | 50     | 25         | 2 horas   | 25% opens, <1% bounce |

**Comportamiento Especial**:

- Pausa automática ante CUALQUIER bounce > 2%
- Pausa automática ante CUALQUIER complaint
- Auto-resume después de 6 horas solo si métricas mejoran
- Notificación inmediata a administradores

**Ejemplo con 4200 Clientes**:

```
Día 1:   10 clientes   (1 batch)    - Extremadamente cuidadoso
Día 2:   20 clientes   (2 batches)
Día 3:   30 clientes   (2 batches)
...
Día 140: 50 clientes   (último batch)

Tiempo estimado: 4-5 meses (recuperación gradual)
```

**Ventajas**:

- ✅ Máxima seguridad para recuperar trust
- ✅ ISPs ven compromiso genuino de calidad
- ✅ Permite limpiar listas progresivamente

**Desventajas**:

- ⏱️ Tiempo de recuperación muy largo
- 📊 Requiere atención constante

---

## Tablas de Base de Datos

### 1. email_reputation_profiles

Almacena el estado de reputación de cada dominio remitente.

```sql
CREATE TABLE email_reputation_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    domain VARCHAR(255) NOT NULL,
    sending_ip VARCHAR(45),

    -- Estado de warm-up
    is_warmed_up BOOLEAN DEFAULT FALSE,
    warmup_start_date TIMESTAMPTZ,
    warmup_completed_date TIMESTAMPTZ,
    current_warmup_day INTEGER DEFAULT 0,

    -- Métricas acumuladas
    total_emails_sent INTEGER DEFAULT 0,
    total_emails_delivered INTEGER DEFAULT 0,
    total_emails_opened INTEGER DEFAULT 0,
    total_emails_bounced INTEGER DEFAULT 0,
    total_complaints INTEGER DEFAULT 0,

    -- Tasas calculadas (porcentajes)
    delivery_rate DECIMAL(5,2) DEFAULT 0.00,
    open_rate DECIMAL(5,2) DEFAULT 0.00,
    bounce_rate DECIMAL(5,2) DEFAULT 0.00,
    complaint_rate DECIMAL(5,2) DEFAULT 0.00,

    -- Límites dinámicos
    daily_sending_limit INTEGER DEFAULT 50,
    max_sending_limit INTEGER DEFAULT 200,

    -- Estrategia activa
    current_strategy VARCHAR(20) DEFAULT 'ramp_up'
        CHECK (current_strategy IN ('ramp_up', 'batch', 'conservative')),

    -- Flags de alerta
    is_under_review BOOLEAN DEFAULT FALSE,
    has_reputation_issues BOOLEAN DEFAULT FALSE,
    last_issue_date TIMESTAMPTZ,

    -- Umbrales para progresión
    required_open_rate DECIMAL(5,2) DEFAULT 20.00,
    required_delivery_rate DECIMAL(5,2) DEFAULT 95.00,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_domain_per_business UNIQUE (business_id, domain)
);
```

**Campos Clave**:

- `is_warmed_up`: Indica si el dominio completó warm-up
- `current_warmup_day`: Día actual en progresión (1-6+)
- `daily_sending_limit`: Cuota máxima para hoy (cambia según día)
- `current_strategy`: Estrategia aplicada ('ramp_up', 'batch', 'conservative')
- `has_reputation_issues`: Flag de problemas detectados

**Ejemplo de Registro**:

```json
{
  "id": "uuid",
  "business_id": "uuid",
  "domain": "bore.sas",
  "is_warmed_up": false,
  "current_warmup_day": 3,
  "daily_sending_limit": 150,
  "current_strategy": "ramp_up",
  "delivery_rate": 97.5,
  "open_rate": 24.3,
  "bounce_rate": 2.1,
  "total_emails_sent": 300
}
```

---

### 2. delivery_strategies

Configuración parametrizable de estrategias por negocio.

```sql
CREATE TABLE delivery_strategies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,

    name VARCHAR(100) NOT NULL,
    description TEXT,
    strategy_type VARCHAR(20) NOT NULL
        CHECK (strategy_type IN ('ramp_up', 'batch', 'conservative', 'aggressive')),
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,

    -- Configuración Ramp-Up
    rampup_day_1_limit INTEGER DEFAULT 50,
    rampup_day_2_limit INTEGER DEFAULT 100,
    rampup_day_3_5_limit INTEGER DEFAULT 150,
    rampup_day_6_plus_limit INTEGER DEFAULT 200,

    -- Configuración Batch
    batch_size INTEGER DEFAULT 100,
    batch_interval_minutes INTEGER DEFAULT 60,
    max_batches_per_day INTEGER DEFAULT 50,
    concurrent_batches INTEGER DEFAULT 1,

    -- Umbrales de engagement
    min_open_rate_threshold DECIMAL(5,2) DEFAULT 20.00,
    min_delivery_rate_threshold DECIMAL(5,2) DEFAULT 95.00,
    max_bounce_rate_threshold DECIMAL(5,2) DEFAULT 5.00,
    max_complaint_rate_threshold DECIMAL(5,2) DEFAULT 0.10,

    -- Reglas de pausa
    pause_on_high_bounce BOOLEAN DEFAULT TRUE,
    pause_on_complaint BOOLEAN DEFAULT TRUE,
    auto_resume_after_minutes INTEGER DEFAULT 360,

    -- Reintentos
    max_retry_attempts INTEGER DEFAULT 3,
    retry_interval_minutes INTEGER DEFAULT 30,

    -- Preferencias de envío
    respect_timezone BOOLEAN DEFAULT TRUE,
    preferred_send_hour_start INTEGER DEFAULT 9,
    preferred_send_hour_end INTEGER DEFAULT 17,
    avoid_weekends BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users_profile(id)
);
```

**Campos Clave**:

- `strategy_type`: Tipo de estrategia ('ramp_up', 'batch', 'conservative', 'aggressive')
- `is_default`: Estrategia por defecto para el negocio
- `batch_size`: Tamaño de cada grupo (ej: 500)
- `batch_interval_minutes`: Tiempo entre batches (ej: 30)
- `*_threshold`: Umbrales para validar engagement

**Ejemplos de Configuraciones**:

**Estrategia Ramp-Up Estándar**:

```json
{
  "name": "Ramp-Up Gradual Estándar",
  "strategy_type": "ramp_up",
  "rampup_day_1_limit": 50,
  "rampup_day_2_limit": 100,
  "rampup_day_3_5_limit": 150,
  "rampup_day_6_plus_limit": 200,
  "batch_size": 50,
  "batch_interval_minutes": 60,
  "min_open_rate_threshold": 20.0,
  "max_bounce_rate_threshold": 5.0
}
```

**Estrategia Batch Agresivo**:

```json
{
  "name": "Procesamiento Alto Volumen",
  "strategy_type": "batch",
  "batch_size": 500,
  "batch_interval_minutes": 30,
  "max_batches_per_day": 100,
  "concurrent_batches": 5,
  "min_open_rate_threshold": 15.0
}
```

---

### 3. execution_batches

Grupos de clientes creados para envío organizado.

```sql
CREATE TABLE execution_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id UUID NOT NULL REFERENCES collection_executions(id) ON DELETE CASCADE,
    strategy_id UUID REFERENCES delivery_strategies(id),

    batch_number INTEGER NOT NULL,
    batch_name VARCHAR(255),

    status VARCHAR(20) DEFAULT 'pending'
        CHECK (status IN ('pending', 'queued', 'processing', 'completed', 'failed', 'paused')),

    total_clients INTEGER NOT NULL,
    client_ids UUID[] NOT NULL,

    scheduled_for TIMESTAMPTZ,
    processed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    -- Métricas del batch
    emails_sent INTEGER DEFAULT 0,
    emails_delivered INTEGER DEFAULT 0,
    emails_opened INTEGER DEFAULT 0,
    emails_bounced INTEGER DEFAULT 0,
    emails_failed INTEGER DEFAULT 0,

    -- Referencias AWS
    sqs_message_id VARCHAR(255),
    sqs_receipt_handle TEXT,

    error_message TEXT,
    retry_count INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_batch_number_per_execution UNIQUE (execution_id, batch_number)
);
```

**Campos Clave**:

- `execution_id`: ID de la ejecución padre
- `batch_number`: Número secuencial (1, 2, 3...)
- `client_ids`: Array de UUIDs de collection_clients
- `status`: Estado actual del batch
- `scheduled_for`: Cuándo debe ejecutarse
- `sqs_message_id`: ID del mensaje en SQS

**Estados**:

- `pending`: Creado pero no encolado
- `queued`: En cola SQS esperando procesamiento
- `processing`: Lambda está procesando
- `completed`: Todos los emails enviados
- `failed`: Error en procesamiento
- `paused`: Detenido temporalmente

**Ejemplo**:

```json
{
  "id": "uuid-batch-1",
  "execution_id": "uuid-execution",
  "batch_number": 1,
  "batch_name": "Batch 1 - Día 1 Ramp-Up",
  "status": "completed",
  "total_clients": 25,
  "client_ids": ["uuid-1", "uuid-2", ..., "uuid-25"],
  "scheduled_for": "2026-02-02T09:00:00Z",
  "emails_sent": 25,
  "emails_delivered": 24,
  "emails_opened": 6,
  "sqs_message_id": "abc123"
}
```

---

### 4. batch_queue_messages

Tracking de mensajes en cola SQS.

```sql
CREATE TABLE batch_queue_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES execution_batches(id) ON DELETE CASCADE,

    sqs_queue_url TEXT NOT NULL,
    sqs_message_id VARCHAR(255) NOT NULL,
    sqs_receipt_handle TEXT,

    status VARCHAR(20) DEFAULT 'queued'
        CHECK (status IN ('queued', 'in_flight', 'processed', 'failed', 'dlq')),

    payload JSONB,

    sent_at TIMESTAMPTZ DEFAULT NOW(),
    received_at TIMESTAMPTZ,
    processed_at TIMESTAMPTZ,
    visible_at TIMESTAMPTZ,

    receive_count INTEGER DEFAULT 0,
    max_receives INTEGER DEFAULT 3,

    error_message TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_sqs_message UNIQUE (sqs_message_id, sqs_queue_url)
);
```

**Campos Clave**:

- `sqs_message_id`: ID único del mensaje en AWS
- `sqs_receipt_handle`: Necesario para eliminar el mensaje
- `receive_count`: Cuántas veces se ha intentado procesar
- `max_receives`: Límite antes de mover a DLQ (default: 3)
- `visible_at`: Cuándo será visible de nuevo (visibility timeout)

**Flujo de Estados**:

```
queued → in_flight → processed
  ↓         ↓
failed    (timeout)
  ↓         ↓
  └─────► dlq (después de 3 fallos)
```

---

### 5. daily_sending_limits

Control diario de cuotas para estrategia ramp-up.

```sql
CREATE TABLE daily_sending_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reputation_profile_id UUID NOT NULL
        REFERENCES email_reputation_profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,

    daily_limit INTEGER NOT NULL,

    emails_sent INTEGER DEFAULT 0,
    emails_delivered INTEGER DEFAULT 0,
    emails_opened INTEGER DEFAULT 0,
    emails_bounced INTEGER DEFAULT 0,

    limit_reached BOOLEAN DEFAULT FALSE,
    paused_until TIMESTAMPTZ,
    pause_reason VARCHAR(50),

    -- Métricas del día
    day_open_rate DECIMAL(5,2),
    day_delivery_rate DECIMAL(5,2),
    day_bounce_rate DECIMAL(5,2),

    can_progress_to_next_day BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_daily_limit UNIQUE (reputation_profile_id, date)
);
```

**Propósito**:

- Controlar cuántos emails se pueden enviar hoy
- Evitar exceder límites de warm-up
- Trackear métricas diarias para progresión
- Implementar pausas automáticas

**Ejemplo**:

```json
{
  "reputation_profile_id": "uuid-profile",
  "date": "2026-02-02",
  "daily_limit": 150,
  "emails_sent": 150,
  "emails_delivered": 146,
  "emails_opened": 38,
  "day_open_rate": 26.03,
  "day_delivery_rate": 97.33,
  "day_bounce_rate": 2.67,
  "limit_reached": true,
  "can_progress_to_next_day": true
}
```

---

## Servicios Implementados

### EmailReputationService

**Ubicación**: `/lib/services/collection/email-reputation-service.ts`

**Responsabilidades**:

1. Gestión de perfiles de reputación por dominio
2. Control de límites diarios de envío
3. Actualización de métricas (delivery, open, bounce)
4. Evaluación de progresión en warm-up
5. Pausa/reanudación de envíos

**Métodos Principales**:

```typescript
// Obtener o crear perfil de reputación
async getOrCreateReputationProfile(
  supabase: SupabaseClient,
  businessId: string,
  domain: string,
  sendingIp?: string
): Promise<EmailReputationProfile>

// Verificar cuota disponible para hoy
async getRemainingDailyQuota(
  supabase: SupabaseClient,
  reputationProfileId: string,
  date?: Date
): Promise<{
  canSend: boolean
  remaining: number
  dailyLimit: number
  emailsSent: number
}>

// Evaluar si puede progresar al siguiente día
async evaluateWarmupProgression(
  supabase: SupabaseClient,
  reputationProfileId: string,
  date?: Date
): Promise<{
  canProgress: boolean
  currentDay: number
  nextDay: number
  newLimit: number
  reason: string
}>

// Actualizar métricas tras recibir eventos SES
async updateDeliveryMetrics(
  supabase: SupabaseClient,
  reputationProfileId: string,
  metrics: {
    delivered?: number
    opened?: number
    bounced?: number
    complaint?: number
  }
): Promise<void>

// Pausar envíos por problemas
async pauseSending(
  supabase: SupabaseClient,
  reputationProfileId: string,
  reason: string,
  pauseMinutes?: number
): Promise<void>
```

**Ejemplo de Uso**:

```typescript
// Crear perfil para nuevo dominio
const profile = await EmailReputationService.getOrCreateReputationProfile(
  supabase,
  'business-uuid',
  'bore.sas'
)
// Resultado: Perfil con current_warmup_day=1, daily_sending_limit=50

// Verificar si podemos enviar hoy
const quota = await EmailReputationService.getRemainingDailyQuota(
  supabase,
  profile.id
)
if (quota.canSend) {
  console.log(`Podemos enviar ${quota.remaining} emails más hoy`)
}

// Evaluar progresión después de enviar
const progression = await EmailReputationService.evaluateWarmupProgression(
  supabase,
  profile.id
)
if (progression.canProgress) {
  console.log(
    `Progresando al día ${progression.nextDay} con límite ${progression.newLimit}`
  )
}
```

---

### BatchStrategyService

**Ubicación**: `/lib/services/collection/batch-strategy-service.ts`

**Responsabilidades**:

1. Algoritmos de división de clientes en batches
2. Selección de estrategia según reputación
3. Cálculo de tiempos de envío óptimos
4. Tracking de progreso de ejecución

**Métodos Principales**:

```typescript
// Crear batches según estrategia seleccionada
async createBatches(
  supabase: SupabaseClient,
  clients: CollectionClient[],
  executionId: string,
  businessId: string,
  strategyType: StrategyType,
  domain: string,
  options?: {
    customBatchSize?: number
    maxBatchesPerDay?: number
    customIntervals?: number[]
    startDate?: Date
  }
): Promise<ExecutionBatch[]>

// Obtener batches pendientes de procesar
async getPendingBatches(
  supabase: SupabaseClient,
  executionId: string,
  limit?: number
): Promise<ExecutionBatch[]>

// Actualizar estado de un batch
async updateBatchStatus(
  supabase: SupabaseClient,
  batchId: string,
  status: BatchStatus,
  metrics?: {
    emailsSent?: number
    emailsDelivered?: number
    emailsOpened?: number
    emailsBounced?: number
    errorMessage?: string
  }
): Promise<void>

// Obtener métricas de progreso
async getExecutionProgress(
  supabase: SupabaseClient,
  executionId: string
): Promise<{
  totalBatches: number
  completedBatches: number
  pendingBatches: number
  totalClients: number
  processedClients: number
  completionPercentage: number
  estimatedCompletionTime?: Date
}>
```

**Algoritmos**:

#### Algoritmo Ramp-Up

```typescript
function calculateRampUpBatches(clients, executionId, strategy, reputation) {
  const batches = []
  let clientIndex = 0
  let currentDay = new Date()
  let batchNumber = 1
  const warmupDay = reputation.current_warmup_day

  while (clientIndex < clients.length) {
    // Obtener límite para el día actual
    const dailyLimit = getRampUpLimitForDay(
      warmupDay + floor(batchNumber / 2),
      strategy
    )

    // Verificar cuántos ya hemos programado para hoy
    const emailsToday = batches
      .filter((b) => isSameDay(b.scheduled_for, currentDay))
      .reduce((sum, b) => sum + b.total_clients, 0)

    const remainingToday = dailyLimit - emailsToday

    if (remainingToday <= 0) {
      // Pasar al siguiente día
      currentDay.setDate(currentDay.getDate() + 1)
      continue
    }

    // Crear batch
    const batchSize = Math.min(
      strategy.batch_size || 50,
      remainingToday,
      clients.length - clientIndex
    )

    const batchClients = clients.slice(clientIndex, clientIndex + batchSize)

    // Calcular hora de envío (dentro de horario preferido)
    const scheduledTime = calculateSendTime(
      currentDay,
      strategy.preferred_send_hour_start || 9,
      strategy.preferred_send_hour_end || 17,
      strategy.avoid_weekends !== false
    )

    batches.push({
      execution_id: executionId,
      batch_number: batchNumber,
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

#### Algoritmo Batch

```typescript
function calculateBatchBatches(clients, executionId, strategy, options) {
  const batchSize = options?.customBatchSize || strategy.batch_size || 500
  const intervalMinutes = strategy.batch_interval_minutes || 30

  const batches = []
  let currentTime = new Date(options?.startDate || new Date())

  for (let i = 0; i < clients.length; i += batchSize) {
    const batchClients = clients.slice(i, i + batchSize)
    const batchNumber = Math.floor(i / batchSize) + 1

    // Primer batch inmediato, los demás con intervalo
    if (batchNumber > 1) {
      currentTime = new Date(currentTime.getTime() + intervalMinutes * 60000)
    }

    batches.push({
      execution_id: executionId,
      batch_number: batchNumber,
      total_clients: batchClients.length,
      client_ids: batchClients.map((c) => c.id),
      scheduled_for: currentTime.toISOString(),
    })
  }

  return batches
}
```

---

### SQSBatchService

**Ubicación**: `/lib/services/collection/sqs-batch-service.ts`

**Responsabilidades**:

1. Encolar batches en AWS SQS
2. Gestión de dead letter queue
3. Reintentos de batches fallidos
4. Limpieza de mensajes procesados

**Métodos Principales**:

```typescript
// Encolar múltiples batches (usa SendMessageBatch, máx 10 por llamada)
async enqueueBatches(
  supabase: SupabaseClient,
  batches: ExecutionBatch[],
  options?: {
    delaySeconds?: number
    maxConcurrent?: number
  }
): Promise<{
  success: boolean
  queuedCount: number
  failedCount: number
  messages: BatchQueueMessage[]
}>

// Encolar un único batch
async enqueueSingleBatch(
  supabase: SupabaseClient,
  batch: ExecutionBatch,
  delaySeconds?: number
): Promise<BatchQueueMessage | null>

// Eliminar mensaje de SQS tras procesar exitosamente
async deleteMessage(
  supabase: SupabaseClient,
  messageId: string,
  receiptHandle: string
): Promise<boolean>

// Reintentar batches que fallaron
async retryFailedBatches(
  supabase: SupabaseClient,
  executionId: string,
  maxRetries?: number
): Promise<{
  retried: number
  succeeded: number
  failed: number
}>

// Obtener estadísticas de la cola
async getQueueStats(
  supabase: SupabaseClient,
  executionId?: string
): Promise<{
  totalQueued: number
  totalInFlight: number
  totalProcessed: number
  totalFailed: number
  totalInDLQ: number
}>
```

**Ejemplo de Payload SQS**:

```json
{
  "batch_id": "uuid-batch-123",
  "execution_id": "uuid-execution-456",
  "batch_number": 1,
  "client_ids": [
    "uuid-client-1",
    "uuid-client-2",
    ...
  ],
  "total_clients": 50,
  "scheduled_for": "2026-02-02T09:00:00Z"
}
```

---

## Cómo Usar el Sistema

### Crear Ejecución con Estrategia Ramp-Up

```typescript
import { createExecutionWithClientsAction } from '@/lib/actions/collection/execution-workflow'

// Caso: 4200 clientes, dominio nuevo, primer campaña
const result = await createExecutionWithClientsAction({
  executionData: {
    business_id: 'uuid-business',
    created_by: 'uuid-user',
    name: 'Campaña Cartera Febrero - Nuevo Dominio',
    description: 'Primera campaña con bore.sas',
    email_template_id: 'uuid-template',
    execution_mode: 'immediate', // o 'scheduled'
    fallback_enabled: true,
    fallback_days: 3,
  },
  clients: clients, // Array de 4200 clientes
  strategyConfig: {
    strategyType: 'ramp_up', // Conservadora para nuevo dominio
    domain: 'bore.sas', // Dominio remitente
    sendingIp: '192.168.1.1', // Opcional: IP dedicada
    startImmediately: true, // Encolar ahora mismo
  },
})

console.log(result)
// {
//   success: true,
//   executionId: 'uuid-execution',
//   batchesCreated: 84,
//   totalClients: 4200,
//   estimatedCompletionTime: '2026-02-26T17:00:00Z',
//   message: 'Successfully created execution with 84 batches using ramp_up strategy...'
// }
```

### Crear Ejecución con Estrategia Batch

```typescript
// Caso: 4200 clientes, dominio con buena reputación, campaña urgente
const result = await createExecutionWithClientsAction({
  executionData: {
    business_id: 'uuid-business',
    created_by: 'uuid-user',
    name: 'Campaña Cartera Urgente',
    email_template_id: 'uuid-template',
    execution_mode: 'immediate',
  },
  clients: clients, // Array de 4200 clientes
  strategyConfig: {
    strategyType: 'batch', // Agresiva para dominio establecido
    domain: 'bore.sas',
    customBatchSize: 500, // 500 clientes por batch
    customIntervals: [0, 30, 30, 30, 30, 30, 30, 30, 30], // Minutos entre batches
    startImmediately: true,
  },
})

// Resultado: 9 batches, completado en ~4-5 horas
```

### Crear Ejecución Programada

```typescript
// Caso: Programar para el lunes a las 9 AM
const result = await createExecutionWithClientsAction({
  executionData: {
    business_id: 'uuid-business',
    name: 'Campaña Programada Semanal',
    email_template_id: 'uuid-template',
    execution_mode: 'scheduled',
    scheduled_at: '2026-02-05T09:00:00Z', // ISO 8601
  },
  clients: clients,
  strategyConfig: {
    strategyType: 'ramp_up',
    domain: 'bore.sas',
    startImmediately: false, // Esperar al scheduled_at
  },
})

// Los batches se crean ahora pero se encolarán el lunes
```

### Obtener Progreso de Ejecución

```typescript
import { getExecutionProgressAction } from '@/lib/actions/collection/execution-workflow'

const progress = await getExecutionProgressAction('uuid-execution')

console.log(progress)
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

### Reintentar Batches Fallidos

```typescript
import { retryFailedBatchesAction } from '@/lib/actions/collection/execution-workflow'

const retry = await retryFailedBatchesAction('uuid-execution')

console.log(retry)
// {
//   success: true,
//   retried: 3,
//   succeeded: 3,
//   failed: 0,
//   message: 'Retried 3 batches: 3 succeeded, 0 failed'
// }
```

### Verificar Reputación de Dominio

```typescript
import { EmailReputationService } from '@/lib/services/collection/email-reputation-service'

const profile = await EmailReputationService.getReputationProfileById(
  supabase,
  'uuid-reputation-profile'
)

console.log(`Dominio: ${profile.domain}`)
console.log(`Día de warm-up: ${profile.current_warmup_day}`)
console.log(`Límite diario: ${profile.daily_sending_limit}`)
console.log(`Open rate: ${profile.open_rate}%`)
console.log(`Bounce rate: ${profile.bounce_rate}%`)
console.log(`Warmed up: ${profile.is_warmed_up ? 'Sí' : 'No'}`)
```

---

## Configuración AWS

### Variables de Entorno Requeridas

```bash
# AWS General
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...

# SQS Configuration
SQS_BATCH_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/123456789012/collection-batches.fifo
SQS_BATCH_QUEUE_ARN=arn:aws:sqs:us-east-1:123456789012:collection-batches.fifo

# Lambda Configuration
LAMBDA_EMAIL_WORKER_ARN=arn:aws:lambda:us-east-1:123456789012:function:collection-email-worker

# SES Configuration
SES_CONFIGURATION_SET=borls-collection-config
SES_SOURCE_EMAIL=noreply@bore.sas
```

### Crear SQS Queue (CLI)

```bash
# Queue principal (FIFO para orden garantizado)
aws sqs create-queue \
  --queue-name collection-batches.fifo \
  --attributes '{
    "FifoQueue": "true",
    "ContentBasedDeduplication": "true",
    "VisibilityTimeout": "300",
    "MessageRetentionPeriod": "1209600",
    "ReceiveMessageWaitTimeSeconds": "20",
    "RedrivePolicy": "{\"deadLetterTargetArn\":\"arn:aws:sqs:us-east-1:123456789012:collection-batches-dlq.fifo\",\"maxReceiveCount\":\"3\"}"
  }'

# Dead Letter Queue
aws sqs create-queue \
  --queue-name collection-batches-dlq.fifo \
  --attributes '{
    "FifoQueue": "true",
    "MessageRetentionPeriod": "1209600"
  }'
```

### Configurar Lambda Trigger

```bash
# Crear event source mapping (SQS → Lambda)
aws lambda create-event-source-mapping \
  --function-name collection-email-worker \
  --event-source-arn arn:aws:sqs:us-east-1:123456789012:collection-batches.fifo \
  --batch-size 1 \
  --maximum-batching-window-in-seconds 30 \
  --scaling-config '{"maximumConcurrency": 10}' \
  --function-response-types "ReportBatchItemFailures"

# Verificar mapping
aws lambda list-event-source-mappings \
  --function-name collection-email-worker
```

### IAM Policy para Lambda

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "sqs:ReceiveMessage",
        "sqs:DeleteMessage",
        "sqs:GetQueueAttributes",
        "sqs:ChangeMessageVisibility"
      ],
      "Resource": "arn:aws:sqs:us-east-1:123456789012:collection-batches.fifo"
    },
    {
      "Effect": "Allow",
      "Action": ["ses:SendEmail", "ses:SendRawEmail"],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject"],
      "Resource": "arn:aws:s3:::supabase-storage/*"
    }
  ]
}
```

---

## Métricas y Alertas

### KPIs Importantes

| Métrica                   | Objetivo | Alerta si...                   |
| ------------------------- | -------- | ------------------------------ |
| **Delivery Rate**         | > 98%    | < 95% (riesgo de spam)         |
| **Open Rate**             | > 20%    | < 15% (contenido/asunto malo)  |
| **Bounce Rate**           | < 2%     | > 5% (pausar inmediatamente)   |
| **Complaint Rate**        | < 0.1%   | > 0.1% (pausar inmediatamente) |
| **Batch Processing Time** | < 5 min  | > 10 min (revisar Lambda)      |
| **SQS Queue Depth**       | < 100    | > 500 (escalar consumers)      |

### Implementación de Alertas

```typescript
// Ejemplo: Pausar ante bounce alto
async function checkAndAlertMetrics(profileId: string) {
  const profile = await EmailReputationService.getReputationProfileById(
    supabase,
    profileId
  )

  // Alerta: Bounce rate alto
  if (profile.bounce_rate > 5) {
    await EmailReputationService.pauseSending(
      supabase,
      profileId,
      'high_bounce_rate',
      360 // Pausar 6 horas
    )

    await sendSlackAlert({
      channel: '#email-alerts',
      message: `🚨 ALTA: Bounce rate de ${profile.bounce_rate}% en ${profile.domain}. Envíos pausados 6h.`,
      priority: 'high',
    })
  }

  // Alerta: Open rate bajo
  if (profile.open_rate < 15 && profile.total_emails_sent > 100) {
    await sendSlackAlert({
      channel: '#email-alerts',
      message: `⚠️ Open rate bajo: ${profile.open_rate}% en ${profile.domain}. Revisar asunto/contenido.`,
      priority: 'medium',
    })
  }

  // Alerta: Progresión exitosa
  if (profile.current_warmup_day === 6 && profile.is_warmed_up) {
    await sendSlackAlert({
      channel: '#email-alerts',
      message: `✅ Dominio ${profile.domain} completó warm-up. Listo para estrategia batch.`,
      priority: 'low',
    })
  }
}
```

---

## Troubleshooting

### Problema: Emails van a Spam Folder

**Síntomas**:

- Open rate < 10%
- Delivery rate alto pero pocos opens
- Clientes reportan no recibir emails

**Diagnóstico**:

```typescript
const profile = await EmailReputationService.getReputationProfileById(
  supabase,
  profileId
)

console.log(`Bounce rate: ${profile.bounce_rate}%`)
console.log(`Complaint rate: ${profile.complaint_rate}%`)
console.log(`Warmed up: ${profile.is_warmed_up}`)
console.log(`Day: ${profile.current_warmup_day}`)

if (profile.bounce_rate > 5) {
  console.log('❌ Problema: Bounce rate alto')
}

if (!profile.is_warmed_up && profile.current_warmup_day < 3) {
  console.log('❌ Problema: Dominio muy nuevo, necesita más warm-up')
}
```

**Solución**:

1. **Si dominio nuevo** (< día 3 de warm-up):
   - Normal, continuar estrategia ramp_up gradualmente
   - No acelerar, dejar que ISPs establezcan trust

2. **Si bounce rate alto**:

   ```typescript
   // Pausar y limpiar listas
   await EmailReputationService.pauseSending(
     supabase,
     profileId,
     'bounce_investigation',
     1440
   )
   await cleanEmailLists(executionId) // Remover emails inválidos
   await switchToConservativeStrategy(executionId)
   ```

3. **Si complaint rate alto**:
   - Revisar contenido (¿demasiado agresivo?)
   - Revisar asunto (¿parece spam?)
   - Asegurar unsubscribe visible

4. **Si warm-up completado pero sigue a spam**:
   - Verificar SPF/DKIM/DMARC configurados
   - Verificar IP no está en blacklist
   - Contactar AWS SES support

---

### Problema: Batches no se Procesan

**Síntomas**:

- Batches en estado "queued" por horas
- SQS queue depth aumentando
- No hay actividad en Lambda logs

**Diagnóstico**:

```bash
# 1. Verificar queue depth
aws sqs get-queue-attributes \
  --queue-url $SQS_BATCH_QUEUE_URL \
  --attribute-names ApproximateNumberOfMessages \
  --query 'Attributes.ApproximateNumberOfMessages'

# 2. Verificar event source mapping
aws lambda list-event-source-mappings \
  --function-name collection-email-worker \
  --query 'EventSourceMappings[0].State'

# 3. Verificar Lambda logs
aws logs tail /aws/lambda/collection-email-worker --since 1h
```

**Soluciones**:

1. **Event source mapping deshabilitado**:

   ```bash
   aws lambda update-event-source-mapping \
     --uuid <mapping-uuid> \
     --enabled
   ```

2. **Lambda fallando**:
   - Revisar logs en CloudWatch
   - Verificar permisos IAM (¿Lambda puede leer SQS?)
   - Verificar conexión a Supabase

3. **Visibility timeout muy corto**:

   ```bash
   aws sqs set-queue-attributes \
     --queue-url $SQS_BATCH_QUEUE_URL \
     --attributes '{"VisibilityTimeout": "600"}' # 10 minutos
   ```

4. **Batch size muy grande**:
   ```bash
   aws lambda update-event-source-mapping \
     --uuid <mapping-uuid> \
     --batch-size 1
   ```

---

### Problema: Cuota Diaria Agotada

**Síntomas**:

- `canSend: false` en quota check
- Batches programados pero no encolados
- Mensaje "Daily limit reached"

**Diagnóstico**:

```typescript
const quota = await EmailReputationService.getRemainingDailyQuota(
  supabase,
  profileId
)
console.log(`Remaining: ${quota.remaining}/${quota.dailyLimit}`)
console.log(`Can send: ${quota.canSend}`)

// Verificar si hay pausa activa
const dailyLimit = await supabase
  .from('daily_sending_limits')
  .select('paused_until, pause_reason')
  .eq('reputation_profile_id', profileId)
  .single()

if (dailyLimit.paused_until) {
  console.log(`Pausado hasta: ${dailyLimit.paused_until}`)
  console.log(`Razón: ${dailyLimit.pause_reason}`)
}
```

**Soluciones**:

1. **Múltiples ejecuciones simultáneas**:
   - Calcular cuota entre todas las ejecuciones activas
   - Priorizar ejecuciones (manuales > automáticas)
   - Reprogramar batches excedentes para mañana

2. **Pausa automática activa**:

   ```typescript
   // Verificar si podemos reanudar
   if (new Date(dailyLimit.paused_until) < new Date()) {
     await EmailReputationService.resumeSending(supabase, profileId)
   }
   ```

3. **Aumentar límite** (si reputación lo permite):
   ```typescript
   // Solo si métricas son excelentes
   if (profile.open_rate > 25 && profile.bounce_rate < 2) {
     await supabase
       .from('email_reputation_profiles')
       .update({
         daily_sending_limit: Math.min(profile.daily_sending_limit + 50, 200),
       })
       .eq('id', profileId)
   }
   ```

---

## Checklist de Implementación

### Fase 1: Base de Datos ✅

- [x] Ejecutar migración SQL
- [x] Verificar tablas creadas
- [x] Confirmar RLS policies
- [x] Estrategias por defecto insertadas

### Fase 2: Código ✅

- [x] Modelos TypeScript creados
- [x] EmailReputationService implementado
- [x] BatchStrategyService implementado
- [x] SQSBatchService implementado
- [x] Workflow actualizado

### Fase 3: AWS Infrastructure ⏳

- [ ] Crear SQS FIFO Queue
- [ ] Crear Dead Letter Queue
- [ ] Configurar Lambda trigger
- [ ] Actualizar IAM roles
- [ ] Configurar variables de entorno

### Fase 4: Lambda Updates ⏳

- [ ] Modificar collection-email-worker para SQS
- [ ] Agregar manejo de receipt handle
- [ ] Testing con 1 batch
- [ ] Testing con 10 batches

### Fase 5: UI/UX ⏳

- [ ] Selector de estrategia en wizard
- [ ] Mostrar progreso por batch
- [ ] Visualizar reputación de dominio
- [ ] Alertas de warm-up status

### Fase 6: Testing ⏳

- [ ] Test con 50 clientes (ramp_up)
- [ ] Test con 1000 clientes (batch)
- [ ] Verificar métricas de entrega
- [ ] Confirmar progresión de warm-up

---

## Referencias

- [AWS SES Best Practices](https://docs.aws.amazon.com/ses/latest/dg/best-practices.html)
- [SQS Developer Guide](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/)
- [Email Deliverability Guide](https://www.sparkpost.com/resources/email-deliverability-guide/)
- [AWS Lambda SQS Trigger](https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html)

---

**Documento v1.0** | Febrero 2026 | Sistema de Estrategias de Entrega de Email
