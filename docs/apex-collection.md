# APEX Collection Module - Sistema de Cobranza y Recaudo

## Visión General

**APEX** (*Adaptic Planning & Execution Platform*) es una plataforma empresarial integral diseñada para la planificación y ejecución de procesos críticos de negocio. Este documento describe el **Módulo de Cobranza y Recaudo (Collection)**, el primer módulo implementado de la plataforma APEX.

El módulo de Collection cubre el ciclo completo de gestión de cartera: desde la comunicación inteligente con deudores hasta la conciliación automática de pagos recibidos. Combina estrategias avanzadas de entrega, gestión de reputación de dominios, segmentación dinámica basada en días de mora, y un agente de conciliación inteligente para maximizar la recuperación de cartera y medir el verdadero impacto de cada acción de cobro.

### Diferenciador Clave

A diferencia de las soluciones tradicionales que solo envían notificaciones, **APEX Collection cierra el ciclo**: conecta las campañas ejecutadas con los pagos recibidos, permitiendo a los directivos de cobranza conocer exactamente qué estrategias funcionan, cuánto se recupera por cada peso invertido, y predecir comportamientos futuros mediante Machine Learning.

### Arquitectura de Plataforma

```
┌─────────────────────────────────────────────────────────────────────┐
│                    APEX - Adaptic Planning & Execution Platform     │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  MÓDULO 1: COLLECTION (Cobranza y Recaudo)                  │   │
│  │                                                             │   │
│  │  FASE 1: Notificaciones y Campañas [✅ IMPLEMENTADO]        │   │
│  │  ├── Gestión de Cartera y Facturas                          │   │
│  │  ├── Campañas de Cobro Automatizadas                        │   │
│  │  ├── Notificaciones Inteligentes (Email)                    │   │
│  │  ├── Gestión de Umbrales y Plantillas                       │   │
│  │  └── Dashboard de Ejecución en Tiempo Real                  │   │
│  │                                                             │   │
│  │  FASE 2: Cierre del Ciclo [🚧 EN PLANIFICACIÓN]             │   │
│  │  ├── Importación de Transacciones Bancarias                 │   │
│  │  ├── Sistema de Conciliación de Pagos                       │   │
│  │  ├── Agente de Conciliación Inteligente (Email)             │   │
│  │  └── KPIs de Recuperación y Predicción ML                   │   │
│  │                                                             │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Propuesta de Valor

### Para Departamentos de Cobranza

1. **Automatización Completa**: Reduce el tiempo de gestión de cobranza en un 80% mediante la automatización del envío de notificaciones masivas con personalización segmentada.

2. **Mayor Tasa de Recuperación**: El sistema de umbrales dinámicos asigna automáticamente el mensaje correcto según la antigüedad de la deuda, aumentando la efectividad de las comunicaciones.

3. **Protección de Reputación**: El algoritmo de warm-up gradual protege los dominios de email del negocio, evitando que los correos lleguen a spam y manteniendo altas tasas de entrega.

4. **Compliance Automático**: Filtrado automático de emails en blacklist y gestión inteligente de horarios de envío respetando zonas horarias y días hábiles.

5. **Transparencia Total**: Dashboard en tiempo real con métricas de entrega, apertura, rebote y progreso de campañas.

6. **Cierre del Ciclo de Cobro** [Fase 2]: Conexión directa entre campañas ejecutadas y pagos recibidos, permitiendo medir el verdadero ROI de cada acción de cobranza.

7. **Conciliación Automatizada** [Fase 2]: Agente inteligente que procesa confirmaciones de pago por email, reduciendo el trabajo manual del coordinador de cobranza en un 70%.

8. **Predicción de Comportamiento** [Fase 2]: Machine Learning que anticipa qué clientes pagarán y cuándo, permitiendo priorizar esfuerzos y proyectar flujo de caja.

### Extensibilidad de APEX

Este módulo de Collection demuestra la arquitectura extensible de APEX, diseñada para:
- **Reutilizar componentes**: Sistema de notificaciones, gestión de plantillas, y workflows pueden adaptarse a otros módulos
- **Compartir datos**: Clientes, transacciones y métricas disponibles cross-módulo
- **Unificar experiencia**: Interfaz consistente con el resto de la plataforma APEX

---

## Arquitectura del Sistema

### Tecnologías Core

- **Frontend**: Next.js 14 (App Router), React Server Components, TypeScript
- **Backend**: Server Actions de Next.js, AWS Lambda (workers)
- **Base de Datos**: PostgreSQL (Supabase) con Row Level Security
- **Colas y Eventos**: AWS SQS (FIFO), Amazon EventBridge Scheduler
- **Email**: AWS SES, Brevo (Sendinblue), Mailgun (multi-provider)
- **Infraestructura**: AWS (Lambda, SES, SQS, EventBridge, SNS)
- **Real-time**: Supabase Realtime para actualizaciones de dashboard

### Flujo de Datos End-to-End

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FLUJO DE COBRANZA                           │
└─────────────────────────────────────────────────────────────────────┘

1. CONFIGURACIÓN INICIAL
   ├── Cargar directorio de clientes (Deudores)
   ├── Business Config (remitente, dominio, formatos de fecha)
   ├── Delivery Strategies (ramp-up, batch, conservative)
   ├── Notification Thresholds (umbrales por días de mora)
   ├── Email Templates (plantillas dinámicas con variables)
   └── Attachment Library + Rules (biblioteca de adjuntos y reglas)

2. CREACIÓN DE CAMPAÑA (Wizard 3 pasos)
   │
   ├── PASO 1: Importación de Datos
   │   ├── Upload CSV/Excel con facturas
   │   ├── Validación de formato y columnas
   │   ├── Cross-reference con directorio de clientes
   │   └── Filtrado de emails en blacklist
   │
   ├── PASO 2: Configuración de Umbrales y Adjuntos
   │   ├── Preview de asignación automática por días de mora
   │   ├── Selección de adjuntos globales (opcional)
   │   ├── Validación de plantillas asignadas
   │   └── Resolución automática de adjuntos por reglas
   │
   └── PASO 3: Programación y Estrategia
       ├── Modo: Inmediato o Programado
       ├── Selección de estrategia de envío
       ├── Dominio remitente
       └── Confirmación y lanzamiento

3. PROCESAMIENTO Y EJECUCIÓN
   │
   ├── ClientProcessor
   │   ├── Asignación de thresholds (1 query DB)
   │   ├── Resolución de attachments por reglas (batch RPC)
   │   └── Filtrado de clientes blacklisted
   │
   ├── BatchStrategyService
   │   ├── Cálculo de batches según estrategia
   │   ├── Respeto de límites diarios (reputación)
   │   ├── Scheduling inteligente (horarios óptimos)
   │   └── EventBridge para ejecuciones programadas
   │
   └── Lambda Worker (AWS)
       ├── Procesamiento asíncrono de batches
       ├── Envío vía SES/Brevo con rate limiting
       ├── Tracking de eventos (delivery, open, bounce)
       └── Actualización de métricas en tiempo real

4. MONITOREO Y REPORTING
   ├── Dashboard en tiempo real
   ├── Métricas: open_rate, delivery_rate, bounce_rate
   ├── Event log con trazabilidad completa
   └── Exportación de resultados

5. CONCILIACIÓN Y CIERRE DE CICLO (Próxima Fase)
   │
   ├── Importación de Transacciones Bancarias
   │   ├── Upload de extractos bancarios (CSV/Excel/OFX)
   │   ├── Mapeo automático de campos
   │   └── Validación de montos y referencias
   │
   ├── Cruce Automático de Pagos
   │   ├── Matching por referencia de pago
   │   ├── Matching por NIT + monto + fecha
   │   ├── Sugerencias de matching parcial (fuzzy)
   │   └── Confirmación manual de matches ambiguos
   │
   ├── Agente de Conciliación Inteligente
   │   ├── Lectura de emails de confirmación de pago
   │   ├── Extracción de datos relevantes (NLP)
   │   ├── Validación automática en sistema
   │   └── Alertas al coordinador de cobranza
   │
   └── KPIs de Recuperación por Campaña
       ├── Tasa de recuperación por campaña
       ├── Tiempo medio de cobro desde notificación
       ├── ROI por campaña (costo vs recuperado)
       └── Efectividad por umbral y plantilla
```

