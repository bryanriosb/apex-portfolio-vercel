# Ejecución de Estrategias de Envío de Email

## Análisis de Viabilidad

Antes de definir la arquitectura, analizamos los requisitos clave para determinar el enfoque óptimo.

| Aspecto | Evaluación |
|---------|------------|
| **Simplicidad** | ✅ Alto - Sin delay queues, sin scheduler separado |
| **Concurrencia** | ✅ SQS maneja múltiples workers naturalmente |
| **Scheduling** | ✅ Workers auto-coordinan con flag |
| **Escalabilidad** | ✅ Cada worker sabe qué hacer |
| **Costo** | ✅ Menos invocaciones EventBridge |

---

## Arquitectura del Sistema

El sistema de ejecución de estrategias de email está diseñado para manejar múltiples estrategias de envío (ramp_up, batch, conservative) de manera eficiente, escalable y con control total sobre el timing de los envíos. La arquitectura combina AWS SQS para paralelismo y Supabase para coordinación distribuida mediante locks.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           WIZARD (Next.js)                                    │
│                                                                              │
│   • Crear ejecución                                                             │
│   • Insertar clientes                                                           │
│   • Calcular batches según estrategia                                           │
│   • Encolar en SQS                                                             │
│   • Modo immediate: invocar worker ahora                                       │
│   • Modo scheduled: programar EventBridge                                      │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              AWS SQS FIFO                                       │
│                                                                              │
│   • MessageGroupId: execution_id (orden garantizado)                          │
│   • Message Deduplication: batch_id (sin duplicados)                         │
│   • Concurrencia: múltiples workers procesan en paralelo                      │
│   • Visibility Timeout: 5 minutos                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    COLLECTION-EMAIL-WORKER (Rust Lambda)                       │
│                                                                              │
│   1. Poll SQS: obtener mensajes disponibles                                   │
│   2. Filtrar por scheduled_for (listos vs futuros)                           │
│   3. Procesar solo batches listos (los futuros quedan en SQS)                 │
│   4. Validar quota diario                                                     │
│   5. Actualizar métricas                                                      │
│   6. Coordinar scheduling con Supabase Lock                                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          AWS EVENTBRIDGE                                       │
│                                                                              │
│   • Regla: collection-email-scheduler (rate 1 hour) - BACKUP/SAFETY NET    │
│   • Programación principal: Workers programan dinámicamente                 │
│   • Target: Lambda worker                                                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SUPABASE (Coordination)                           │
│                                                                              │
│   • Scheduler Locks Table: tabla para coordinación distribuida                 │
│   • TTL: 5 minutos                                                           │
│   • Previene programación doble entre workers concurrentes                    │
│   • Debugging: consulta directa del estado del lock                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Principio Fundamental

**NO se re-encolan batches futuros**. Los batches ya están en SQS al momento de crear la ejecución. Si un batch no está listo (`scheduled_for > now()`), simplemente se deja en SQS. EventBridge despierta workers periódicamente hasta que llegue el momento.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PRINCIPIO: NO RE-ENCOLAR                                   │
│                                                                              │
│   1. Wizard crea batches                                                      │
│      └── Todos los batches se ENCOLAN en SQS inmediatamente                │
│                                                                              │
│   2. Worker poll SQS                                                         │
│      ├── IF scheduled_for <= now()                                           │
│      │   └── Procesar batch + Eliminar de SQS                              │
│      │                                                                    │
│      └── IF scheduled_for > now()                                           │
│          └── MODIFICAR VISIBILIDAD (ChangeMessageVisibility)               │
│             "Ocultar" el mensaje por (scheduled_for - now) segundos           │
│             Evita consumo de recursos y "busy waiting"                        │
│                                                                              │
│   3. EventBridge despierta workers periódicamente                             │
│      └── Cuando llegue scheduled_for, un worker lo procesará                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

> **Nota sobre Tiempos > 12 Horas**: SQS tiene un límite máximo de visibilidad de 12 horas.
> Si un batch está programado para dentro de 24 horas (`scheduled_for > now + 12h`), el worker lo ocultará por el máximo permitido (12 horas).
> Al "despertar", otro worker lo verá, calculará el tiempo restante (ya solo 12h), y lo volverá a ocultar.
> Este proceso de **"Extensiones Iterativas"** continúa hasta que `scheduled_for <= now`, asegurando que el mensaje se mantenga vivo y ordenado sin pooling constante.

