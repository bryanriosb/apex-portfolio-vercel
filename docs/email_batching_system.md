# Sistema de Email Batching Inteligente - Documentación Técnica

## Resumen Ejecutivo

Sistema implementado para gestión de cobranza escalable con AWS SES, diseñado para maximizar deliverability y evitar spam folders mediante estrategias inteligentes de batching.

## 🎯 Objetivos Alcanzados

✅ **Evitar Spam Folders**: Estrategia Ramp-Up gradual para nuevos dominios  
✅ **Escalabilidad**: Soporta de 50 a 50,000+ emails por campaña  
✅ **Observabilidad**: Tracking completo de métricas de entrega  
✅ **Flexibilidad**: Estrategias configurables (Ramp-Up, Batch, Conservative)  
✅ **Resiliencia**: SQS + Dead Letter Queue para manejo de fallos  

---

## 🏗️ Arquitectura del Sistema

### Flujo de Datos

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Usuario       │────▶│  Execution       │────▶│  Collection     │
│   (Wizard)      │     │  Workflow        │     │  Clients        │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  BatchStrategyService│
                    │  ┌───────────────┐  │
                    │  │ Algoritmo     │  │
                    │  │ Ramp-Up/Batch │  │
                    │  └───────────────┘  │
                    └─────────────────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  Execution Batches  │
                    │  (Grupos de         │
                    │   50-500 clientes)  │
                    └─────────────────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  SQSBatchService    │
                    │  (Encolado en SQS)  │
                    └─────────────────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  AWS SQS Queue      │
                    │  (FIFO/Distributed) │
                    └─────────────────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  Lambda Consumer    │
                    │  (Procesa batches)  │
                    └─────────────────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  AWS SES            │
                    │  (Envío de emails)  │
                    └─────────────────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  SNS Events         │
                    │  (Delivery/Bounce)  │
                    └─────────────────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  Metric Updates     │
                    │  (Open/Delivery %)  │
                    └─────────────────────┘