---

## Componentes Principales

### 1. Sistema de Umbrales de Notificación

Los **Notification Thresholds** son el núcleo inteligente del sistema, permitiendo segmentar automáticamente a los deudores según su antigüedad de mora.

#### Características:

- **Rangos Configurables**: Cada umbral define un rango de días (`days_from` a `days_to`)
- **Plantillas Asociadas**: Cada umbral vincula una plantilla de email específica
- **Orden de Prioridad**: `display_order` permite definir qué regla aplica primero en casos de solapamiento
- **Activación/Desactivación**: Umbrales pueden habilitarse/deshabilitarse sin eliminar

#### Ejemplo de Configuración:

```typescript
// Umbral para recordatorios amigables (1-30 días)
{
  name: "Recordatorio Preventivo",
  days_from: 1,
  days_to: 30,
  email_template_id: "tpl_001", // Plantilla amigable
  is_active: true,
  display_order: 1
}

// Umbral para cobro serio (31-60 días)
{
  name: "Notificación Formal",
  days_from: 31,
  days_to: 60,
  email_template_id: "tpl_002", // Plantilla más seria
  is_active: true,
  display_order: 2
}

// Umbral para cobro judicial (61+ días)
{
  name: "Aviso Judicial",
  days_from: 61,
  days_to: null, // Sin límite superior
  email_template_id: "tpl_003", // Plantilla legal
  is_active: true,
  display_order: 3
}
```

#### Algoritmo de Asignación:

```typescript
// 1. Fetch all thresholds (single DB query)
const thresholds = await fetchThresholds(businessId)
const sorted = thresholds.sort((a, b) => a.days_from - b.days_from)

// 2. Match in-memory (O(n) per client)
function findThreshold(daysOverdue: number) {
  for (const t of sorted) {
    const daysFrom = t.days_from
    const daysTo = t.days_to ?? Infinity
    if (daysOverdue >= daysFrom && daysOverdue <= daysTo) {
      return t
    }
  }
  return null
}
```

**Beneficio**: Reduce N+1 queries a 1 query, procesando miles de clientes en milisegundos.

---

### 2. Estrategias de Entrega (Delivery Strategies)

El sistema implementa 4 estrategias de envío adaptativas según el perfil del negocio y la reputación del dominio.

#### Tipos de Estrategia:

| Estrategia | Tipo | Descripción | Caso de Uso |
|------------|------|-------------|-------------|
| **Ramp-Up** | `ramp_up` | Aumento gradual del volumen diario | Nuevos dominios sin historial |
| **Batch** | `batch` | Envíos en lotes con intervalos | Dominios establecidos |
| **Conservative** | `conservative` | Very conservative ramp-up | Dominios con problemas previos |
| **Aggressive** | `aggressive` | Envío rápido en lotes grandes | Dominios con excelente reputación |

#### Parámetros Configurables:

```typescript
interface DeliveryStrategy {
  // Ramp-Up Configuration
  rampup_day_1_limit: number        // Default: 50
  rampup_day_2_limit: number        // Default: 100
  rampup_day_3_5_limit: number      // Default: 150
  rampup_day_6_plus_limit: number   // Default: 200
  
  // Batch Configuration
  batch_size: number                // Default: 100
  batch_interval_minutes: number    // Default: 60
  max_batches_per_day: number       // Default: 10
  
  // Engagement Thresholds
  min_open_rate_threshold: number   // Default: 20%
  min_delivery_rate_threshold: number // Default: 95%
  max_bounce_rate_threshold: number // Default: 5%
  
  // Scheduling Rules
  preferred_send_hour_start: number // Default: 9
  preferred_send_hour_end: number   // Default: 17
  avoid_weekends: boolean           // Default: true
}
```

#### Algoritmo de Cálculo de Batches (Ramp-Up):

```typescript
// Lógica de distribución inteligente
while (clientIndex < totalClients) {
  // 1. Calcular cuota restante del día según reputación
  const remainingToday = dailyLimit - sentToday
  
  // 2. Si se agotó la cuota, mover al siguiente día
  if (remainingToday <= 0) {
    currentDay.setDate(currentDay.getDate() + 1)
    dailyLimit = getRampUpLimitForDay(nextDayWarmup)
    continue
  }
  
  // 3. Calcular tamaño del batch respetando límites
  const batchSize = Math.min(
    strategy.batch_size || 50,
    remainingToday,
    totalClients - clientIndex
  )
  
  // 4. Calcular horario óptimo de envío
  const scheduledTime = calculateSendTime(
    baseTime,
    strategy,
    timezone,
    isImmediate
  )
  
  // 5. Crear batch
  batches.push({
    batch_number: batchNumber,
    total_clients: batchClients.length,
    client_ids: clientIds,
    scheduled_for: scheduledTime.toISOString(),
    status: 'pending'
  })
}
```

#### Cálculo de Horario Óptimo:

```typescript
function calculateSendTime(baseDate, strategy, timezone, isImmediate) {
  const startHour = strategy.preferred_send_hour_start ?? 9
  const endHour = strategy.preferred_send_hour_end ?? 17
  
  if (isImmediate) {
    const localHour = getLocalHour(baseDate, timezone)
    
    if (localHour >= startHour && localHour <= endHour) {
      // Dentro del horario permitido: enviar ahora
      return baseDate
    } else if (localHour < startHour) {
      // Antes del horario: programar para inicio
      return setHour(baseDate, startHour)
    } else {
      // Después del horario: programar para mañana
      return setHour(addDay(baseDate), startHour)
    }
  }
  
  // Para ejecuciones programadas: ajustar al rango permitido
  return adjustToBusinessHours(baseDate, startHour, endHour, avoidWeekends)
}
```

**Beneficio**: Optimiza la entregabilidad enviando en horarios de mayor engagement y respetando los límites del proveedor de email.

---

### 3. Gestión de Reputación de Email

Sistema proactivo para mantener y mejorar la reputación de los dominios de envío, crucial para evitar spam folders.

#### Perfil de Reputación:

```typescript
interface EmailReputationProfile {
  domain: string                    // Dominio del remitente
  provider: string                  // brevo, ses, mailgun
  is_warmed_up: boolean            // Completó el período de calentamiento
  current_warmup_day: number       // Día actual (1-6+)
  daily_sending_limit: number      // Límite actual diario
  current_strategy: string         // ramp_up, batch, etc.
  
  // Métricas acumuladas
  total_emails_sent: number
  total_emails_delivered: number
  total_emails_opened: number
  total_emails_bounced: number
  
  // Tasas calculadas
  delivery_rate: number
  open_rate: number
  bounce_rate: number
  complaint_rate: number
}
```

#### Progresión de Warm-Up:

| Día | Límite Diario | Estrategia |
|-----|---------------|------------|
| 1 | 50 emails | Muy conservador |
| 2 | 100 emails | Conservador |
| 3-5 | 150 emails | Moderado |
| 6+ | 200 emails | Normal |

#### Evaluación de Progresión:

```typescript
async evaluateWarmupProgression(profileId) {
  const metrics = await getDailyMetrics(profileId)
  
  // Validar métricas mínimas
  const meetsOpenRate = metrics.openRate >= profile.required_open_rate
  const meetsDeliveryRate = metrics.deliveryRate >= profile.required_delivery_rate
  const meetsBounceRate = metrics.bounceRate <= 5.0
  
  if (!meetsOpenRate || !meetsDeliveryRate || !meetsBounceRate) {
    // Mantener en día actual, no progresar
    return { canProgress: false, reason: "Métricas insuficientes" }
  }
  
  // Progresar al siguiente día
  const nextDay = profile.current_warmup_day + 1
  const newLimit = calculateNewLimit(nextDay)
  
  await updateProfile({
    current_warmup_day: nextDay,
    daily_sending_limit: newLimit,
    is_warmed_up: nextDay >= 6
  })
  
  return { canProgress: true, newLimit }
}
```

#### Pausa Automática:

