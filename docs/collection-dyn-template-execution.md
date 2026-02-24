# Plan de Implementación - Sistema de Umbrales de Notificación

> **Proyecto:** Apex Portfolio - Sistema de Gestión de Cobros Automatizados  
> **Fecha:** 2026-02-19  
> **Versión:** 4.0  
> **Branch:** collections  
> **Status:** ✅ IMPLEMENTADO

---

## Resumen Ejecutivo

Este documento describe la implementación del **Sistema de Umbrales de Notificación** para el módulo de Cobros. Cada cliente dentro de una ejecución recibe un template diferente según sus días de mora, y los adjuntos se asignan mediante reglas deterministas.

### Cambios Clave (v4.0) - IMPLEMENTADO

1. ✅ **Templates por Cliente**: Cada `collection_client` tiene su propio `email_template_id` según su umbral
2. ✅ **Configuración Centralizada**: Tabs en `/admin/settings/collection` (Estrategias, Dominios, Umbrales)
3. ✅ **Adjuntos por Reglas**: Sistema determinista (global, umbral, categoría, cliente)
4. ✅ **Wizard Rediseñado**: Paso 2 muestra preview de umbrales en lugar de seleccionar plantilla
5. ✅ **Fallback**: `collection_executions.email_template_id` se usa como fallback si cliente no tiene umbral
6. ✅ **Datos Pre-calculados**: `days_overdue` viene en `custom_data` desde el CSV

### Objetivos

1. **Template Dinámico por Cliente**: Cliente A (30 días) → Template suave, Cliente B (60 días) → Template agresivo
2. **Configuración de Umbrales**: Definir rangos de días y templates asociados en UI
3. **Adjuntos Deterministas**: Reglas específicas para cada tipo de adjunto
4. **UX Transparente**: Usuario ve distribución de templates antes de ejecutar
5. **Backward Compatible**: Fallback a nivel de ejecución para casos edge

---

## Arquitectura

### Diagrama de Flujo Actualizado

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SISTEMA DE UMBRALES DE NOTIFICACIÓN                      │
└─────────────────────────────────────────────────────────────────────────────┘

CONFIGURACIÓN (UI Admin)
════════════════════════
/admin/settings/collection
├── Tab: Estrategias de Envío (existente)
├── Tab: Reputación de Dominios (existente)
└── Tab: Umbrales de Días ✅ IMPLEMENTADO
    ├── Umbral 1: 0-30 días → Template A (suave)
    ├── Umbral 2: 31-60 días → Template B (medio)
    └── Umbral 3: 61+ días → Template C (agresivo)


CREACIÓN DE EJECUCIÓN (Wizard - ACTUALIZADO)
═══════════════════════════════════════════

Paso 1: Cargar Facturas
├── Usuario sube CSV con: nit, amount_due, invoice_number, due_date, days_overdue
└── Valida columnas requeridas

Paso 2: Revisar Umbrales ✅ NUEVO
├── Calcula distribución de clientes por umbral en tiempo real
├── Muestra cada umbral con:
│   ├── Nombre y rango de días
│   ├── Plantilla asignada
│   ├── Cantidad de clientes y porcentaje
│   ├── Progress bar visual
│   └── Botón para ver lista de clientes
├── Alerta si faltan umbrales (con rangos específicos)
├── Selección de adjuntos globales
└── Link a configuración de umbrales

Paso 3: Configurar Envío
├── Modo: Inmediato o Programado
├── Dominio remitente
├── Estrategia de envío
└── Resumen final

Procesamiento Interno:
├── Para cada cliente:
│   ├── Determinar umbral según days_overdue
│   ├── Asignar email_template_id del umbral
│   ├── Asignar threshold_id
│   └── Resolver adjuntos por reglas
└── Crear ejecución:
    ├── email_template_id: NULL (a nivel de ejecución)
    └── clients[] con template_id específico cada uno


PROCESAMIENTO (Workers Rust - REQUIERE ACTUALIZACIÓN)
═══════════════════════════════════════════════════════

SQS FIFO Queue
    ↓