---

## Modos de Ejecución

El Wizard permite dos modos de iniciar una ejecución de envío de emails.

### Modo Inmediato

En el modo inmediato, la ejecución comienza tan pronto como el usuario completa el Wizard.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          MODO INMEDIATO                                       │
│                                                                              │
│   Wizard                                                                        │
│   ├── Execution Mode: immediate                                                │
│   ├── Crear batches (84 para 4200 clientes)                                   │
│   ├── Encolar todos en SQS                                                    │
│   └── Invocar worker inmediatamente                                           │
│                                                                              │
│   Worker                                                                        │
│   ├── Recibe invocación                                                       │
│   ├── Poll SQS                                                                │
│   ├── Procesa batches listos (paralelo con otros workers)                   │
│   └── Coordina próxima programación                                           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Modo Programado

En el modo programado, la ejecución comienza en una fecha y hora específica.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          MODO PROGRAMADO                                      │
│                                                                              │
│   Wizard                                                                        │
│   ├── Execution Mode: scheduled                                               │
│   ├── Scheduled At: 2026-02-15T08:00:00Z                                    │
│   ├── Crear batches                                                           │
│   ├── Encolar todos en SQS                                                   │
│   └── Programar EventBridge para scheduled_at                                 │
│                                                                              │
│   EventBridge                                                                  │
│   ├── Espera hasta scheduled_at                                               │
│   └── Invoca worker                                                           │
│                                                                              │
│   Worker                                                                        │
│   ├── Recibe invocación de EventBridge                                       │
│   ├── Poll SQS                                                                │
│   ├── Procesa batches                                                         │
│   └── Coordina próxima programación                                           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Dos Opciones en el Wizard

| Opción | Descripción |
|--------|-------------|
| **IMMEDIATE** | Encolar SQS + Invocar worker ahora |
| **SCHEDULED** | Encolar SQS + Programar EventBridge para `scheduled_at` |

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    WIZARD - PASO 3                                           │
│                                                                              │
│  Execution Mode:                                                             │
│  ┌─────────────────┐    ┌───────────────────────────────────────────┐       │
│  │ [ IMMEDIATE ]   │    │ [ SCHEDULED ]                           │       │
│  │                 │    │                                           │       │
│  │ • Encolar SQS   │    │ • Encolar SQS                            │       │
│  │ • Invocar Ahora │    │ • Programar EventBridge                    │       │
│  │                 │    │   para scheduled_at                       │       │
│  └─────────────────┘    └───────────────────────────────────────────┘       │
│                                                                              │
│  Scheduled At: [____-____-____ __:__] (solo si SCHEDULED)                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Flujo del Worker

### Paso 1: Poll de SQS

El worker poll SQS para obtener mensajes disponibles.

```rust
async fn poll_sqs_messages(sqs_client: &SqsClient) -> Result<Vec<SqsMessage>, Box<dyn Error>> {
    let queue_url = std::env::var("SQS_BATCH_QUEUE_URL")?;
    
    let response = sqs_client.receive_message()
        .queue_url(&queue_url)
        .max_number_of_messages(10)
        .wait_time_seconds(20)
        .visibility_timeout(300)
        .build()
        .await?;
    
    Ok(response.messages.unwrap_or_default())
}
```

### Paso 2: Filtrar por Scheduled For

Los mensajes contienen `scheduled_for`. Se separan en:

- **Listos**: `scheduled_for <= now()` → Procesar
- **Futuros**: `scheduled_for > now()` → Dejar en SQS (NO re-encolar)

```rust
let now = chrono::Utc::now();
let mut ready_batches: Vec<(SqsMessage, BatchMessage)> = Vec::new();

for msg in messages {
    if let Some(batch) = parse_batch_message(&msg.body)? {
        let scheduled_time = DateTime::parse_from_rfc3339(&batch.scheduled_for)?
            .with_timezone(&chrono::Utc);
        
        if scheduled_time <= now {
            // Batch listo → procesar
            ready_batches.push((msg, batch));
        } else {
            // Batch futuro → OCULTAR (ChangeMessageVisibility)
            // Calcular segundos hasta scheduled_for (max 12 horas)
            let delay = (scheduled_time - now).num_seconds();
            let visibility = delay.min(43200) as i32; // Max 12 horas SQS
            
            sqs_client.change_message_visibility()
                .queue_url(&queue_url)
                .receipt_handle(&msg.receipt_handle)
                .visibility_timeout(visibility)
                .send()
                .await?;
                
            log::info!("Batch {} future. Hidden for {}s", batch.batch_id, visibility);
        }
    }
}
```