```typescript
async pauseSending(profileId, reason, pauseMinutes = 360) {
  // Pausar por: alta tasa de rebote, complaints, problemas de reputación
  await updateDailyLimit({
    paused_until: Date.now() + pauseMinutes * 60000,
    pause_reason: reason
  })
  
  // Marcar perfil con issues
  await updateProfile({
    has_reputation_issues: true,
    last_issue_date: new Date()
  })
}
```

**Beneficio**: Protege la reputación del dominio desde el día 1, asegurando que los emails lleguen a inbox y no a spam.

---

### 4. Procesamiento de Clientes (ClientProcessor)

Servicio optimizado para procesar grandes volúmenes de clientes con asignación de umbrales y resolución de adjuntos.

#### Flujo de Procesamiento:

```
ClientProcessor.processClientsWithThresholds()
│
├── 1. Fetch All Thresholds (1 DB query)
│   └── SELECT * FROM notification_thresholds WHERE business_id = ?
│
├── 2. Sort Thresholds In-Memory
│   └── thresholds.sort((a, b) => a.days_from - b.days_from)
│
├── 3. Match Clients to Thresholds (O(n))
│   for each client:
│     daysOverdue = client.total_days_overdue
│     threshold = findThreshold(daysOverdue) // Linear search
│
├── 4. Batch Resolve Attachments (1 RPC call)
│   └── SELECT * FROM resolve_attachments_bulk(client_ids)
│
└── 5. Filter and Build Results
    ├── Exclude: clients without threshold match
    ├── Exclude: blacklisted clients
    └── Build: ProcessedClient[] with template + attachments
```

#### Optimizaciones:

1. **Single Query Pattern**: Todas las thresholds se cargan una sola vez
2. **In-Memory Matching**: Búsqueda lineal O(n) sobre thresholds ordenados (típicamente < 10)
3. **Batch Attachments**: Resolución masiva de adjuntos vía RPC function
4. **Chunked Processing**: Procesamiento por chunks de 1000 para evitar bloquear el event loop

#### Manejo de Blacklist:

```typescript
async validateEmailsAgainstBlacklist(clients) {
  // 1. Colectar todos los emails únicos
  const allEmails = clients.flatMap(c => c.customer.emails)
  
  // 2. Verificar contra blacklist (1 query)
  const blacklistCheck = await filterBlacklistedEmailsAction(
    businessId, 
    allEmails
  )
  
  // 3. Clasificar cada cliente
  for (const client of clients) {
    const validEmails = []
    const blacklistedEmails = []
    
    for (const email of client.customer.emails) {
      if (blacklistCheck.find(e => e.email === email)?.is_blacklisted) {
        blacklistedEmails.push(email)
      } else {
        validEmails.push(email)
      }
    }
    
    if (validEmails.length === 0 && blacklistedEmails.length > 0) {
      // Cliente completamente blacklisted - descartar
      client.status = 'blacklisted'
    } else {
      // Actualizar emails válidos
      client.customer.emails = validEmails
    }
  }
}
```

**Beneficio**: Procesa 10,000+ clientes en segundos, filtrando automáticamente emails inválidos y asignando la comunicación correcta a cada deudor.

---

### 5. Sistema de Gestión de Adjuntos con Reglas Inteligentes

El sistema de adjuntos permite asociar documentos a los emails de cobro mediante un potente motor de reglas que determina qué adjuntos incluir para cada cliente según múltiples criterios.

#### Tipos de Reglas de Adjuntos

| Tipo de Regla | Descripción | Uso Típico |
|---------------|-------------|------------|
| **`global`** | Adjunto aplicable a todos los emails | Términos y condiciones, políticas de privacidad |
| **`threshold`** | Adjunto específico para un umbral de días | Notificaciones formales para cobro judicial |
| **`customer_category`** | Adjunto por categoría de cliente | Documentos especiales para clientes VIP o corporativos |
| **`customer`** | Adjunto específico para un cliente | Acuerdos personalizados o contratos individuales |
| **`execution`** | Adjunto específico para una ejecución/campaña | Promociones temporales o campañas especiales |

#### Condiciones de Reglas

Cada regla puede incluir condiciones adicionales basadas en:

```typescript
interface AttachmentRuleConditions {
  min_amount?: number      // Monto mínimo de deuda
  max_amount?: number      // Monto máximo de deuda
}
```

**Ejemplos de Condiciones:**
- Adjunto "Carta de Cobro Judicial" solo para montos > $1,000,000
- Adjunto "Plan de Pagos" solo para montos entre $100,000 y $500,000
- Adjunto "Descuento por Pronto Pago" solo para deudas < $50,000

#### Configuración de Reglas

```typescript
interface AttachmentRule {
  id: string
  attachment_id: string           // Referencia al archivo
  business_id: string
  rule_type: AttachmentRuleType   // global, threshold, customer_category, customer, execution
  rule_entity_id?: string | null  // ID del threshold, categoría o cliente
  is_required: boolean            // ¿Es obligatorio incluirlo?
  display_order: number           // Orden de aparición en el email
  conditions: AttachmentRuleConditions
}
```

**Ejemplo de Configuración:**

```typescript
// Regla Global - Términos y Condiciones
{
  rule_type: 'global',
  rule_entity_id: null,
  is_required: true,
  display_order: 1,
  conditions: {}
}

// Regla por Umbral - Notificación Judicial
{
  rule_type: 'threshold',
  rule_entity_id: 'threshold_90_days',  // ID del umbral de 90+ días
  is_required: true,
  display_order: 2,
  conditions: { min_amount: 1000000 }    // Solo si la deuda > $1M
}

// Regla por Categoría - Clientes VIP
{
  rule_type: 'customer_category',
  rule_entity_id: 'cat_vip',            // ID de categoría VIP
  is_required: false,
  display_order: 3,
  conditions: {}
}

// Regla por Cliente - Acuerdo Específico
{
  rule_type: 'customer',
  rule_entity_id: 'cust_12345',         // ID del cliente específico
  is_required: true,
  display_order: 4,
  conditions: {}
}
```

#### Proceso de Resolución de Adjuntos

El sistema resuelve qué adjuntos incluir para cada cliente mediante una función RPC optimizada:

```sql
-- Función RPC: resolve_attachments_by_rules
-- Evalúa todas las reglas aplicables para un cliente

SELECT 
  ca.id as attachment_id,
  ca.name as attachment_name,
  ca.storage_path,
  ca.storage_bucket,
  ca.document_type,
  ar.is_required,
  ar.rule_type,
  ar.display_order
FROM attachment_rules ar
JOIN collection_attachments ca ON ca.id = ar.attachment_id
WHERE ar.business_id = p_business_id
  AND (
    -- Reglas globales siempre aplican
    ar.rule_type = 'global'
    -- Reglas por umbral
    OR (ar.rule_type = 'threshold' AND ar.rule_entity_id = p_threshold_id)
    -- Reglas por categoría
    OR (ar.rule_type = 'customer_category' AND ar.rule_entity_id = p_customer_category_id)
    -- Reglas por cliente específico
    OR (ar.rule_type = 'customer' AND ar.rule_entity_id = p_customer_id)
  )
  -- Validar condiciones de monto
  AND (ar.conditions->>'min_amount' IS NULL OR p_invoice_amount >= (ar.conditions->>'min_amount')::numeric)
  AND (ar.conditions->>'max_amount' IS NULL OR p_invoice_amount <= (ar.conditions->>'max_amount')::numeric)
ORDER BY ar.display_order ASC
```

#### Resolución en Batch (Optimización)

Para campañas masivas, el sistema utiliza resolución en batch mediante la función `resolve_attachments_bulk`:

```typescript
// Procesar múltiples clientes en una sola llamada RPC
const attachmentsMap = await AttachmentRulesService.resolveAttachmentsBulk(
  businessId,
  [
    {
      client_id: 'client_001',
      threshold_id: 'threshold_30',
      customer_category_id: 'cat_standard',
      days_overdue: 35,
      invoice_amount: 250000
    },
    {
      client_id: 'client_002',
      threshold_id: 'threshold_90',
      customer_category_id: 'cat_vip',
      days_overdue: 95,
      invoice_amount: 1500000
    }
    // ... más clientes
  ]
)

// Resultado: Map<client_id, ResolvedAttachment[]>
// client_001 -> [terminos.pdf, recordatorio.pdf]
// client_002 -> [terminos.pdf, judicial.pdf, vip_benefits.pdf]
```