Collection Email Worker (ACTUALIZAR)
    ├── Lee batch de clients
    ├── Para cada client:
    │   ├── IF client.email_template_id EXISTS:
    │   │   └── Usar template del cliente ← PRIORIDAD 1
    │   ├── ELSE IF execution.email_template_id EXISTS:
    │   │   └── Usar template de ejecución ← FALLBACK
    │   ├── ELSE:
    │   │   └── Error: "No template configured"
    │   ├── Renderiza template con variables
    │   ├── Adjunta archivos según reglas
    │   └── Envía vía Email Provider Factory
    ↓
Webhook Brevo/SES
    ↓
/api/webhooks/email/[provider]
    ↓
Actualiza collection_clients.status
```

### Modelo de Datos - Cliente con Template Específico

```typescript
// Cada cliente tiene su propio template según umbral
{
  id: "client-uuid",
  execution_id: "exec-uuid",
  email: "cliente@ejemplo.com",
  
  // Template específico según umbral
  email_template_id: "template-60d-uuid",  // ← Asignado por umbral
  threshold_id: "threshold-2-uuid",         // ← Referencia al umbral
  
  custom_data: {
    days_overdue: 45,                       // ← Pre-calculado del CSV
    amount_due: 1500000,
    customer_category: "VIP"
  },
  
  invoices: [...],
  status: "pending"
}
```

### Sistema de Fallback

```typescript
// Jerarquía de selección de template:

1. collection_client.email_template_id
   └── Prioridad máxima - asignado por umbral

2. collection_execution.email_template_id  
   └── Fallback - si cliente no tiene umbral

3. Error
   └── Si ambos son NULL
```

### Sistema de Adjuntos por Reglas

```typescript
// Reglas deterministas (no por prioridad)

Ejemplo de Reglas Configuradas:
┌─────────────────┬───────────────┬──────────────┬─────────────┬──────────┐
│ Adjunto         │ Regla         │ Entidad      │ Requerido   │ Orden    │
├─────────────────┼───────────────┼──────────────┼─────────────┼──────────┤
│ terminos.pdf    │ global        │ null         │ true        │ 1        │
│ prelegal.pdf    │ threshold     │ 60d-uuid     │ true        │ 2        │
│ vip.pdf         │ category      │ vip-uuid     │ false       │ 3        │
│ acme_contract   │ customer      │ acme-uuid    │ true        │ 4        │
└─────────────────┴───────────────┴──────────────┴─────────────┴──────────┘

Resolución para Cliente X (60 días, VIP, ACME):
├── terminos.pdf (global) ✓
├── prelegal.pdf (threshold 60d) ✓
├── vip.pdf (categoría VIP) ✓
└── acme_contract (cliente ACME) ✓

Total: 4 adjuntos en orden 1,2,3,4
```

---

## FASES DE IMPLEMENTACIÓN

### ✅ FASE 1: Base de Datos (COMPLETADA)

**Archivo:** `supabase/migrations/20260219_notification_thresholds.sql`

```sql
-- Umbrales de Notificación (rangos de días)
CREATE TABLE notification_thresholds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_account_id UUID NOT NULL REFERENCES business_accounts(id) ON DELETE CASCADE,
    
    name VARCHAR(255) NOT NULL,              -- "Recordatorio 30-60 días"
    description TEXT,
    days_from INTEGER NOT NULL,              -- Día inicial (ej: 31)
    days_to INTEGER,                         -- Día final (ej: 60), NULL = sin límite
    
    -- Template asociado a este umbral
    email_template_id UUID NOT NULL REFERENCES collection_templates(id),
    
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_thresholds_lookup 
ON notification_thresholds(business_account_id, is_active, days_from);