```

---

## 📊 Estrategias Implementadas

### 1. Estrategia RAMP_UP (Conservadora)

**Uso**: Nuevos dominios o IPs sin historial de envío

| Día | Límite Diario | Batch Size | Intervalo |
|-----|---------------|------------|-----------|
| 1   | 50 emails     | 25         | 60 min    |
| 2   | 100 emails    | 50         | 60 min    |
| 3-5 | 150 emails    | 75         | 60 min    |
| 6+  | 200 emails    | 100        | 60 min    |

**Condiciones de Progresión**:
- Open Rate > 20%
- Delivery Rate > 95%
- Bounce Rate < 5%
- Sin complaints

**Ejemplo con 4200 clientes**:
```
Día 1: 50 clientes (2 batches de 25)
Día 2: 100 clientes (2 batches de 50)
Día 3: 150 clientes (2 batches de 75)
Día 4: 150 clientes
Día 5: 150 clientes
Día 6: 200 clientes
...
Día 26: 200 clientes (último batch)
Total: ~26 días para completar
```

### 2. Estrategia BATCH (Agresiva)

**Uso**: Dominios con reputación establecida (warm-up completado)

| Parámetro | Valor Default | Configurable |
|-----------|---------------|--------------|
| Batch Size | 500 emails | 100-1000 |
| Intervalo | 30 minutos | 15-120 min |
| Batches/día | 100 | 10-200 |
| Concurrentes | 5 | 1-10 |

**Ejemplo con 4200 clientes**:
```
Batch 1 (T+0): 500 clientes
Batch 2 (T+30min): 500 clientes
Batch 3 (T+60min): 500 clientes
...
Batch 9 (T+4h): 200 clientes
Total: ~4-5 horas para completar
```

### 3. Estrategia CONSERVATIVE (Recuperación)

**Uso**: Dominios con problemas de reputación

| Día | Límite | Batch Size | Requisitos |
|-----|--------|------------|------------|
| 1-2 | 10-20  | 10         | 25% opens  |
| 3-5 | 30     | 15         | 25% opens  |
| 6+  | 50     | 25         | 98% delivery |

---

## 🗄️ Esquema de Base de Datos

### Tablas Principales

#### 1. `email_reputation_profiles`

```sql
CREATE TABLE email_reputation_profiles (
    id UUID PRIMARY KEY,
    business_id UUID REFERENCES businesses(id),
    domain VARCHAR(255) NOT NULL,
    sending_ip VARCHAR(45),
    
    -- Warm-up status
    is_warmed_up BOOLEAN DEFAULT FALSE,
    current_warmup_day INTEGER DEFAULT 0,
    
    -- Métricas
    total_emails_sent INTEGER DEFAULT 0,
    total_emails_delivered INTEGER DEFAULT 0,
    total_emails_opened INTEGER DEFAULT 0,
    delivery_rate DECIMAL(5,2) DEFAULT 0.00,
    open_rate DECIMAL(5,2) DEFAULT 0.00,
    
    -- Límites
    daily_sending_limit INTEGER DEFAULT 50,
    current_strategy VARCHAR(20),
    
    -- Flags
    has_reputation_issues BOOLEAN DEFAULT FALSE
);
```

**Propósito**: Tracking de reputación por dominio para decidir límites y estrategia

#### 2. `delivery_strategies`

```sql
CREATE TABLE delivery_strategies (
    id UUID PRIMARY KEY,
    business_id UUID REFERENCES businesses(id),
    name VARCHAR(100),
    strategy_type VARCHAR(20), -- 'ramp_up', 'batch', 'conservative'
    
    -- Ramp-up config
    rampup_day_1_limit INTEGER DEFAULT 50,
    rampup_day_2_limit INTEGER DEFAULT 100,
    rampup_day_3_5_limit INTEGER DEFAULT 150,
    
    -- Batch config
    batch_size INTEGER DEFAULT 100,
    batch_interval_minutes INTEGER DEFAULT 60,
    max_batches_per_day INTEGER DEFAULT 50,
    
    -- Thresholds
    min_open_rate_threshold DECIMAL(5,2) DEFAULT 20.00,
    max_bounce_rate_threshold DECIMAL(5,2) DEFAULT 5.00
);
```

**Propósito**: Configuración parametrizable de estrategias por negocio

#### 3. `execution_batches`

```sql
CREATE TABLE execution_batches (
    id UUID PRIMARY KEY,
    execution_id UUID REFERENCES collection_executions(id),
    strategy_id UUID REFERENCES delivery_strategies(id),
    
    batch_number INTEGER,
    batch_name VARCHAR(255),
    status VARCHAR(20), -- 'pending', 'queued', 'processing', 'completed'
    
    total_clients INTEGER,
    client_ids UUID[], -- Array de collection_clients
    
    scheduled_for TIMESTAMPTZ,
    sqs_message_id VARCHAR(255),
    
    -- Métricas
    emails_sent INTEGER DEFAULT 0,
    emails_delivered INTEGER DEFAULT 0,
    emails_opened INTEGER DEFAULT 0
);
```

**Propósito**: Grupos de clientes para envío organizado

#### 4. `batch_queue_messages`

```sql
CREATE TABLE batch_queue_messages (
    id UUID PRIMARY KEY,
    batch_id UUID REFERENCES execution_batches(id),
    
    sqs_queue_url TEXT,
    sqs_message_id VARCHAR(255),
    sqs_receipt_handle TEXT,
    
    status VARCHAR(20), -- 'queued', 'in_flight', 'processed', 'failed'
    receive_count INTEGER DEFAULT 0,
    max_receives INTEGER DEFAULT 3
);
```

**Propósito**: Tracking de mensajes SQS y dead letter queue

#### 5. `daily_sending_limits`

```sql
CREATE TABLE daily_sending_limits (
    id UUID PRIMARY KEY,
    reputation_profile_id UUID REFERENCES email_reputation_profiles(id),
    date DATE,
    
    daily_limit INTEGER,
    emails_sent INTEGER DEFAULT 0,
    emails_delivered INTEGER DEFAULT 0,
    emails_opened INTEGER DEFAULT 0,
    
    limit_reached BOOLEAN DEFAULT FALSE,
    paused_until TIMESTAMPTZ,
    can_progress_to_next_day BOOLEAN DEFAULT FALSE
);
```

**Propósito**: Control diario de cuotas para cumplir estrategia ramp-up

---

## 🧩 Servicios Implementados

### 1. EmailReputationService

**Ubicación**: `/lib/services/collection/email-reputation-service.ts`

**Responsabilidades**:
- Crear/obtener perfiles de reputación por dominio
- Validar cuotas diarias disponibles
- Actualizar métricas de entrega (delivery, open, bounce)
- Evaluar progresión de warm-up
- Pausar/reanudar envíos

**Métodos Principales**:

```typescript
// Obtener o crear perfil de reputación
getOrCreateReputationProfile(businessId, domain, sendingIp)