**Beneficio de Performance:**
- **Resolución Individual**: N queries para N clientes
- **Resolución Batch**: 1 query para N clientes
- **Optimización**: 95% de reducción en tiempo de procesamiento para campañas grandes

#### Flujo Completo de Adjuntos

```
┌─────────────────────────────────────────────────────────────────┐
│                 GESTIÓN DE ADJUNTOS                             │
└─────────────────────────────────────────────────────────────────┘

1. CONFIGURACIÓN (UI de Administración)
   ├── Upload de documentos (PDF, DOC, XLS, etc.)
   ├── Definición de reglas por adjunto
   │   ├── Tipo de regla (global, threshold, customer, etc.)
   │   ├── Entidad específica (qué threshold, qué cliente)
   │   ├── Condiciones de monto (min/max)
   │   └── Orden de visualización
   └── Activación/desactivación de adjuntos

2. RESOLUCIÓN AUTOMÁTICA (Durante Ejecución)
   │
   ├── Por cada cliente en la campaña:
   │   ├── Determinar threshold asignado
   │   ├── Obtener customer_category_id
   │   └── Llamar resolve_attachments_by_rules()
   │
   └── Evaluación de reglas:
       ├── ¿Reglas globales? → Incluir
       ├── ¿Regla coincide con threshold? → Incluir
       ├── ¿Regla coincide con categoría? → Incluir
       ├── ¿Regla coincide con cliente específico? → Incluir
       └── ¿Cumple condiciones de monto? → Incluir

3. VALIDACIÓN DE REQUERIDOS
   └── Verificar que todos los adjuntos `is_required = true`
       estén presentes antes del envío

4. INCLUSIÓN EN EMAIL
   ├── Ordenar por display_order
   ├── Adjuntar archivos desde Supabase Storage
   └── Enviar email con todos los documentos relevantes
```

#### Casos de Uso Comunes

**Caso 1: Notificación Estándar**
- Todos los emails incluyen: `terminos_condiciones.pdf`
- Solo clientes VIP incluyen: `beneficios_programa_fidelidad.pdf`

**Caso 2: Cobro Judicial**
- Montos > $1,000,000 incluyen: `carta_notificacion_judicial.pdf`
- Todos incluyen: `terminos_condiciones.pdf`

**Caso 3: Plan de Pagos**
- Montos entre $100,000-$500,000 incluyen: `plan_pagos_opciones.pdf`
- Clientes con >60 días incluyen: `acuerdo_reestructuracion.pdf`

**Caso 4: Campaña Especial**
- Ejecución específica incluye: `promocion_descuento_marzo.pdf`

---

### 6. Wizard de Creación de Campañas (3 Pasos)

Interfaz intuitiva que guía al usuario en la creación de campañas de cobro.

#### Paso 1: Importación y Validación

**Funcionalidades:**
- Upload de CSV/Excel con formato flexible
- Validación automática de columnas requeridas
- Cross-reference con directorio de clientes (por NIT)
- Filtrado en tiempo real de emails en blacklist
- Visualización de estado de procesamiento

**Columnas Requeridas:**
- `nit`: Identificación del cliente
- `numero_factura`: Número de factura
- `monto`: Valor adeudado
- `fecha_vencimiento`: Fecha de vencimiento

**Columnas Opcionales:**
- `nombre_cliente`, `empresa`, `email`, `telefono`

#### Paso 2: Configuración de Umbrales y Adjuntos

**Funcionalidades:**
- Preview visual de asignación de umbrales
- Conteo de clientes por rango de días
- Identificación de clientes fuera de rangos
- Selección de adjuntos globales para todos los emails
- Validación de plantillas asignadas

**Preview de Umbrales:**
```
Umbral                      Clientes    Plantilla Asignada
─────────────────────────────────────────────────────────────
Recordatorio Preventivo     45          recordatorio_amigable.html
Notificación Formal         32          cobro_estandar.html
Aviso Judicial              18          comunicado_legal.html
─────────────────────────────────────────────────────────────
Sin umbral (excluidos)      5           -
```

#### Paso 3: Programación y Estrategia

**Funcionalidades:**
- Modo Inmediato vs Programado
- Selección de estrategia de envío
- Configuración de dominio remitente
- Scheduler integrado con EventBridge
- Estimación de tiempo de finalización

**Scheduling Inteligente:**
- Si es inmediato pero fuera de horario: programa para próximo horario válido
- Si es programado: usa EventBridge One-time schedule
- Timezone-aware (respetando zona horaria del negocio)

---

### 7. Dashboard en Tiempo Real

Panel de control completo con métricas clave y monitoreo de ejecuciones activas.

#### Métricas Principales:

**Estadísticas de Ejecución:**
- Total de campañas creadas
- Campañas activas (pending/processing)
- Campañas completadas/fallidas

**Estadísticas de Email:**
- Total de emails enviados
- Tasa de entrega (delivery rate)
- Tasa de apertura (open rate)
- Tasa de rebote (bounce rate)
- Emails enviados hoy

**Métricas Calculadas:**
```typescript
avg_open_rate = (total_opened / total_sent) * 100
avg_delivery_rate = (total_delivered / total_sent) * 100
avg_bounce_rate = (total_bounced / total_sent) * 100
```

#### Ejecuciones Activas:

```typescript
interface ActiveExecution {
  id: string
  name: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress_percent: number        // Calculado: emails_sent / total_clients
  total_clients: number
  emails_sent: number
  emails_delivered: number
  emails_opened: number
  strategy_type: string
}
```

**Actualización Real-time:**
- Canal de Supabase Realtime: `collection_executions`
- Actualizaciones automáticas cada 5 segundos
- Sin necesidad de refresh manual

---

### 8. Sistema de Eventos y Tracking

Trazabilidad completa de cada email enviado mediante eventos y webhooks.

#### Tipos de Eventos:

| Evento | Descripción | Fuente |
|--------|-------------|--------|
| `queued` | Email encolado para envío | Interno |
| `sent` | Email enviado al proveedor | SES/Brevo |
| `delivered` | Email entregado al destinatario | SES/Brevo |
| `opened` | Email abierto por destinatario | Tracking pixel |
| `bounced` | Email rebotado (soft/hard) | SES/Brevo |
| `complaint` | Usuario reportó spam | SES/Brevo |
| `clicked` | Usuario hizo clic en enlace | Tracking link |
| `failed` | Fallo en envío | Interno |

#### Webhook Processing:

```typescript
// Recepción de eventos SES/Brevo
async function handleWebhook(payload) {
  const event = parseWebhookPayload(payload)
  
  // 1. Registrar evento
  await createCollectionEvent({
    client_id: event.clientId,
    execution_id: event.executionId,
    event_type: event.type,
    event_status: 'completed',
    metadata: event.metadata
  })
  
  // 2. Actualizar métricas
  await updateExecutionMetrics(event.executionId, {
    [event.type === 'delivered' ? 'emails_delivered' : 
     event.type === 'opened' ? 'emails_opened' :
     event.type === 'bounced' ? 'emails_bounced' : null]: 
     supabase.rpc('increment')
  })
  
  // 3. Actualizar reputación si es necesario
  if (event.type === 'bounced' || event.type === 'complaint') {
    await EmailReputationService.updateDeliveryMetrics(profileId, {
      bounced: event.type === 'bounced' ? 1 : 0,
      complaint: event.type === 'complaint' ? 1 : 0
    })
  }
}
```

**Beneficio**: Trazabilidad forense completa para auditorías y análisis de comportamiento de clientes.

---

## Flujo Completo: Creación a Ejecución

### Diagrama de Secuencia