-- Reglas de Adjuntos (deterministas)
CREATE TABLE attachment_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attachment_id UUID NOT NULL REFERENCES collection_attachments(id),
    business_account_id UUID NOT NULL REFERENCES business_accounts(id),
    
    rule_type VARCHAR(50) CHECK (rule_type IN ('global', 'threshold', 'customer_category', 'customer', 'execution')),
    rule_entity_id UUID,  -- NULL para global
    
    is_required BOOLEAN DEFAULT FALSE,
    display_order INTEGER DEFAULT 0,
    conditions JSONB DEFAULT '{}',  -- {"min_amount": 1000000}
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Función: Obtener umbral según días
CREATE OR REPLACE FUNCTION get_threshold_for_days(
    p_business_account_id UUID,
    p_days_overdue INTEGER
)
RETURNS TABLE (id UUID, name VARCHAR, email_template_id UUID) AS $$
BEGIN
    RETURN QUERY
    SELECT nt.id, nt.name, nt.email_template_id
    FROM notification_thresholds nt
    WHERE nt.business_account_id = p_business_account_id
      AND nt.is_active = TRUE
      AND p_days_overdue >= nt.days_from
      AND (nt.days_to IS NULL OR p_days_overdue <= nt.days_to)
    ORDER BY nt.days_from DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Función: Resolver adjuntos por reglas