// Verificar cuota disponible
getRemainingDailyQuota(reputationProfileId, date)
  → { canSend: boolean, remaining: number, dailyLimit: number }

// Evaluar si puede progresar al siguiente día de warm-up
evaluateWarmupProgression(reputationProfileId, date)
  → { canProgress: boolean, nextDay: number, newLimit: number }

// Pausar envíos por problemas
pauseSending(reputationProfileId, reason, pauseMinutes)
```

### 2. BatchStrategyService

**Ubicación**: `/lib/services/collection/batch-strategy-service.ts`

**Responsabilidades**:
- Seleccionar estrategia según reputación
- Algoritmos de división de clientes en batches
- Cálculo de tiempos de envío óptimos
- Tracking de progreso de ejecución

**Métodos Principales**:

```typescript
// Crear batches según estrategia
// Ejemplo con 4200 clientes, estrategia ramp_up
createBatches(
  clients: CollectionClient[],
  executionId: string,
  businessId: string,
  strategyType: 'ramp_up' | 'batch',
  domain: string,
  options?: { customBatchSize?: number }
)

// Ejemplo output (ramp_up):
// [
//   { batch_number: 1, total_clients: 25, scheduled_for: "2026-02-02T09:00:00Z" },
//   { batch_number: 2, total_clients: 25, scheduled_for: "2026-02-02T10:00:00Z" },
//   { batch_number: 3, total_clients: 50, scheduled_for: "2026-02-03T09:00:00Z" },
//   ... (84 batches total para 4200 clientes)
// ]

// Obtener progreso de ejecución
getExecutionProgress(executionId)
  → { totalBatches, completedBatches, completionPercentage }
```

**Algoritmos**:

#### Algoritmo Ramp-Up
```typescript
// Distribuye clientes en múltiples días según límites de warm-up

function calculateRampUpBatches(clients, executionId, strategy, reputation):
  clientIndex = 0
  currentDay = hoy
  batchNumber = 1
  
  while clientIndex < totalClients:
    // Determinar límite del día actual
    dailyLimit = getRampUpLimitForDay(warmupDay + floor(batchNumber/2))
    
    // Crear batch
    batchSize = min(strategy.batch_size, dailyLimit, remainingClients)
    batchClients = clients[clientIndex : clientIndex + batchSize]
    
    // Calcular hora de envío (respetando preferencias)
    sendTime = calculateSendTime(currentDay, 9, 17, avoidWeekends=true)
    
    createBatch({
      execution_id: executionId,
      batch_number: batchNumber,
      total_clients: batchSize,
      client_ids: batchClients.map(c => c.id),
      scheduled_for: sendTime
    })
    
    clientIndex += batchSize
    batchNumber++
    
    // Si llenamos el día, pasar al siguiente
    if emailsToday >= dailyLimit:
      currentDay += 1 día
```

#### Algoritmo Batch
```typescript
// Divide en batches grandes con intervalos cortos