### Paso 3: Procesar Solo Batches Listos

Solo se procesan los batches listos. Los batches futuros quedan en SQS.

```rust
let mut processed = 0;
let mut failed = 0;

for (msg, batch) in ready_batches {
    match process_single_batch(&supabase, &provider, &batch).await {
        Ok(_) => {
            processed += 1;
            // Eliminar mensaje de SQS solo si se procesó exitosamente
            delete_sqs_message(&sqs_client, &msg.receipt_handle).await?;
        }
        Err(e) => {
            failed += 1;
            log::error!("Batch {} failed: {}", batch.batch_id, e);
            // Si falla, re-encolar para retry (1 hora)
            requeue_for_retry(&sqs_client, &batch, 3600).await?;
            delete_sqs_message(&sqs_client, &msg.receipt_handle).await?;
        }
    }
}
```

### Paso 4: Al Finalizar - Coordinar Scheduling

Al terminar, el worker verifica si hay más batches y programa EventBridge para la próxima ejecución.

```

┌─────────────────────────────────────────────────────────────────────────────┐
│                    COORDINACIÓN DE PROGRAMACIÓN                               │
│                                                                              │
│   Worker #1                                                                   │
│   ├── Poll SQS: Batch 1 (listo) + Batch 2 (futuro)                        │
│   ├── Procesar Batch 1 (eliminar de SQS)                                   │
│   ├── Batch 2 queda en SQS (scheduled_for: 10:00)                          │
│   ├── Poll SQS: Vacío                                                        │
│   ├── Adquirir Supabase Lock                                                  │
│   ├── Verificar仍有 Batch 2 en SQS                                           │
│   ├── Próximo scheduled_for: Hoy 10:00                                     │
│   ├── Programar EventBridge: Hoy 10:00                                       │
│   └── Liberar Lock                                                            │
│                                                                              │
│   Worker #2 (despedido por EventBridge a las 10:00)                          │
│   ├── Poll SQS: Batch 2 (ahora listo)                                       │
│   ├── scheduled_for <= now() ✅                                               │
│   ├── Procesar Batch 2                                                       │
│   └── Continuar...                                                           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## EventBridge: Backup/Safety Net

EventBridge tiene **dos usos** en el sistema:

### 1. Programación Principal (Dinámica)

Los workers programan EventBridge cuando terminan para despertar en el próximo `scheduled_for`.

```bash
# Worker programa dinámicamente:
aws events put-rule \
  --name "collection-email-scheduler" \
  --schedule-expression "cron(0 10 15 2 ? *)"  # 15-Feb 10:00 AM
```

### 2. Backup/Safety Net (rate 1 hour)

Regla fija que se ejecuta cada hora para garantizar que el sistema no se quede colgado.

```bash
# Regla de backup (YA CONFIGURADA):
aws events put-rule \
  --name "collection-email-scheduler" \
  --schedule-expression "rate(1 hour)"