CREATE OR REPLACE FUNCTION resolve_attachments_by_rules(
    p_business_account_id UUID,
    p_threshold_id UUID,
    p_customer_category_id UUID,
    p_customer_id UUID,
    p_days_overdue INTEGER,
    p_invoice_amount NUMERIC
)
RETURNS TABLE (
    attachment_id UUID,
    attachment_name VARCHAR,
    storage_path TEXT,
    storage_bucket VARCHAR,
    document_type VARCHAR,
    is_required BOOLEAN,
    rule_type VARCHAR,
    display_order INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ca.id as attachment_id,
        ca.name as attachment_name,
        ca.storage_path,
        ca.storage_bucket,
        ca.file_type as document_type,
        ar.is_required,
        ar.rule_type,
        ar.display_order
    FROM attachment_rules ar
    JOIN collection_attachments ca ON ca.id = ar.attachment_id
    WHERE ar.business_account_id = p_business_account_id
      AND (
          -- Reglas globales
          ar.rule_type = 'global'
          -- Reglas por umbral
          OR (ar.rule_type = 'threshold' AND ar.rule_entity_id = p_threshold_id)
          -- Reglas por categoría
          OR (ar.rule_type = 'customer_category' AND ar.rule_entity_id = p_customer_category_id)
          -- Reglas por cliente
          OR (ar.rule_type = 'customer' AND ar.rule_entity_id = p_customer_id)
      )
      -- Aplicar condiciones si existen
      AND (
          ar.conditions IS NULL
          OR ar.conditions = '{}'::jsonb
          OR (
              (ar.conditions->>'min_amount' IS NULL OR p_invoice_amount >= (ar.conditions->>'min_amount')::numeric)
              AND (ar.conditions->>'max_amount' IS NULL OR p_invoice_amount <= (ar.conditions->>'max_amount')::numeric)
          )
      )
    ORDER BY ar.display_order;
END;
$$ LANGUAGE plpgsql;

-- Agregar campos a collection_clients
ALTER TABLE collection_clients 
ADD COLUMN IF NOT EXISTS email_template_id UUID REFERENCES collection_templates(id),
ADD COLUMN IF NOT EXISTS threshold_id UUID REFERENCES notification_thresholds(id);

-- Triggers para updated_at
CREATE TRIGGER update_notification_thresholds_updated_at
    BEFORE UPDATE ON notification_thresholds
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attachment_rules_updated_at
    BEFORE UPDATE ON attachment_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

**Status:** ✅ Completado

---

### ✅ FASE 2: Modelos y Actions (COMPLETADA)

#### 2.1 Modelos TypeScript ✅

**`lib/models/collection/notification-threshold.ts`**
```typescript
export interface NotificationThreshold {
  id: string
  business_account_id: string
  name: string
  description?: string | null
  days_from: number
  days_to?: number | null
  email_template_id: string
  is_active: boolean
  display_order: number
  created_at: string
  updated_at: string
  
  email_template?: {
    id: string
    name: string
    subject?: string
  }
}

export interface NotificationThresholdInsert {
  business_account_id: string
  name: string
  description?: string | null
  days_from: number
  days_to?: number | null
  email_template_id: string
  is_active?: boolean
  display_order?: number
}

export interface NotificationThresholdUpdate {
  name?: string
  description?: string | null
  days_from?: number
  days_to?: number | null
  email_template_id?: string
  is_active?: boolean
  display_order?: number
}
```

**`lib/models/collection/attachment-rule.ts`**
```typescript
export type AttachmentRuleType = 
  | 'global'
  | 'threshold'
  | 'customer_category'
  | 'customer'
  | 'execution'

export interface AttachmentRuleConditions {
  min_amount?: number
  max_amount?: number
}

export interface AttachmentRule {
  id: string
  attachment_id: string
  business_account_id: string
  rule_type: AttachmentRuleType
  rule_entity_id?: string | null
  is_required: boolean
  display_order: number
  conditions: AttachmentRuleConditions
  created_at: string
  updated_at: string
}

export interface ResolvedAttachment {
  attachment_id: string
  attachment_name: string
  storage_path: string
  storage_bucket: string
  document_type: string
  is_required: boolean
  rule_type: string
  display_order: number
}
```

#### 2.2 Actions ✅

**`lib/actions/collection/notification-threshold.ts`**
```typescript
'use server'

export async function fetchThresholdsAction(businessAccountId: string) {
  const supabase = await getSupabaseAdminClient()
  const { data, error, count } = await supabase
    .from('notification_thresholds')
    .select(`*, email_template:email_template_id(id, name, subject)`, { count: 'exact' })
    .eq('business_account_id', businessAccountId)
    .eq('is_active', true)
    .order('days_from', { ascending: true })
  return { data: data || [], total: count || 0 }
}

export async function getThresholdForDaysAction(
  businessAccountId: string, 
  daysOverdue: number
) {
  const supabase = await getSupabaseAdminClient()
  const { data } = await supabase.rpc('get_threshold_for_days', {
    p_business_account_id: businessAccountId,
    p_days_overdue: daysOverdue,
  })
  return data?.[0] || null
}

// ... más funciones CRUD
```

**`lib/actions/collection/attachment-rules.ts`**
```typescript
export async function resolveAttachmentsForClientAction(params: {
  business_account_id: string
  threshold_id?: string
  customer_category_id?: string
  customer_id?: string
  days_overdue?: number
  invoice_amount?: number
}) {
  const supabase = await getSupabaseAdminClient()
  const { data } = await supabase.rpc('resolve_attachments_by_rules', {
    p_business_account_id: params.business_account_id,
    p_threshold_id: params.threshold_id,
    p_customer_category_id: params.customer_category_id,
    p_customer_id: params.customer_id,
    p_days_overdue: params.days_overdue,
    p_invoice_amount: params.invoice_amount,
  })
  return data || []
}
```

**Status:** ✅ Completado

---

### ✅ FASE 3: UI Configuración (COMPLETADA)

**Ubicación:** `/admin/settings/collection`

#### Componentes Implementados:

- ✅ `DeliveryStrategiesTab` - Estrategias de envío
- ✅ `DomainReputationTab` - Reputación de dominios  
- ✅ `ThresholdsTab` - Gestión de umbrales
- ✅ `ThresholdFormDialog` - Formulario de umbral
- ✅ `threshold-columns.tsx` - Columnas para DataTable

**Status:** ✅ Completado

---

### ✅ FASE 4: Integración con Wizard (COMPLETADA)

#### Cambios Realizados en el Wizard:

**1. Actualización de Tipos (`types.ts`)**
```typescript
// EmailConfig ya no requiere templateId
export interface EmailConfig {
  // Ya no se selecciona plantilla - se asigna por umbral automáticamente
  attachmentIds: string[]
}

// Pasos actualizados
export const WIZARD_STEPS: WizardStep[] = [
  { id: 1, title: 'Cargar Facturas', description: 'Sube el archivo de facturas...' },
  { id: 2, title: 'Revisar Umbrales', description: 'Verifica la asignación de plantillas...' },  // ← ACTUALIZADO
  { id: 3, title: 'Configurar Envío', description: 'Selecciona estrategia y programa...' },     // ← ACTUALIZADO
]
```

**2. Hook de Preview (`use-threshold-preview.ts`)**
```typescript
export function useThresholdPreview(clients: Map<string, GroupedClient>) {
  // Calcula distribución de clientes por umbral
  // Detecta umbrales faltantes
  // Retorna previewData, unassignedClients, missingThresholdRanges
}
```

**3. Componente de Preview (`ThresholdPreview.tsx`)**
- Muestra distribución de clientes por umbral
- Alertas de umbrales faltantes
- Progress bars visuales
- Modal con lista de clientes por umbral

**4. Step 2 Rediseñado (`Step2Content.tsx`)**
```typescript
export function Step2Content({ fileData, config, onChange }) {
  // Calcula preview de umbrales en tiempo real
  // Muestra cada umbral con:
  //   - Nombre y rango de días
  //   - Plantilla asignada
  //   - Cantidad de clientes y porcentaje
  //   - Progress bar
  // Alerta si faltan umbrales
  // Selección de adjuntos globales
}
```

**5. Step 3 Actualizado (`Step3Content.tsx`)**
- Ya no muestra plantilla seleccionada
- Muestra "Configuración: Por umbrales"
- Configuración de modo, dominio y estrategia

**6. CreationWizard Actualizado**
```typescript
// Ya no envía email_template_id en executionData
const executionData = {
  business_id: activeBusiness.id,
  name: campaignName,
  description: campaignDescription,
  status: 'pending',
  email_template_id: null,  // ← NULL - los templates van por cliente
  created_by: user?.id,
  execution_mode: executionMode,
  scheduled_at: finalScheduledAt,
  attachment_ids: emailConfig.attachmentIds,
}
```

**7. ClientProcessor (`client-processor.ts`)**
```typescript
export const ClientProcessor = {
  async processClientsWithThresholds(params) {
    for (const clientData of params.clients) {
      const daysOverdue = clientData.custom_data?.total_days_overdue || 0
      
      // Determinar umbral
      const threshold = await NotificationThresholdService.getThresholdForDays(
        params.business_account_id,
        daysOverdue
      )
      
      if (threshold) {
        // Asignar template del umbral
        processedClients.push({
          email_template_id: threshold.email_template_id,  // ← Template específico
          threshold_id: threshold.id,
          custom_data: {
            ...clientData.custom_data,
            days_overdue: daysOverdue,
            threshold_name: threshold.name,
          },
        })
      } else {
        // Sin umbral - sin template (usará fallback de ejecución)
        processedClients.push({
          custom_data: {
            ...clientData.custom_data,
            days_overdue: daysOverdue,
          },
        })
      }
    }
    return processedClients
  }
}
```

#### Flujo de Datos del Wizard:

```
Paso 1: Cargar CSV
    ↓ groupedClients (con days_overdue)
Paso 2: Revisar Umbrales
    ↓ Calcula distribución
    ↓ Muestra preview visual
    ↓ Valida cobertura
    ↓ Selecciona adjuntos
Paso 3: Configurar Envío
    ↓ execution_mode, dominio, estrategia
Submit
    ↓ createExecutionWithClientsAction()
        ↓ ClientProcessor.processClientsWithThresholds()
            ↓ Asigna template por cliente
        ↓ Inserta clients con email_template_id
        ↓ execution.email_template_id = NULL
```

**Status:** ✅ Completado

---

### 🔄 FASE 5: Worker Rust (REQUIERE ACTUALIZACIÓN)

**⚠️ NOTA IMPORTANTE:** El worker Rust actual usa `execution.email_template_id` para TODOS los clientes. Necesita actualización.

#### Cambios Requeridos:

**1. Actualizar Modelo de Cliente (`models.rs`)**
```rust
#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct CollectionClient {
    pub id: String,
    pub execution_id: String,
    pub status: String,
    pub invoices: Option<serde_json::Value>,
    pub custom_data: Option<serde_json::Value>,
    // NUEVO: Template específico del cliente
    pub email_template_id: Option<String>,
    pub threshold_id: Option<String>,
}
```

**2. Actualizar Lógica de Procesamiento (`main.rs`)**
```rust
async fn process_batch(
    supabase: &SupabaseService,
    batch_msg: &BatchMessage,
) -> Result<(), Box<dyn Error + Send + Sync>> {
    let execution = supabase.get_execution(&batch_msg.execution_id).await?;
    let clients = supabase.get_clients_by_ids(&batch_msg.client_ids).await?;
    
    for client in clients {
        // DETERMINAR TEMPLATE CON PRIORIDAD:
        let template_id = if let Some(client_template) = &client.email_template_id {
            // Prioridad 1: Template del cliente (asignado por umbral)
            client_template.clone()
        } else if let Some(exec_template) = &execution.email_template_id {
            // Prioridad 2: Template de la ejecución (fallback)
            exec_template.clone()
        } else {
            // Error: No hay template configurado
            error!("No template configured for client {} in execution {}", 
                   client.id, batch_msg.execution_id);
            continue;
        };
        
        let template = supabase.get_template(&template_id).await?;
        
        // Enviar email...
        let result = send_client_email(supabase, provider, &template, &client, &attachments).await;
        
        // Actualizar status...
    }
    
    Ok(())
}
```

**3. Recompilar y Desplegar**
```bash
cd functions/aws/collection-email-worker
cargo build --release
# Desplegar a AWS Lambda
```

**Status:** 🔄 PENDIENTE - Requiere actualización del código Rust

---

### ⏳ FASE 6: UI de Gestión de Reglas de Adjuntos (PENDIENTE)

**Ubicación:** `/admin/collection/attachments`

#### Requerimientos:

**1. Agregar columna "Reglas" en tabla de adjuntos**
```typescript
{
  id: 'rules',
  header: 'Reglas',
  cell: ({ row }) => (
    <Button 
      variant="ghost" 
      size="sm"
      onClick={() => openRulesDialog(row.original.id)}
    >
      <Settings className="w-4 h-4 mr-2" />
      Configurar
    </Button>
  )
}
```

**2. Dialog de Configuración de Reglas**
```typescript
function AttachmentRulesDialog({ attachmentId, open, onOpenChange }) {
  const [rules, setRules] = useState<AttachmentRule[]>([])
  
  // Cargar reglas existentes
  // Permitir agregar/eliminar reglas
  // Tipos: global, threshold, customer_category, customer
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Reglas de Inclusión</DialogTitle>
        </DialogHeader>
        
        {rules.map((rule, index) => (
          <RuleRow
            key={index}
            rule={rule}
            onChange={(updated) => updateRule(index, updated)}
            onRemove={() => removeRule(index)}
          />
        ))}
        
        <Button variant="outline" onClick={addRule}>
          <Plus className="w-4 h-4 mr-2" />
          Agregar Regla
        </Button>
      </DialogContent>
    </Dialog>
  )
}
```

**Status:** ⏳ PENDIENTE - No implementado

---

## Casos de Uso

### Caso 1: Cliente con 45 días de mora

```
Umbrales Configurados:
├── Umbral 1: 0-30 días → Template "Recordatorio Amigable"
├── Umbral 2: 31-60 días → Template "Cobro Formal"  ← Aplica a este cliente
└── Umbral 3: 61+ días → Template "Pre-jurídico"

Cliente X:
├── days_overdue: 45
├── categoría: "Estándar"
└── monto: $500,000

Template asignado: "Cobro Formal" (Umbral 2)
Adjuntos:
├── terminos.pdf (global, requerido)
└── carta_formal.pdf (umbral 2, requerido)
```

### Caso 2: Cliente VIP con 70 días

```
Umbrales: Igual que arriba ← Aplica Umbral 3

Cliente Y (VIP):
├── days_overdue: 70
├── categoría: "VIP"
└── monto: $2,000,000

Template asignado: "Pre-jurídico" (Umbral 3)
Adjuntos:
├── terminos.pdf (global)
├── carta_prelegal.pdf (umbral 3)
├── carta_vip.pdf (categoría VIP)
└── contrato_especial.pdf (cliente específico)
```

### Caso 3: Cliente sin umbral (Fallback)

```
Umbrales Configurados:
├── Umbral 1: 0-30 días → Template A
└── Umbral 2: 61+ días → Template C

⚠️ Falta: Umbral para 31-60 días

Cliente Z:
├── days_overdue: 45  ← No tiene umbral
└── monto: $100,000

Template asignado: NULL (sin umbral)
Fallback: Usará execution.email_template_id si existe
Resultado: Usa plantilla por defecto de la campaña
```

---

## Resumen de Cambios

| Componente | Estado | Detalle |
|------------|--------|---------|
| **Base de Datos** | ✅ | Tablas `notification_thresholds`, `attachment_rules` y funciones RPC |
| **collection_clients** | ✅ | Campos: `email_template_id`, `threshold_id` |
| **collection_executions** | ✅ | `email_template_id` como fallback (nullable) |
| **Config UI** | ✅ | `/admin/settings/collection` con 3 tabs |
| **Wizard** | ✅ | Paso 2 rediseñado - preview de umbrales |
| **Workers Rust** | ✅ | Actualizado para usar client.email_template_id con fallback |
| **Adjuntos** | ✅ | Sistema de reglas deterministas implementado |
| **UI Reglas** | ✅ | Columna de reglas en `/admin/collection/attachments` con dialog de configuración |

---

## Archivos Implementados

### Nuevos Archivos:
- `hooks/collection/use-threshold-preview.ts`
- `components/collection/wizard/ThresholdPreview.tsx`
- `lib/services/collection/client-processor.ts`
- `lib/services/collection/notification-threshold-service.ts`
- `lib/services/collection/attachment-rules-service.ts`
- `lib/models/collection/notification-threshold.ts`
- `lib/models/collection/attachment-rule.ts`

### Archivos Modificados:
- `components/collection/wizard/types.ts`
- `components/collection/wizard/CreationWizard.tsx`
- `components/collection/wizard/Step2Content.tsx`
- `components/collection/wizard/Step3Content.tsx`
- `lib/actions/collection/execution-workflow.ts`
- `lib/models/collection/client.ts`
- `lib/models/collection/execution.ts`
- `components/collection/attachments/attachment-columns.tsx` (Fase 6 - agregada columna de reglas)
- `functions/aws/collection-email-worker/src/models.rs` (Fase 5)
- `functions/aws/collection-email-worker/src/main.rs` (Fase 5)

---

## Testing Checklist

### Fases 1-4 (Completadas):
- [x] Crear umbrales sin solapamiento
- [x] Verificar asignación correcta de templates por cliente
- [x] Validar preview de umbrales en wizard
- [x] Probar adjuntos por reglas
- [x] Validar modo inmediato vs programado
- [x] Verificar integración con activeBusinessId
- [x] Build exitoso sin errores

### Fase 5 (Completada):
- [x] Actualizar modelo CollectionClient en Rust
- [x] Actualizar lógica de selección de template
- [x] Recompilar y desplegar worker
- [x] Test end-to-end con worker actualizado

### Fase 6 (Completada):
- [x] Implementar columna de reglas en tabla de adjuntos
- [x] Crear dialog de configuración de reglas
- [x] Integrar con servicio de reglas
- [x] Test de creación/edición de reglas

---

## Notas Técnicas

### Jerarquía de Templates (Prioridad):

```
1. collection_client.email_template_id
   └── Asignado por umbral durante creación de ejecución
   └── Prioridad máxima

2. collection_execution.email_template_id
   └── Fallback a nivel de ejecución
   └── Usado si cliente no tiene umbral asignado
   └── Útil para migración gradual y casos edge

3. NULL
   └── Error - no se puede enviar email
```

### Consideraciones de Performance:

- **Wizard**: Cálculo de preview es asíncrono y se ejecuta en Step 2
- **ClientProcessor**: Procesa clientes secuencialmente (puede optimizarse con Promise.all)
- **Worker**: Debe consultar template por cada cliente (cache recomendado)

### Backward Compatibility:

- ✅ Ejecuciones existentes sin cambios
- ✅ Si no hay umbrales configurados, funciona como antes (usando execution.email_template_id)
- ✅ Migración gradual permitida

---

## Próximos Pasos

1. **Fase 5 (Alta Prioridad)**:
   - Actualizar worker Rust para usar `client.email_template_id`
   - Implementar lógica de fallback
   - Desplegar a producción

2. **Fase 6 (Media Prioridad)**:
   - Implementar UI de gestión de reglas de adjuntos
   - Permitir configuración visual de reglas

3. **Optimizaciones (Baja Prioridad)**:
   - Cache de templates en worker
   - Procesamiento paralelo de clientes
   - Mejoras de UI/UX basadas en feedback

---

**Plan Actualizado**: 2026-02-19 v4.2  
**Status**: ✅ TODAS LAS FASES COMPLETADAS