```
Usuario                           Wizard                    ExecutionWorkflow
  │                                 │                              │
  │── Seleccionar archivo CSV ─────>│                              │
  │                                 │                              │
  │                                 │── parseInvoiceFile() ───────>│
  │                                 │<── Datos agrupados ──────────│
  │                                 │                              │
   │── Continuar Paso 2 ────────────>│                              │
   │                                 │                              │
   │                                 │── fetchThresholds() ────────>│
   │                                 │<── Umbrales activos ─────────│
   │                                 │                              │
   │                                 │── Preview asignación ───────>│
   │                                 │                              │
   │                                 │── resolveAttachmentsBulk() ─>│
   │                                 │<── Adjuntos por cliente ─────│
   │<── Mostrar distribución ────────│                              │
  │                                 │                              │
  │── Continuar Paso 3 ────────────>│                              │
  │                                 │                              │
  │── Seleccionar estrategia ──────>│                              │
  │── Configurar scheduling ───────>│                              │
  │                                 │                              │
  │── Crear Campaña ───────────────>│                              │
  │                                 │── createExecutionWithClients──>│
  │                                 │                              │
  │                                 │                              │── 1. ClientProcessor.processClientsWithThresholds()
  │                                 │                              │   ├── Fetch thresholds (1 query)
  │                                 │                              │   ├── Match clients in-memory
  │                                 │                              │   └── Filter blacklisted
  │                                 │                              │
  │                                 │                              │── 2. Create Execution record
  │                                 │                              │
  │                                 │                              │── 3. Insert CollectionClients
  │                                 │                              │
  │                                 │                              │── 4. BatchStrategyService.createBatches()
  │                                 │                              │   ├── Get reputation profile
  │                                 │                              │   ├── Calculate batches
  │                                 │                              │   └── Persist batches
  │                                 │                              │
  │                                 │                              │── 5. Assign batch_ids to clients
  │                                 │                              │
  │                                 │                              │── 6. IF immediate:
  │                                 │                              │       CollectionService.startImmediateExecution()
  │                                 │                              │       └── Invoke Lambda
  │                                 │                              │   ELSE:
  │                                 │                              │       CollectionService.scheduleExecution()
  │                                 │                              │       └── Create EventBridge schedule
  │                                 │                              │
  │<── Redirect a ejecuciones ──────│<─────────────────────────────│
```

### Procesamiento AWS Lambda

```python
# Lambda Worker (Python)
def lambda_handler(event, context):
    execution_id = event['execution_id']
    action = event['action']  # 'start_execution' | 'wake_up'
    
    # 1. Get pending batches
    batches = get_pending_batches(execution_id)
    
    for batch in batches:
        # 2. Get clients for this batch
        clients = get_clients_by_batch(batch.id)
        
        # 3. Get templates and resolved attachments
        # Attachments already resolved during batch creation based on rules
        templates = get_templates_for_clients(clients)
        attachments_by_client = get_attachments_for_clients(clients)  # From collection_clients.attachments
        
        # 4. Send emails with rate limiting
        for client in clients:
            template = templates[client.threshold_id]
            
            # Render template with variables
            html = render_template(template, client.custom_data)
            
            # Send via SES/Brevo
            response = send_email(
                to=client.custom_data.emails,
                from=config.email_from_address,
                subject=template.subject,
                html=html,
                attachments=client.attachments
            )
            
            # Track sent
            increment_emails_sent(execution_id)
            
            # Rate limiting
            time.sleep(0.1)  # 10 emails/second max
        
        # 5. Update batch status
        update_batch_status(batch.id, 'completed', {
            emails_sent: len(clients),
            emails_delivered: len(clients)  # Updated async via webhook
        })
    
    # 6. Check if execution completed
    if all_batches_completed(execution_id):
        update_execution_status(execution_id, 'completed')
```

---

## Configuración Requerida

### Pre-requisitos del Negocio

Antes de crear la primera campaña, el sistema valida:

1. **Clientes Registrados**: Mínimo 1 cliente en el directorio
2. **Formatos de Fecha**: Configurados en CollectionConfig
3. **Plantillas de Email**: Mínimo 1 plantilla activa
4. **Umbrales de Notificación**: Mínimo 1 umbral configurado

### Configuración Opcional (Recomendada)

5. **Biblioteca de Adjuntos**: Documentos legales y operativos configurados con reglas de asignación
   - Términos y condiciones (regla `global`)
   - Documentación específica por umbral (reglas `threshold`)
   - Documentos por categoría de cliente (reglas `customer_category`)

### Configuración de Negocio (CollectionConfig)

```typescript
{
  // Email Configuration
  email_from_address: "cobros@empresa.com",
  email_from_name: "Departamento de Cobros",
  email_reply_to: "soporte@empresa.com",
  
  // SES Configuration
  ses_configuration_set: "mi-config-set",
  ses_region: "us-east-1",
  
  // Date Formatting
  input_date_format: "DD-MM-YYYY",   // Cómo vienen las fechas en CSV
  output_date_format: "DD/MM/YYYY",  // Cómo se muestran en emails
  
  // Fallback Configuration
  fallback_enabled: true,
  fallback_default_days: 7,
  whatsapp_enabled: false,
  
  // Monitoring
  alert_on_high_bounce: true,
  bounce_threshold_percent: 10,
  alert_recipients: ["admin@empresa.com"],
  
  // Limits
  max_emails_per_execution: 10000
}
```

---

## Seguridad y Aislamiento

### Row Level Security (RLS)

Todas las tablas implementan RLS policies:

```sql
-- Ejemplo: Collection Executions
CREATE POLICY "Business isolation" ON collection_executions
  FOR ALL USING (business_id = current_setting('app.current_business_id')::uuid);

-- Ejemplo: Notification Thresholds
CREATE POLICY "Business account isolation" ON notification_thresholds
  FOR ALL USING (business_id IN (
    SELECT id FROM businesses WHERE business_account_id = current_setting('app.current_business_account_id')::uuid
  ));
```

### Validaciones de Permisos

```typescript
// Cada acción verifica permisos
export async function createExecutionAction(data) {
  const { hasPermission } = await checkPermissions(
    userId,
    'collection',
    'create'
  )
  
  if (!hasPermission) {
    throw new Error('No tiene permisos para crear ejecuciones')
  }
  
  // Validar que el business_id pertenece al usuario
  if (data.business_id !== activeBusinessId) {
    throw new Error('Business ID no válido')
  }
  
  // ... crear ejecución
}
```

---

## Métricas y KPIs

### Métricas de Negocio

| KPI | Fórmula | Objetivo |
|-----|---------|----------|
| Tasa de Recuperación | (Monto recuperado / Monto total) * 100 | > 25% |
| Tiempo Medio de Cobro | Días promedio desde vencimiento hasta pago | < 45 días |
| Costo por Contacto | Costo total / Número de emails enviados | < $0.01 |

### Métricas Técnicas

| KPI | Fórmula | Objetivo |
|-----|---------|----------|
| Delivery Rate | (Entregados / Enviados) * 100 | > 95% |
| Open Rate | (Abiertos / Entregados) * 100 | > 20% |
| Bounce Rate | (Rebotados / Enviados) * 100 | < 5% |
| Tiempo de Procesamiento | Tiempo desde creación hasta finalización | < 24h |

---

## Casos de Uso

### Caso 1: Cobranza Preventiva

**Escenario**: Empresa con 500 clientes, facturas vencidas entre 1-30 días.

**Configuración**:
- Umbral: 1-30 días → Plantilla "Recordatorio Amigable"
- Estrategia: Batch (dominio establecido)
- Modo: Inmediato

**Resultado**: 
- 500 emails enviados en 5 batches
- Tiempo total: 30 minutos
- Open rate: 35%
- Pagos recibidos en 48h: 120 (24% tasa de conversión)

### Caso 2: Cobranza Judicial

**Escenario**: Facturas vencidas > 90 días, requiere comunicado formal.

**Configuración**:
- Umbral: 90+ días → Plantilla "Notificación Legal"
- Estrategia: Conservative (alta importancia)
- Modo: Programado (9:00 AM horario laboral)

**Resultado**:
- 200 emails programados
- Delivery rate: 98%
- Escalados a legal: 45 casos

### Caso 3: Nuevo Dominio (Warm-up)

**Escenario**: Empresa configurando nuevo dominio de email.

**Configuración**:
- Estrategia: Ramp-Up (conservador)
- Día 1: 50 emails máximo
- Escalado automático según métricas