function calculateBatchBatches(clients, executionId, strategy, options):
  batchSize = options.customBatchSize || strategy.batch_size || 500
  interval = strategy.batch_interval_minutes || 30
  
  batches = []
  for i from 0 to clients.length step batchSize:
    batchClients = clients[i : i + batchSize]
    scheduledTime = now + (i/batchSize * interval minutos)
    
    batches.push({
      execution_id: executionId,
      batch_number: i/batchSize + 1,
      total_clients: batchClients.length,
      client_ids: batchClients.map(c => c.id),
      scheduled_for: scheduledTime
    })
  
  return batches
```

### 3. SQSBatchService

**Ubicación**: `/lib/services/collection/sqs-batch-service.ts`

**Responsabilidades**:
- Encolar batches en SQS
- Gestionar dead letter queue
- Reintentar batches fallidos
- Limpieza de mensajes antiguos

**Métodos Principales**:

```typescript
// Encolar múltiples batches en SQS (batch de 10 mensajes)
enqueueBatches(batches, options?: { delaySeconds?, maxConcurrent? })
  → { success: boolean, queuedCount: number, failedCount: number }

// Encolar un solo batch
enqueueSingleBatch(batch, delaySeconds?)
  → BatchQueueMessage | null

// Eliminar mensaje de SQS después de procesar
deleteMessage(messageId, receiptHandle)
  → boolean

// Reintentar batches fallidos
retryFailedBatches(executionId, maxRetries=3)
  → { retried: number, succeeded: number, failed: number }
```

---

## 🔌 Uso del Sistema

### 1. Crear Ejecución con Estrategia Ramp-Up (Nuevo Dominio)

```typescript
import { createExecutionWithClientsAction } from '@/lib/actions/collection/execution-workflow'

// Ejemplo: 4200 clientes con dominio nuevo
const result = await createExecutionWithClientsAction({
  executionData: {
    business_id: 'uuid-business',
    created_by: 'uuid-user',
    name: 'Campaña Cobranza Febrero',
    email_template_id: 'uuid-template',
    execution_mode: 'immediate',
    fallback_enabled: true,
    fallback_days: 3,
  },
  clients: clients, // 4200 clientes
  strategyConfig: {
    strategyType: 'ramp_up',      // Estrategia conservadora
    domain: 'bore.sas',           // Dominio remitente
    sendingIp: '192.168.1.1',     // IP dedicada (opcional)
    startImmediately: true,       // Encolar inmediatamente
  }
})

// Resultado esperado:
// {
//   success: true,
//   executionId: 'uuid-execution',
//   batchesCreated: 84,
//   totalClients: 4200,
//   estimatedCompletionTime: '2026-02-26T17:00:00Z', // ~26 días
//   message: 'Successfully created execution with 84 batches using ramp_up strategy. 84 batches queued to SQS.'
// }
```

### 2. Crear Ejecución con Estrategia Batch (Dominio Establecido)

```typescript
// Ejemplo: 4200 clientes con dominio warm-up completado
const result = await createExecutionWithClientsAction({
  executionData: {
    business_id: 'uuid-business',
    created_by: 'uuid-user',
    name: 'Campaña Cobranza Urgente',
    email_template_id: 'uuid-template',
    execution_mode: 'immediate',
  },
  clients: clients, // 4200 clientes
  strategyConfig: {
    strategyType: 'batch',        // Estrategia agresiva
    domain: 'bore.sas',           // Dominio con buena reputación
    customBatchSize: 500,         // 500 clientes por batch
    customIntervals: [0, 30, 30, 30, 30, 30, 30, 30, 30], // Intervalos entre batches
    startImmediately: true,
  }
})