```

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    EVENTBRIDGE - DOS USOS                                    │
│                                                                              │
│  USO PRINCIPAL: Programación Dinámica                                        │
│  ├── Workers terminan de procesar                                           │
│  ├── Programan EventBridge para el próximo scheduled_for                   │
│  ├── Ejemplo: "Despiértame mañana a las 8 AM"                            │
│  └── Es la forma normal de continuar                                        │
│                                                                              │
│  USO BACKUP: Safety Net (rate 1 hour)                                        │
│  ├── Se ejecuta CADA HORA automáticamente                                   │
│  ├── Propósito: Si un worker falla ANTES de programar,                    │
│  │   EventBridge despierta otro worker para continuar                      │
│  ├── Es un "paracaídas" por si algo sale mal                              │
│  └── Costo: ~$1/mes (invocación/hora)                                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### ¿Por qué necesitamos el backup?

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ESCENARIO: Worker falla antes de programar                │
│                                                                              │
│  Worker procesa Batch 1-10                                                  │
│  ├── Error crítico: Lambda falla                                            │
│  └── NUNCA ejecuta manage_scheduling()                                     │
│                                                                              │
│  Resultado:                                                                  │
│  ├── Batches 11-84 siguen en SQS                                           │
│  ├── Ningún worker programado                                              │
│  └── SIN backup: El sistema queda colgado                                  │
│                                                                              │
│  CON backup (rate 1 hour):                                                   │
│  ├── 1 hora después: EventBridge dispara                                     │
│  ├── Nuevo worker poll SQS                                                 │
│  ├── Encuentra batches pendientes                                          │
│  └── Continúa procesamiento                                                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Resumen

| Aspecto | Programación Dinámica | Backup (rate 1 hour) |
|---------|----------------------|----------------------|
| **Cuándo** | Cuando worker termina | Cada hora |
| **Para qué** | Continuar normalmente | Recovery ante fallos |
| **Obligatoria** | Sí | Recomendada |
| **Costo** | $0 | ~$1/mes |

---

## El Flag de Coordinación

Para evitar que múltiples workers programen EventBridge simultáneamente, se utiliza un lock en Supabase.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ESCENARIO: 3 WORKERS CONCURRENTES                        │
│                                                                              │
│  Worker #1                                                                   │
│   ├── Poll SQS: 10 mensajes                                                   │
│   ├── Procesa 3 mensajes                                                      │
│   ├── Poll SQS: 7 mensajes                                                   │
│   ├── Poll SQS: 0 mensajes                                                   │
│   └── Al final:                                                               │
│        ├── Verificar SQS: Vacío                                               │
│        ├── Workers activos: 3                                                  │
│        ├── Lock acquired (Supabase)                                           │
│        ├── Verificar SQS:仍有 Batch 2 (futuro)                              │
│        ├── Próximo scheduled_for: Hoy 10:00                                  │
│        └── Programar EventBridge: Hoy 10:00                                  │
│                                                                              │
│  Worker #2                                                                   │
│   ├── Poll SQS: 0 mensajes                                                   │
│   └── Al final:                                                               │
│        ├── Verificar SQS: Vacío                                               │
│        ├── Workers activos: 3                                                  │
│        ├── Intentar Lock: FAIL (Worker #1 ya lo tiene)                      │
│        └── No hace nada (Worker #1 ya programmó)                            │
│                                                                              │
│  Worker #3                                                                   │
│   ├── Poll SQS: 0 mensajes                                                    │
│   └── Al final:                                                               │
│        ├── Verificar SQS: Vacío                                               │
│        ├── Workers activos: 3                                                  │
│        ├── Intentar Lock: FAIL (Worker #1 ya lo tiene)                       │
│        └── No hace nada                                                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Implementación

### Models

```rust
// models.rs

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct BatchMessage {
    pub batch_id: String,
    pub execution_id: String,
    pub batch_number: i32,
    pub client_ids: Vec<String>,
    pub total_clients: i32,
    pub scheduled_for: String,  // ISO 8601
    pub domain: String,
}

#[derive(Deserialize, Serialize)]
pub struct SchedulerState {
    pub is_scheduled: bool,
    pub scheduled_for: Option<String>,
    pub locked_at: Option<String>,
    pub locked_by: Option<String>,
}
```

### Supabase Distributed Lock

Para coordinar los workers, utilizamos una tabla `scheduler_locks` y funciones RPC para adquirir/liberar locks de manera atómica.

> **Nota**: El script SQL completo (Tablas + Funciones + RLS) se encuentra detallado en la sección [Migración Supabase](#migración-supabase).

```rust
```

```rust
// functions/aws/collection-email-worker/src/distributed_lock.rs

use serde::{Deserialize, Serialize};
use std::env;

#[derive(Deserialize, Serialize)]
struct SchedulerLock {
    id: String,
    locked_by: Option<String>,
    locked_at: Option<chrono::DateTime<chrono::Utc>>,
    expires_at: Option<chrono::DateTime<chrono::Utc>>,
}

pub struct SupabaseLock {
    client: reqwest::Client,
    base_url: String,
    api_key: String,
    ttl_seconds: i32,
}