**Resultado**:
- Semana 1: 50 emails/día, open rate 40%
- Semana 2: 100 emails/día, open rate 38%
- Semana 3+: 200 emails/día, dominio calentado

### Caso 4: Documentación Condicional por Reglas de Adjuntos

**Escenario**: Empresa de servicios públicos que debe incluir documentación legal específica según el tipo de cliente y monto adeudado.

**Configuración de Reglas**:

```typescript
// Regla 1: Términos y Condiciones (Todos los emails)
{
  rule_type: 'global',
  attachment_id: 'terms_conditions_v2024.pdf',
  is_required: true,
  display_order: 1
}

// Regla 2: Notificación de Suspensión (>90 días y >$500,000)
{
  rule_type: 'threshold',
  rule_entity_id: 'threshold_90_days',
  attachment_id: 'aviso_suspension_servicio.pdf',
  is_required: true,
  display_order: 2,
  conditions: { min_amount: 500000 }
}

// Regla 3: Plan de Pagos (Deudas entre $100K-$1M)
{
  rule_type: 'global',
  attachment_id: 'plan_pagos_opciones.pdf',
  is_required: false,
  display_order: 3,
  conditions: { min_amount: 100000, max_amount: 1000000 }
}

// Regla 4: Descuento por Pronto Pago (Deudas < $200K)
{
  rule_type: 'global',
  attachment_id: 'descuento_pronto_pago_10.pdf',
  is_required: false,
  display_order: 4,
  conditions: { max_amount: 200000 }
}
```

**Procesamiento de Campaña** (1,000 clientes):
- Cliente A: 45 días mora, $750,000 → [términos.pdf, plan_pagos.pdf]
- Cliente B: 95 días mora, $600,000 → [términos.pdf, aviso_suspensión.pdf, plan_pagos.pdf]
- Cliente C: 120 días mora, $150,000 → [términos.pdf, aviso_suspensión.pdf, descuento.pdf]
- Cliente D: 30 días mora, $50,000 → [términos.pdf, descuento.pdf]

**Resultado**:
- Documentación legal 100% compliant con regulaciones
- 4 combinaciones diferentes de adjuntos generadas automáticamente
- 0 errores de adjuntos faltantes
- Ahorro de 15 horas/semana en preparación manual de documentación

---

## Integraciones Disponibles

### Proveedores de Email

- **AWS SES**: Recomendado para alto volumen (> 100k/mes)
- **Brevo (Sendinblue)**: Buen balance costo/funcionalidad
- **Mailgun**: Alta entregabilidad, buena para transaccionales

### Webhooks

- **SES**: SNS notifications para delivery, bounce, complaint
- **Brevo**: Webhooks para tracking de opens, clicks, bounces
- **Mailgun**: Event webhooks para todos los eventos

### Storage

- **Supabase Storage**: Almacenamiento de adjuntos
- **AWS S3**: Opcional para backup y archivado

---

## Troubleshooting

### Emails llegan a Spam

**Causas comunes**:
1. Dominio sin warm-up
2. Alta tasa de rebote (> 5%)
3. Contenido spammy (palabras prohibidas)
4. Sin SPF/DKIM configurados

**Soluciones**:
- Verificar configuración DNS (SPF, DKIM, DMARC)
- Usar estrategia Ramp-Up para nuevos dominios
- Revisar contenido de plantillas
- Implementar blacklist filtering

### Baja Tasa de Apertura

**Causas comunes**:
1. Asuntos poco atractivos
2. Horario de envío inadecuado
3. Emails no personalizados
4. Frecuencia excesiva

**Soluciones**:
- A/B testing de asuntos
- Usar preferred_send_hour_start/end
- Personalizar con variables dinámicas
- Respetar avoid_weekends

### Errores en Importación CSV

**Causas comunes**:
1. Formato de fecha incorrecto
2. Columnas faltantes
3. Encoding incorrecto
4. Separador incorrecto

**Soluciones**:
- Verificar input_date_format en config
- Usar plantilla de descarga
- Guardar CSV como UTF-8
- Usar coma (,) o punto y coma (;) según región

---

## Cierre del Ciclo de Cobro (Fase 2 del Módulo Collection) [🚧 EN PLANIFICACIÓN]

> **Nota**: Esta sección describe funcionalidades planificadas para la Fase 2 del módulo de Collection. Aún no están implementadas en el sistema actual.

Esta fase estratégica cerrará el ciclo completo de cobranza dentro del módulo de Collection de APEX, permitiendo medir el verdadero impacto de las campañas mediante la conciliación automática de pagos recibidos.

**Secuencia de implementación planificada**:
1. Importación de transacciones bancarias
2. Sistema de conciliación de pagos
3. Agente de conciliación inteligente
4. Machine Learning para predicciones

### 1. Importación de Transacciones Bancarias

**Objetivo**: Registrar todos los pagos recibidos para cruzarlos con las facturas notificadas.

#### Formatos Soportados:
- **CSV/Excel**: Exportaciones manuales de banca electrónica
- **OFX/QFX**: Archivos de estándar financiero
- **API Bancaria**: Integraciones directas (próximamente)

#### Columnas Requeridas:
```typescript
interface BankTransaction {
  transaction_date: string        // Fecha del pago
  transaction_reference: string   // Referencia/numero de transacción
  description: string             // Descripción del movimiento
  debit_amount: number           // Monto pagado (si es débito)
  credit_amount: number          // Monto recibido (si es crédito)
  account_number: string         // Cuenta bancaria destino
  payer_name?: string            // Nombre del pagador (si disponible)
  payer_nit?: string            // NIT del pagador (si disponible)
  invoice_reference?: string     // Referencia de factura (opcional)
}
```

#### Proceso de Importación:
```
1. Upload archivo bancario
2. Validación de formato y columnas
3. Detección de duplicados (misma ref + fecha + monto)
4. Mapeo de columnas personalizado
5. Preview de transacciones antes de importar
6. Inserción en tabla bank_transactions
```

### 2. Sistema de Matching de Pagos

**Objetivo**: Asociar automáticamente cada pago con la factura correspondiente.

#### Algoritmos de Matching:

**Nivel 1: Exact Match (100% confianza)**
```typescript
// Por referencia exacta
if (transaction.invoice_reference === invoice.invoice_number) {
  return { match: true, confidence: 1.0, method: 'reference_exact' }
}

// Por descripción conteniendo número de factura
if (transaction.description.includes(invoice.invoice_number)) {
  return { match: true, confidence: 1.0, method: 'description_exact' }
}
```

**Nivel 2: Multi-criteria Match (85-99% confianza)**
```typescript
// Combinación: NIT + Monto + Fecha (±3 días)
const matches = []
if (transaction.payer_nit === invoice.customer_nit) matches.push('nit')
if (Math.abs(transaction.amount - invoice.amount) < 1) matches.push('amount')
if (daysDiff(transaction.date, invoice.due_date) <= 3) matches.push('date')

if (matches.length >= 2) {
  const confidence = matches.length === 3 ? 0.95 : 0.85
  return { match: true, confidence, method: matches.join('_') }
}
```

**Nivel 3: Fuzzy Match (60-84% confianza)**
```typescript
// Nombre similar (Levenshtein distance)
const nameSimilarity = calculateSimilarity(
  transaction.payer_name,
  invoice.customer_name
)

// Monto similar (±10%)
const amountRatio = transaction.amount / invoice.amount
const amountSimilar = amountRatio >= 0.9 && amountRatio <= 1.1

if (nameSimilarity > 0.8 && amountSimilar) {
  return { match: true, confidence: 0.75, method: 'fuzzy_name_amount' }
}
```

#### Estados de Matching:

| Estado | Descripción | Acción Requerida |
|--------|-------------|------------------|
| `matched` | Match confirmado (confianza > 85%) | Automático |
| `suggested` | Match propuesto (confianza 60-85%) | Revisión manual |
| `unmatched` | Sin coincidencias encontradas | Investigación manual |
| `partial` | Match parcial (pago parcial de factura) | Revisión manual |

#### Interfaz de Conciliación:

```typescript
interface ReconciliationUI {
  // Panel de transacciones pendientes
  pendingTransactions: BankTransaction[]
  
  // Sugerencias automáticas
  suggestedMatches: {
    transaction: BankTransaction
    invoice: Invoice
    confidence: number
    method: string
  }[]
  
  // Estadísticas
  stats: {
    total_transactions: number
    auto_matched: number
    pending_review: number
    unmatched: number
    total_recovered: number
  }
}
```

### 3. Agente de Conciliación Inteligente (Email Processing)

**Objetivo**: Procesar automáticamente los emails que confirman pagos, reduciendo la carga manual del coordinador de cobranza.

#### Problema:
Los clientes frecuentemente envían emails confirmando pagos realizados. El coordinador debe:
1. Leer el email
2. Buscar la factura en el sistema
3. Verificar el pago en el banco
4. Marcar la factura como pagada

#### Solución: Agente de Conciliación

**Arquitectura del Agente:**

```
┌─────────────────────────────────────────────────────────────┐
│                    AGENTE DE CONCILIACIÓN                   │
└─────────────────────────────────────────────────────────────┘

1. RECEPCIÓN
   └── Webhook de email entrante (SES/Brevo/Gmail API)

2. CLASIFICACIÓN (NLP)
   ├── ¿Es confirmación de pago? (Sí/No)
   ├── ¿Contiene datos suficientes?
   └── Clasificación de intención

3. EXTRACCIÓN DE DATOS (NER - Named Entity Recognition)
   ├── NIT del pagador
   ├── Número de factura
   ├── Monto pagado
   ├── Fecha de pago
   ├── Referencia de transacción
   └── Método de pago (transferencia, consignación, etc.)

4. VALIDACIÓN
   ├── ¿Existe el cliente? (por NIT)
   ├── ¿Existe la factura? (por número)
   ├── ¿El monto coincide? (± tolerancia)
   └── ¿Ya está registrado este pago? (duplicados)

5. ACCIÓN
   ├── MATCH_EXITOSO:
   │   ├── Crear registro de pago
   │   ├── Marcar factura como pagada
   │   ├── Asociar con campaña/ejecución
   │   └── Notificar al coordinador (resumen)
   │
   └── DUDA/ERROR:
       ├── Crear ticket de revisión
       ├── Priorizar según urgencia
       └── Notificar al coordinador (acción requerida)

6. APRENDIZAJE
   └── Feedback loop: correcciones del coordinador mejoran el modelo
```

**Implementación Técnica:**

```typescript
// Procesamiento de email de confirmación
async function processPaymentConfirmationEmail(email: IncomingEmail) {
  // 1. Clasificar con NLP
  const classification = await nlpClassifier.classify(email.body)
  if (!classification.isPaymentConfirmation) {
    return { action: 'ignore', reason: 'Not a payment confirmation' }
  }
  
  // 2. Extraer entidades
  const entities = await nerExtractor.extract(email.body, email.attachments)
  // entities = { nit, invoiceNumber, amount, date, reference }
  
  // 3. Validar en base de datos
  const validation = await validatePaymentEntities(entities)
  
  if (validation.isValid) {
    // 4a. Auto-conciliar
    const reconciliation = await autoReconcile({
      ...entities,
      emailId: email.id,
      source: 'email_agent'
    })
    
    return {
      action: 'auto_reconciled',
      reconciliationId: reconciliation.id,
      confidence: validation.confidence
    }
  } else {
    // 4b. Crear ticket para revisión manual
    const ticket = await createReconciliationTicket({
      email,
      extractedEntities: entities,
      validationErrors: validation.errors,
      priority: calculatePriority(entities)
    })
    
    return {
      action: 'manual_review_required',
      ticketId: ticket.id,
      priority: ticket.priority
    }
  }
}
```

**Beneficios del Agente:**

- **Reducción de 70%** en tiempo de conciliación manual
- **Procesamiento 24/7** sin intervención humana
- **Priorización inteligente** de casos que requieren atención
- **Auditoría completa** de cada decisión del agente

### 4. KPIs de Recuperación por Campaña

**Métricas Estratégicas para Directivos:**

#### Rendimiento de Campañas:

```typescript
interface CampaignRecoveryKPIs {
  // Identificación
  campaign_id: string
  campaign_name: string
  execution_date: string
  total_invoices: number
  total_amount: number
  
  // Recuperación
  recovered_invoices: number
  recovered_amount: number
  recovery_rate_percent: number  // (recovered / total) * 100
  
  // Temporalidad
  avg_days_to_payment: number     // Días desde notificación hasta pago
  median_days_to_payment: number
  
  // Eficiencia
  cost_per_recovery: number       // Costo campaña / número de recuperaciones
  roi_percent: number            // ((recuperado - costo) / costo) * 100
  
  // Por segmento
  by_threshold: {
    threshold_name: string
    recovery_rate: number
    avg_days_to_payment: number
  }[]
  
  // Comparativa
  vs_previous_campaign: number   // % mejora vs campaña anterior
  vs_avg_campaign: number        // % vs promedio histórico
}
```

#### Dashboard de Recuperación:

```
┌─────────────────────────────────────────────────────────────┐
│              DASHBOARD DE RECUPERACIÓN                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  RECUPERACIÓN POR CAMPAÑA          EVOLUCIÓN TEMPORAL       │
│  ┌─────────────────────────┐       ┌─────────────────────┐  │
│  │ Campaña     Recup.  %   │       │ [Gráfico de línea]  │  │
│  │ Marzo 1     $45K   32%  │       │ Recuperación        │  │
│  │ Marzo 2     $52K   38%  │       │ mensual últimos     │  │
│  │ Abril 1     $38K   28%  │       │ 6 meses             │  │
│  └─────────────────────────┘       └─────────────────────┘  │
│                                                             │
│  EFECTIVIDAD POR UMBRAL          TIEMPO MEDIO DE COBRO      │
│  ┌─────────────────────────┐       ┌─────────────────────┐  │
│  │ Umbral          Tasa    │       │ [Gráfico de barras] │  │
│  │ Preventivo      45%     │       │ Días promedio por   │  │
│  │ Formal          28%     │       │ rango de mora       │  │
│  │ Judicial        15%     │       │                     │  │
│  └─────────────────────────┘       └─────────────────────┘  │
│                                                             │
│  PREDICCIÓN ML (Próximamente)                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Basado en histórico:                                │    │
│  │ • Próxima campaña proyectada: $65K (±8%)           │    │
│  │ • Probabilidad de pago por cliente: [Lista]        │    │
│  │ • Facturas de alto riesgo: [Alertas]               │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5. Machine Learning para Predicción de Pagos

**Objetivo**: Predecir qué clientes pagarán, cuándo lo harán, y optimizar las estrategias de cobro.

#### Features del Modelo:

```typescript
interface PaymentPredictionFeatures {
  // Datos históricos del cliente
  previous_payments_count: number
  avg_days_to_payment: number
  payment_consistency_score: number  // Varianza en tiempos de pago
  previous_campaign_response: boolean
  
  // Características de la deuda
  days_overdue: number
  amount: number
  invoice_age: number
  
  // Engagement con comunicaciones
  emails_opened: number
  emails_clicked: number
  last_email_open_date: string
  
  // Datos externos
  customer_category: string
  customer_size: 'small' | 'medium' | 'large'
  industry: string
}
```

#### Outputs del Modelo:

```typescript
interface PaymentPrediction {
  customer_id: string
  invoice_id: string
  
  // Probabilidades
  probability_of_payment: number     // 0.0 - 1.0
  confidence_interval: [number, number]
  
  // Temporalidad
  predicted_payment_days: number     // Días estimados hasta pago
  payment_window: [Date, Date]       // Rango probable
  
  // Segmentación
  risk_segment: 'high' | 'medium' | 'low'
  recommended_action: 'standard' | 'intensive' | 'escalate' | 'write_off'
  