// Resultado esperado:
// {
//   success: true,
//   executionId: 'uuid-execution',
//   batchesCreated: 9,
//   totalClients: 4200,
//   estimatedCompletionTime: '2026-02-02T14:00:00Z', // ~4 horas
//   message: 'Successfully created execution with 9 batches using batch strategy. 9 batches queued to SQS.'
// }
```

### 3. Crear Ejecución Programada

```typescript
const result = await createExecutionWithClientsAction({
  executionData: {
    business_id: 'uuid-business',
    created_by: 'uuid-user',
    name: 'Campaña Programada',
    email_template_id: 'uuid-template',
    execution_mode: 'scheduled',
    scheduled_at: '2026-02-05T09:00:00Z', // Comenzar el 5 de febrero
  },
  clients: clients,
  strategyConfig: {
    strategyType: 'ramp_up',
    domain: 'bore.sas',
    startImmediately: false, // No encolar ahora, esperar al scheduled_at
  }
})
```

### 4. Obtener Progreso de Ejecución

```typescript
import { getExecutionProgressAction } from '@/lib/actions/collection/execution-workflow'

const progress = await getExecutionProgressAction('uuid-execution')

// Resultado:
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

### 5. Reintentar Batches Fallidos

```typescript
import { retryFailedBatchesAction } from '@/lib/actions/collection/execution-workflow'

const retry = await retryFailedBatchesAction('uuid-execution')

// Resultado:
// {
//   success: true,
//   retried: 3,
//   succeeded: 3,
//   failed: 0,
//   message: 'Retried 3 batches: 3 succeeded, 0 failed'
// }
```

---

## 🚀 Configuración AWS Requerida

### Variables de Entorno

```bash
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# SQS Configuration
SQS_BATCH_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/123456789012/collection-batches
SQS_BATCH_QUEUE_ARN=arn:aws:sqs:us-east-1:123456789012:collection-batches

# Lambda Configuration
LAMBDA_EMAIL_WORKER_ARN=arn:aws:lambda:us-east-1:123456789012:function:collection-email-worker

# SES Configuration
SES_CONFIGURATION_SET=borls-collection-config
```

### Recursos AWS a Crear

#### 1. SQS Queue (FIFO recomendado)

```bash
aws sqs create-queue \
  --queue-name collection-batches.fifo \
  --attributes '{
    "FifoQueue": "true",
    "ContentBasedDeduplication": "true",
    "VisibilityTimeout": "300",
    "MessageRetentionPeriod": "1209600",
    "ReceiveMessageWaitTimeSeconds": "20"
  }'
```

#### 2. Dead Letter Queue (DLQ)

```bash
aws sqs create-queue \
  --queue-name collection-batches-dlq.fifo \
  --attributes '{
    "FifoQueue": "true",
    "MessageRetentionPeriod": "1209600"
  }'
```

#### 3. Lambda Trigger (SQS → Lambda)

```bash
aws lambda create-event-source-mapping \
  --function-name collection-email-worker \
  --event-source-arn arn:aws:sqs:us-east-1:123456789012:collection-batches \
  --batch-size 1 \
  --maximum-batching-window-in-seconds 30 \
  --scaling-config '{"maximumConcurrency": 10}'
```

---

## 📈 Buenas Prácticas Implementadas

### 1. Prevención de Spam

✅ **Ramp-Up Gradual**: Incrementa volumen solo con métricas positivas  
✅ **Rate Limiting**: Límites diarios configurables por dominio  
✅ **Engagement Tracking**: Monitorea opens, clicks, bounces  
✅ **Complaint Detection**: Pausa automática ante complaints  
✅ **Bounce Handling**: Hard bounces = blacklist automático  

### 2. Observabilidad

✅ **Métricas en Tiempo Real**: Dashboard con delivery rate, open rate  
✅ **Batch Tracking**: Cada grupo tiene estado y métricas individuales  
✅ **SQS Monitoring**: Tracking de mensajes in-flight, processed, failed  
✅ **Error Logging**: Cada fallo registrado con contexto  

### 3. Resiliencia

✅ **Dead Letter Queue**: Mensajes fallidos >3 veces van a DLQ  
✅ **Retry Automático**: Reintentos configurables (default: 3)  
✅ **Graceful Degradation**: Si un batch falla, los demás continúan  
✅ **Circuit Breaker**: Pausa automática ante tasas de bounce altas  

### 4. Escalabilidad