impl SupabaseLock {
    pub async fn new() -> Self {
        let base_url = env::var("SUPABASE_URL").expect("SUPABASE_URL must be set");
        let api_key = env::var("SUPABASE_SECRET_KEY").expect("SUPABASE_SECRET_KEY must be set");

        Self {
            client: reqwest::Client::new(),
            base_url,
            api_key,
            ttl_seconds: 300,
        }
    }

    pub async fn try_acquire(&self, worker_id: &str) -> Result<bool, Box<dyn std::error::Error>> {
        let rpc_url = format!("{}/rest/v1/rpc/acquire_scheduler_lock", self.base_url);

        let response = self.client.post(&rpc_url)
            .header("apikey", &self.api_key)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .json(&serde_json::json!({
                "p_worker_id": worker_id,
                "p_ttl_seconds": self.ttl_seconds
            }))
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(format!("Failed to acquire lock: {}", response.status()).into());
        }

        let result: bool = response.json().await?;
        if result {
            log::info!("Lock acquired by {}", worker_id);
        } else {
            log::debug!("Lock not acquired, another worker has it");
        }
        Ok(result)
    }

    pub async fn release(&self, worker_id: &str) -> Result<bool, Box<dyn std::error::Error>> {
        let rpc_url = format!("{}/rest/v1/rpc/release_scheduler_lock", self.base_url);

        let response = self.client.post(&rpc_url)
            .header("apikey", &self.api_key)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .json(&serde_json::json!({ "p_worker_id": worker_id }))
            .send()
            .await?;

        let result: bool = response.json().await?;
        if result {
            log::info!("Lock released by {}", worker_id);
        }
        Ok(result)
    }
}
```

### Worker Principal

```rust
// main.rs

mod models;
mod supabase;
mod email_provider;
mod factory;
mod providers;

use models::{BatchMessage, LambdaEvent};
use supabase::SupabaseService;
use email_provider::EmailProvider;
use factory::create_email_provider;
use std::sync::Arc;
use uuid::Uuid;

#[tokio::main]
async fn main() -> Result<(), lambda_runtime::Error> {
    simple_logger::init_with_level(log::LevelFilter::Info).unwrap();
    let func = service_fn(func);
    lambda_runtime::run(func).await?;
    Ok(())
}

async fn func(event: LambdaEvent<Value>) -> Result<Value, lambda_runtime::Error> {
    let worker_id = Uuid::new_v4().to_string();
    let (payload, _context) = event.into_parts();

    let supabase = SupabaseService::new();
    let provider = Arc::new(create_email_provider().await);
    let lock = SupabaseLock::new().await;

    log::info!("Worker {} started", worker_id);

    // 1. Poll SQS
    let messages = poll_sqs_messages(&sqs_client).await?;

    if messages.is_empty() {
        log::info!("No messages in SQS, checking scheduling");
        if let Err(e) = manage_scheduling(&supabase, &lock, &worker_id, &eventbridge_client).await {
            log::error!("Scheduling error: {}", e);
        }
        return Ok(serde_json::json!({ "status": "no_messages", "worker_id": worker_id }));
    }

    // 2. Filtrar por scheduled_for
    let now = chrono::Utc::now();
    let mut ready_batches: Vec<(SqsMessage, BatchMessage)> = Vec::new();

    for msg in messages {
        if let Some(batch) = parse_batch_message(&msg.body)? {
            let scheduled_time = DateTime::parse_from_rfc3339(&batch.scheduled_for)?
                .with_timezone(&chrono::Utc);
            
            if scheduled_time <= now {
                ready_batches.push((msg, batch));
            } else {
                // Optimización: Ocultar mensaje hasta scheduled_for
                let delay = (scheduled_time - now).num_seconds();
                let visibility = delay.min(43200) as i32;
                
                let _ = sqs_client.change_message_visibility()
                    .queue_url(&env::var("SQS_BATCH_QUEUE_URL")?)
                    .receipt_handle(&msg.receipt_handle)
                    .visibility_timeout(visibility)
                    .send()
                    .await;
            }
        }
    }

    // 3. Procesar solo batches listos
    let mut processed = 0;
    let mut failed = 0;

    for (msg, batch) in ready_batches {
        match process_single_batch(&supabase, &provider, &batch).await {
            Ok(_) => {
                processed += 1;
                delete_sqs_message(&sqs_client, &msg.receipt_handle).await?;
            }
            Err(e) => {
                failed += 1;
                log::error!("Batch {} failed: {}", batch.batch_id, e);
                requeue_for_retry(&sqs_client, &batch, 3600).await?;
                delete_sqs_message(&sqs_client, &msg.receipt_handle).await?;
            }
        }
    }

    log::info!("Worker {} processed: {}, failed: {}", worker_id, processed, failed);

    // 4. Coordinar scheduling
    if let Err(e) = manage_scheduling(&supabase, &lock, &worker_id, &eventbridge_client).await {
        log::error!("Scheduling error: {}", e);
    }

    Ok(serde_json::json!({ "status": "completed", "worker_id": worker_id, "processed": processed, "failed": failed }))
}