  // Explicabilidad
  key_factors: string[]              // Razones principales de la predicción
}
```

#### Aplicaciones del ML:

1. **Priorización de Cobro**: Enfocar esfuerzos en clientes con alta probabilidad
2. **Optimización de Timing**: Enviar recordatorios en el momento óptimo
3. **Prevención de Pérdidas**: Identificar facturas que probablemente no se paguen
4. **Proyección de Flujo de Caja**: Estimar recuperaciones futuras

### 6. Arquitectura de Datos - Fase 2

```sql
-- Tabla de transacciones bancarias
CREATE TABLE bank_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id),
  
  -- Datos del movimiento
  transaction_date DATE NOT NULL,
  transaction_reference VARCHAR(255) NOT NULL,
  description TEXT,
  amount DECIMAL(15,2) NOT NULL,
  transaction_type VARCHAR(50), -- debit, credit
  account_number VARCHAR(100),
  bank_name VARCHAR(100),
  
  -- Datos del pagador (extraídos automáticamente)
  payer_name VARCHAR(255),
  payer_nit VARCHAR(50),
  
  -- Estado de conciliación
  reconciliation_status VARCHAR(50) DEFAULT 'pending',
  -- pending, matched, suggested, unmatched, manual
  
  -- Matching (si aplica)
  matched_invoice_id UUID REFERENCES invoices(id),
  matched_customer_id UUID REFERENCES customers(id),
  match_confidence DECIMAL(3,2),
  match_method VARCHAR(100),
  matched_at TIMESTAMP,
  matched_by VARCHAR(100), -- 'auto', 'agent_email', 'user_manual'
  
  -- Metadatos
  raw_data JSONB, -- Datos originales del archivo
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de pagos reconciliados
CREATE TABLE payment_reconciliations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Relaciones
  bank_transaction_id UUID REFERENCES bank_transactions(id),
  invoice_id UUID REFERENCES invoices(id),
  customer_id UUID REFERENCES customers(id),
  campaign_execution_id UUID REFERENCES collection_executions(id),
  
  -- Datos del pago
  amount_paid DECIMAL(15,2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_method VARCHAR(50),
  reference_number VARCHAR(255),
  
  -- Metadata de conciliación
  reconciliation_source VARCHAR(100), -- 'manual', 'auto_match', 'email_agent'
  confidence_score DECIMAL(3,2),
  agent_decision JSONB, -- Si fue procesado por el agente
  
  -- Auditoría
  created_at TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(100)
);

-- Tabla de predicciones ML
CREATE TABLE payment_predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id),
  invoice_id UUID REFERENCES invoices(id),
  
  -- Predicción
  prediction_date TIMESTAMP DEFAULT NOW(),
  probability_of_payment DECIMAL(5,4),
  predicted_payment_days INTEGER,
  risk_segment VARCHAR(20),
  recommended_action VARCHAR(50),
  
  -- Features usadas (para debugging)
  features_used JSONB,
  
  -- Validación
  actual_outcome BOOLEAN, -- NULL hasta que se confirme
  accuracy_delta DECIMAL(5,4), -- Diferencia predicción vs realidad
  
  -- Modelo
  model_version VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_bank_transactions_business ON bank_transactions(business_id);
CREATE INDEX idx_bank_transactions_status ON bank_transactions(reconciliation_status);
CREATE INDEX idx_bank_transactions_date ON bank_transactions(transaction_date);
CREATE INDEX idx_payments_reconciliation ON payment_reconciliations(campaign_execution_id);
```

---

## Roadmap Futuro

### Fase 2: Cierre del Ciclo (Q2 2025) - **PRIORIDAD ALTA** [🚧 EN PLANIFICACIÓN]

- [ ] **FASE 2.1**: Importación de transacciones bancarias (CSV/Excel/OFX)
- [ ] **FASE 2.2**: Sistema de matching automático de pagos
  - [ ] Algoritmo de matching por referencia exacta
  - [ ] Matching multi-criterio (NIT + monto + fecha)
  - [ ] Matching fuzzy (nombre similar + monto aproximado)
  - [ ] Interfaz de conciliación manual con sugerencias
- [ ] **FASE 2.3**: Agente de conciliación inteligente (procesamiento de emails)
  - [ ] NLP para clasificación de emails
  - [ ] Extracción de entidades (NIT, factura, monto, fecha)
  - [ ] Validación automática en sistema
  - [ ] Creación de tickets de revisión
- [ ] **FASE 2.4**: KPIs de recuperación por campaña
  - [ ] Dashboard de ROI y efectividad
  - [ ] Tasa de recuperación por campaña
  - [ ] Tiempo medio de cobro desde notificación
- [ ] **FASE 2.5**: Machine Learning para predicción de pagos
  - [ ] Modelo de predicción de probabilidad de pago
  - [ ] Segmentación de riesgo (alto/medio/bajo)
  - [ ] Proyección de flujo de caja basada en predicciones

### Fase 3: Canales y Optimización (Q3 2025)

- [ ] Soporte para WhatsApp Business API
- [ ] SMS como canal alternativo
- [ ] Portal de pagos integrado (pasarela propia)
- [ ] Acuerdos de pago automatizados (plan de cuotas)
- [ ] Integración con bureaus de crédito
- [ ] A/B testing automático de plantillas

### Fase 4: Inteligencia Avanzada (Q4 2025)

- [ ] Análisis de sentimiento en respuestas de clientes
- [ ] Chatbot de cobranza para consultas frecuentes
- [ ] Predicción de optimal send time por cliente
- [ ] Auto-escalation a agencias de cobro externas
- [ ] Recomendador de estrategias basado en ML
- [ ] Detección de fraude en pagos

---

## Conclusión

**APEX** (*Adaptic Planning & Execution Platform*) es una plataforma empresarial diseñada para automatizar y optimizar procesos críticos de negocio mediante planificación inteligente y ejecución automatizada.

### Módulo de Collection: El Primer Paso

El **Módulo de Cobranza y Recaudo** representa la primera implementación de APEX, demostrando la arquitectura extensible y las capacidades de la plataforma. Este módulo proporciona una solución integral para la gestión completa del ciclo de cobranza, desde la primera notificación hasta la conciliación final del pago.

#### Fase 1: Comunicaciones Inteligentes (Implementado)

El sistema actual permite:

1. **Recuperar más**: Mayor tasa de conversión mediante comunicaciones personalizadas segmentadas por días de mora
2. **Proteger su marca**: Reputación de email mantenida mediante warm-up gradual y gestión de entregabilidad
3. **Escalar eficientemente**: Procesamiento de miles de clientes con recursos mínimos
4. **Tomar decisiones informadas**: Dashboard en tiempo real con métricas de entrega y engagement

#### Fase 2: Cierre del Ciclo (En Planificación)

La próxima fase transformará el módulo de Collection de un sistema de "notificaciones" a una plataforma de "gestión integral de cobranza":

1. **Medir verdadero impacto**: KPIs de recuperación que relacionan directamente cada campaña con los pagos recibidos
2. **Automatizar conciliación**: Reducción del 70% en tiempo de matching de pagos mediante el Agente Inteligente
3. **Predecir el futuro**: Machine Learning para anticipar comportamientos de pago y optimizar estrategias
4. **Priorizar eficientemente**: El coordinador de cobranza recibe solo los casos que realmente requieren atención humana

### Visión de APEX a Largo Plazo

APEX está diseñado para expandirse más allá del módulo de Collection, incorporando nuevos procesos de negocio que se benefician de la misma arquitectura de:

- **Planificación inteligente** basada en datos históricos y predicciones
- **Ejecución automatizada** con workflows configurables
- **Aprendizaje continuo** mediante Machine Learning
- **Integración completa** entre todos los módulos de la plataforma

Los componentes desarrollados para Collection (sistema de notificaciones, gestión de plantillas, workflows de aprobación, dashboards analíticos) sentarán las bases para futuros módulos de APEX, permitiendo una experiencia unificada y componentes reutilizables.

El módulo de Collection está diseñado para crecer con el negocio, desde pymes hasta grandes empresas con volúmenes masivos de cartera, proporcionando siempre la visibilidad y control necesarios para una gestión de cobranza estratégica y efectiva.

---

*Documentación técnica del Módulo de Collection*
*Plataforma: APEX (Adaptic Planning & Execution Platform)*
*Versión del módulo: 1.0*
*Fase Actual: Fase 1 (Comunicaciones Inteligentes) - Completada*
*Fase Siguiente: Fase 2 (Cierre del Ciclo) - En Planificación*
*Autor: Engineering Team*
*Fecha: 11 de marzo de 2026*