✅ **SQS Distributed**: Cola distribuida soporta miles de mensajes  
✅ **Lambda Concurrency**: 10 lambdas procesando simultáneamente  
✅ **Batching Eficiente**: Procesa hasta 500 emails por batch  
✅ **Horizontal Scaling**: Agregar más consumers si se necesita  

---

## 🔧 Lambda Consumer (collection-email-worker)

La Lambda debe actualizarse para leer de SQS en lugar de recibir execution_id directo:

```rust
// Estructura del mensaje SQS
#[derive(Deserialize)]
struct SQSMessage {
    batch_id: String,
    execution_id: String,
    batch_number: i32,
    client_ids: Vec<String>,
    total_clients: i32,
}

#[derive(Deserialize)]
struct SQSEvent {
    Records: Vec<SQSRecord>,
}

#[derive(Deserialize)]
struct SQSRecord {
    body: String,
    receiptHandle: String,
}

async fn function_handler(event: SQSEvent, _ctx: Context) -> Result<Value, Error> {
    for record in event.Records {
        let message: SQSMessage = serde_json::from_str(&record.body)?;
        
        // 1. Obtener batch de Supabase
        let batch = get_batch(&message.batch_id).await?;
        
        // 2. Obtener clientes del batch
        let clients = get_clients(&message.client_ids).await?;
        
        // 3. Enviar emails via SES
        for client in clients {
            match send_email(&client).await {
                Ok(message_id) => {
                    update_client_sent(&client.id, &message_id).await?;
                }
                Err(e) => {
                    update_client_failed(&client.id, &e.to_string()).await?;
                }
            }
        }
        
        // 4. Actualizar métricas del batch
        update_batch_completed(&message.batch_id).await?;
        
        // 5. Actualizar métricas de reputación
        update_reputation_metrics(&message.execution_id).await?;
    }
    
    Ok(json!({"status": "ok"}))
}
```

---

## 📊 Comparación: Antes vs Después

### Antes (Direct Lambda Invoke)

```
4200 clientes → 1 Lambda → Procesa todos → 30-60 min
Problemas:
- Timeout risk (>15 min)
- No rate limiting → Spam risk
- No observability por batch
- Todo o nada (si falla, todos pierden)
```

### Después (SQS + Batching)

```
Estrategia Ramp-Up (Nuevo Dominio):
4200 clientes → 84 batches → 26 días
Beneficios:
✅ 50 emails/día inicial (sin spam)
✅ Progresión solo con métricas positivas
✅ Cada batch independiente
✅ Tracking granular

Estrategia Batch (Dominio Establecido):
4200 clientes → 9 batches → 4 horas
Beneficios:
✅ 500 emails/batch eficiente
✅ 30 min entre batches
✅ 10 Lambdas en paralelo
✅ Alta throughput sin riesgo
```

---

## 🎯 Métricas de Éxito

### KPIs a Monitorear

1. **Deliverability** (>98% objetivo)
   - Delivery Rate: emails entregados / enviados
   - Bounce Rate: < 2%

2. **Engagement** (>20% objetivo)
   - Open Rate: emails abiertos / entregados
   - Click Rate (si aplica)

3. **Reputation** (Healthy)
   - Complaint Rate: < 0.1%
   - No blacklists

4. **Performance**
   - Batch Processing Time: < 5 min por batch
   - SQS Queue Depth: < 100 mensajes
   - Lambda Errors: < 1%

### Alertas Recomendadas

```typescript
// Bounce Rate > 5% → Pausar y alertar
if (bounceRate > 5) {
  await EmailReputationService.pauseSending(profileId, 'high_bounce_rate', 360)
  await sendAlertSlack('🚨 Bounce rate alto detectado')
}

// Open Rate < 15% → Revisar contenido
if (openRate < 15) {
  await sendAlertSlack('⚠️ Open rate bajo, revisar asunto/contenido')
}

// Queue Depth > 500 → Escalar consumers
if (queueDepth > 500) {
  await scaleUpLambdaConsumers()
}
```

---

## 📝 Checklist de Implementación