async fn manage_scheduling(
    supabase: &SupabaseService,
    lock: &SupabaseLock,
    worker_id: &str,
    eventbridge: &EventBridgeClient,
) -> Result<(), Box<dyn Error + Send + Sync>> {
    let has_lock = lock.try_acquire(worker_id).await?;
    if !has_lock {
        log::info!("Another worker is managing scheduling");
        return Ok(());
    }

    let message_count = get_sqs_message_count().await?;

    if message_count > 0 {
        let next_scheduled = get_next_scheduled_time(supabase).await?;
        if let Some(scheduled_time) = next_scheduled {
            schedule_eventbridge(eventbridge, &scheduled_time).await?;
        }
    } else {
        let tomorrow = (chrono::Utc::now().date_naive() + chrono::Duration::days(1))
            .and_hms_opt(8, 0, 0).unwrap();
        schedule_eventbridge(eventbridge, &chrono::DateTime::from_utc(tomorrow, chrono::Utc)).await?;
    }

    lock.release(worker_id).await?;
    Ok(())
}

async fn schedule_eventbridge(
    client: &EventBridgeClient,
    scheduled_time: &chrono::DateTime<chrono::Utc>,
) -> Result<(), Box<dyn Error>> {
    let rule_name = env::var("EVENTBRIDGE_RULE_NAME")
        .unwrap_or_else(|_| "collection-email-scheduler".to_string());

    let cron_expr = format!(
        "cron({} {} {} * * ? *)",
        scheduled_time.minute(),
        scheduled_time.hour(),
        scheduled_time.day()
    );

    let put_rule = aws_sdk_eventbridge::types::PutRuleRequest::builder()
        .name(&rule_name)
        .schedule_expression(&cron_expr)
        .state(aws_sdk_eventbridge::types::RuleState::Enabled)
        .build();

    client.put_rule(put_rule).await?;
    log::info!("EventBridge scheduled for {}", scheduled_time);
    Ok(())
}
```

---

## Server Action (Wizard)

```typescript
// lib/actions/collection/execution-workflow.ts

export async function createExecutionWithClientsAction(...) {
    const batches = await BatchStrategyService.createBatches(
        clients, execution.id, businessId, strategyType, domain
    );

    await SQSBatchService.enqueueBatches(supabaseAdmin, batches);

    if (executionData.execution_mode === 'immediate') {
        await invokeLambdaWorker({ source: 'wizard_immediate', execution_id: execution.id });
        return { success: true, executionId: execution.id, message: 'Ejecución iniciada' };
    } else {
        const scheduledDate = new Date(executionData.scheduled_at);
        await scheduleEventBridgeExecution({
            execution_id: execution.id,
            scheduled_for: scheduledDate.toISOString(),
            batch_ids: batches.map(b => b.id)
        });
        return { success: true, executionId: execution.id, message: `Programado para ${scheduledDate}` };
    }
}
```

---

## Resumen del Enfoque

| Componente | Responsabilidad |
|------------|----------------|
| **Wizard** | Crea batches + Encola en SQS + Invoca worker/programa EventBridge |
| **SQS** | Cola de batches (paralelismo, mantiene batches hasta procesar) |
| **Workers** | Poll → Procesar solo listos (futuros quedan en SQS) |
| **Supabase Lock** | Coordinar programación entre workers |
| **EventBridge** | Programar próxima ejecución |

---

## Ventajas del Enfoque

1. **Simple**: Sin delay queues, sin re-encolar batches futuros
2. **Concurrente**: SQS maneja múltiples workers
3. **Auto-regulado**: Workers coordinan programación
4. **Escalable**: Más workers = más procesamiento paralelo
5. **Eficiente**: Supabase lock previene doble-programación

---

## Variables de Entorno

```bash
# Supabase
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SECRET_KEY=service_role_key