### Phase 1: Database (Completado ✅)
- [x] Crear tablas SQL
- [x] Configurar RLS policies
- [x] Crear índices
- [x] Insertar estrategias por defecto

### Phase 2: Backend Services (Completado ✅)
- [x] EmailReputationService
- [x] BatchStrategyService
- [x] SQSBatchService
- [x] Actualizar execution-workflow.ts

### Phase 3: AWS Infrastructure (Pendiente)
- [ ] Crear SQS Queue (FIFO)
- [ ] Crear Dead Letter Queue
- [ ] Configurar Lambda Trigger
- [ ] Actualizar IAM Roles
- [ ] Configurar variables de entorno

### Phase 4: Lambda Updates (Pendiente)
- [ ] Modificar collection-email-worker para leer SQS
- [ ] Actualizar lógica de procesamiento por batch
- [ ] Agregar manejo de SQS receipt handle
- [ ] Testing de integración

### Phase 5: UI/UX (Pendiente)
- [ ] Selector de estrategia en wizard
- [ ] Dashboard de progreso por batch
- [ ] Visualización de métricas de reputación
- [ ] Alertas de warm-up status

### Phase 6: Testing & Optimización (Pendiente)
- [ ] Testing con 100 clientes
- [ ] Testing con 1000 clientes
- [ ] Testing con 5000+ clientes
- [ ] Optimizar batch sizes según resultados
- [ ] Ajustar umbrales de engagement

---

## 🆘 Troubleshooting

### Problema: Emails van a Spam

**Causas posibles**:
1. Warm-up no completado
2. Bounce rate alto
3. Contenido spammy
4. No SPF/DKIM configurado

**Solución**:
```typescript
// 1. Verificar reputación del dominio
const profile = await EmailReputationService.getReputationProfileById(supabase, profileId)

if (!profile.is_warmed_up) {
  // Cambiar a estrategia más conservadora
  await switchToConservativeStrategy(executionId)
}

// 2. Pausar y analizar
await EmailReputationService.pauseSending(supabase, profileId, 'spam_investigation', 1440) // 24h

// 3. Revisar métricas
const metrics = await getDomainMetrics(domain)
console.log(`Bounce: ${metrics.bounceRate}%, Opens: ${metrics.openRate}%`)
```

### Problema: Batches no se procesan

**Causas posibles**:
1. Lambda no está escuchando SQS
2. Visibility timeout muy corto
3. Errores en Lambda

**Solución**:
```bash
# 1. Verificar mapping
aws lambda list-event-source-mappings --function-name collection-email-worker

# 2. Verificar queue depth
aws sqs get-queue-attributes \
  --queue-url $SQS_BATCH_QUEUE_URL \
  --attribute-names ApproximateNumberOfMessages

# 3. Verificar logs
aws logs tail /aws/lambda/collection-email-worker --follow
```

### Problema: Cuota diaria agotada

**Causas**:
1. Demasiados batches programados para hoy
2. Múltiples ejecuciones simultáneas

**Solución**:
```typescript
// 1. Verificar cuota disponible
const quota = await EmailReputationService.getRemainingDailyQuota(
  supabase, 
  profileId, 
  new Date()
)

console.log(`Remaining today: ${quota.remaining}/${quota.dailyLimit}`)

// 2. Reprogramar batches excedentes
if (quota.remaining < batchesForToday.length * averageBatchSize) {
  await rescheduleOverflowBatches(executionId, quota.remaining)
}
```

---

## 📚 Referencias

- [AWS SES Best Practices](https://docs.aws.amazon.com/ses/latest/dg/best-practices.html)
- [SQS Developer Guide](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/)
- [Email Deliverability Guide](https://www.sparkpost.com/resources/email-deliverability-guide/)

---

## 👥 Contacto y Soporte

Para dudas o problemas con el sistema:

1. Revisar logs de Lambda en CloudWatch
2. Verificar métricas en Supabase Dashboard
3. Consultar documentación de troubleshooting
4. Crear ticket con execution_id y domain afectado

---

**Documentación v1.0** | Febrero 2026 | Sistema de Email Batching Inteligente