# Funciones RPC requeridas:
# - acquire_scheduler_lock(p_worker_id, p_ttl_seconds)
# - release_scheduler_lock(p_worker_id)

# AWS SQS
SQS_BATCH_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/123456789/collection-batches.fifo

# AWS EventBridge
EVENTBRIDGE_RULE_NAME=collection-email-scheduler
EMAIL_WORKER_FUNCTION_ARN=arn:aws:lambda:us-east-1:123456789:function:collection-email-worker

# Email Provider
EMAIL_PROVIDER=ses|brevo
SES_CONFIGURATION_SET=apex-collection-tracking

# App
APP_ENV=dev|pro
```

---

## Configuración AWS

```bash
# SQS FIFO Queue
aws sqs create-queue \
  --queue-name collection-batches.fifo \
  --attributes '{
    "FifoQueue": "true",
    "ContentBasedDeduplication": "true",
    "VisibilityTimeout": "300",
    "DelaySeconds": "0",
    "MessageRetentionPeriod": "1209600"
  }'

# EventBridge Rule - BACKUP/SAFETY NET
# Esta regla se ejecuta CADA HORA como paracaídas si workers fallan
# La programación principal la hacen los workers dinámicamente
aws events put-rule \
  --name "collection-email-scheduler" \
  --schedule-expression "rate(1 hour)" \
  --description "Safety net: despierta worker cada hora si hay batches pendientes"

# Lambda Permissions
aws lambda add-permission \
  --function-name collection-email-worker \
  --statement-id EventBridgeInvoke \
  --action 'lambda:InvokeFunction' \
  --principal events.amazonaws.com \
  --source-arn "arn:aws:events:us-east-1:123456789:rule/collection-email-scheduler"
```

---

## Migración Supabase

```sql
CREATE TABLE IF NOT EXISTS scheduler_locks (
    id TEXT PRIMARY KEY DEFAULT 'email_scheduler_lock',
    locked_by TEXT NOT NULL,
    locked_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    CONSTRAINT single_lock CHECK (id = 'email_scheduler_lock')
);

INSERT INTO scheduler_locks (id, locked_by, expires_at)
VALUES ('email_scheduler_lock', NULL, NULL)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION acquire_scheduler_lock(p_worker_id TEXT, p_ttl_seconds INTEGER DEFAULT 300)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE scheduler_locks SET locked_by = p_worker_id, locked_at = NOW(), expires_at = NOW() + (p_ttl_seconds || ' seconds')::INTERVAL
    WHERE id = 'email_scheduler_lock' AND (locked_by IS NULL OR expires_at < NOW() OR locked_by = p_worker_id);
    RETURN EXISTS (SELECT 1 FROM scheduler_locks WHERE id = 'email_scheduler_lock' AND locked_by = p_worker_id AND expires_at > NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION release_scheduler_lock(p_worker_id TEXT) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE scheduler_locks SET locked_by = NULL WHERE id = 'email_scheduler_lock' AND locked_by = p_worker_id;
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER TABLE scheduler_locks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow service role" ON scheduler_locks FOR ALL TO service_role USING (true) WITH CHECK (true);
```

---

## Documentos Relacionados

- `email-core-strategy.md`: Estrategias de envío (ramp_up, batch, conservative)
- `delivery_strategy.md`: Configuración detallada de estrategias
- `email_batching_system.md`: Arquitectura del sistema de batching

---

---

## Arquitectura de Torre de Control (Control Tower)

Para garantizar **completa observabilidad y control** sin depender exclusivamente de herramientas de infraestructura (como CloudWatch), implementamos una arquitectura de "Torre de Control".

**Filosofía**: *"El estado del negocio debe vivir en la base de datos, no en los logs."*

### 1. Componentes Clave

1. **Auditoría de Ejecución (Supabase)**: Fuente única de verdad para el estado de cada batch.
2. **Dashboard en Tiempo Real (Next.js)**: Interfaz para operadores que consume datos de Supabase.
3. **Sistema de Alertas de Negocio**: Monitores que consultan la DB, no los logs.
4. **Infraestructura (AWS)**: Solo para métricas de salud del "fierro" (Lambda timeouts, SQS depth).

---

### 2. Tabla de Auditoría: `execution_audit_logs`

Cada cambio de estado relevante en el ciclo de vida de un batch se registra en una tabla dedicada en Supabase. Esto permite reconstruir la historia de cualquier envío.

```sql
CREATE TYPE execution_event_type AS ENUM (
    'ENQUEUED',      -- Wizard puso en SQS
    'PICKED_UP',     -- Lambda tomó el mensaje
    'DEFERRED',      -- Mensaje oculto (scheduling futuro)
    'PROCESSING',    -- Procesando envío
    'COMPLETED',     -- Batch terminado OK
    'FAILED',        -- Error (reintenable o fatal)
    'DLQ_SENT'       -- Enviado a Dead Letter Queue
);

CREATE TABLE execution_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    execution_id UUID NOT NULL REFERENCES collection_executions(id),
    batch_id UUID, -- Puede ser null si el evento es de ejecución global
    event execution_event_type NOT NULL,
    worker_id TEXT, -- Para rastrear qué lambda lo procesó
    details JSONB DEFAULT '{}'::jsonb, -- Metadata (e.g. tiempo de delay, error msg)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para búsqueda rápida
CREATE INDEX idx_audit_execution ON execution_audit_logs(execution_id);
CREATE INDEX idx_audit_created_at ON execution_audit_logs(created_at DESC);
```

**Ventajas**:

- **Agnóstico**: Consultable con SQL estándar.
- **Tiempo Real**: El Dashboard puede suscribirse a `INSERT` en esta tabla vía Supabase Realtime.
- **Persistente**: Los logs de AWS expiran; la DB es permanente.

---

### 3. Trazabilidad End-to-End

El sistema utiliza un **`trace_id`** (usualmente el `execution_id` o `batch_id`) que viaja a través de todos los componentes.

1. **Wizard**: Genera el Batch y registra `ENQUEUED` en `execution_audit_logs`.
2. **SQS**: Transporta el mensaje (el payload incluye `execution_id`).
3. **Worker**:
    - Al recibir: `INSERT INTO execution_audit_logs (event='PICKED_UP')`.
    - Si posterga: `INSERT INTO execution_audit_logs (event='DEFERRED', details='{delay: 3600}')`.
    - Si falla: `INSERT INTO execution_audit_logs (event='FAILED', details='{error: "Timeout"}')`.

---

### 4. Dashboard "Torre de Control" (Mockup UI)

En la aplicación Next.js, implementaremos una vista `/admin/collection/control-tower`:

#### A. Pipeline Visual

Muestra contadores en tiempo real (consultando la tabla de auditoría):
`[ 📥 Encolados: 50 ] -> [ ⏳ Diferidos: 20 ] -> [ ⚙️ Procesando: 5 ] -> [ ✅ Completados: 1200 ] -> [ ❌ Fallidos: 2 ]`

#### B. Botón de Pánico (Circuit Breaker)

Un flag en la tabla `collection_executions` (`is_paused`).

- **Usuario**: Clic en "PAUSAR EJECUCIÓN".
- **Worker**: Antes de procesar cualquier batch, verifica `is_paused`. Si es `true`, **no procesa** y devuelve el mensaje a SQS (o lo descarta temporalmente).
- **Control Total**: Permite detener una campaña errónea en segundos.

#### C. Gestión de DLQ

Interfaz para ver mensajes que cayeron en Dead Letter Queue (errores irrecuperables).

- Acción: "Ver Error" (JSON).
- Acción: "Reintentar" (Mueve el mensaje de la DLQ back a la cola principal).

---

### 5. Rol de CloudWatch (Infraestructura)

Aunque la lógica de negocio está en Supabase, CloudWatch sigue siendo vital para la salud de la infraestructura:

- **Alarmas de Sistema**:
  - `Lambda Throttles`: ¿Nos falta capacidad?
  - `SQS Oldest Message`: ¿Se están quedando pegados los mensajes?
  - `Lambda Errors`: Panics/Crashes del runtime (que no llegan a escribir en Supabase).

Esta separación (Logica en DB / Salud en CloudWatch) nos da robustez agnóstica sin perder la vigilancia del proveedor cloud.

---

**Última actualización**: Febrero 2026
