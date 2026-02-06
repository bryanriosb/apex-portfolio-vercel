# Email Provider Abstraction - Arquitectura Técnica

## Resumen Ejecutivo

Sistema flexible de proveedores de email que permite integrar múltiples servicios (AWS SES, Brevo, etc.) mediante el patrón Factory. Incluye webhooks unificados para tracking de eventos cross-provider.

**Estado**: ✅ Implementado y funcional  
**Proveedores Activos**: AWS SES (default), Brevo  
**Arquitectura**: Factory Pattern + Trait-based polymorphism (Rust)

---

## Arquitectura del Sistema

### Diagrama de Componentes

```mermaid
graph TB
    subgraph "Lambda Email Worker (Rust)"
        Factory[Factory Pattern]
        Trait[EmailProvider Trait]
        SES[SES Provider]
        Brevo[Brevo Provider]
        Factory --> Trait
        Trait --> SES
        Trait --> Brevo
    end
    
    subgraph "Next.js API Webhooks"
        Route[/api/webhooks/email/provider]
        SESParser[SES Parser]
        BrevoParser[Brevo Parser]
        Handler[Email Event Handler]
        Route --> SESParser
        Route --> BrevoParser
        SESParser --> Handler
        BrevoParser --> Handler
    end
    
    subgraph "Database"
        Events[collection_events]
        Clients[collection_clients]
        Handler --> Events
        Handler --> Clients
    end
    
    SES -->|sends email| ASES[AWS SES]
    Brevo -->|sends email| API[Brevo API]
    ASES -->|webhook SNS| Route
    API -->|webhook HTTP| Route
```

---

## 1. Provider Abstraction (Rust Lambda)

### 1.1 Core Trait

**File**: `functions/aws/collection-email-worker/src/email_provider.rs`

```rust
#[async_trait]
pub trait EmailProvider: Send + Sync {
    async fn send_email(&self, message: EmailMessage) 
        -> Result<SendResult, Box<dyn Error + Send + Sync>>;
    fn provider_name(&self) -> &str;
}
```

**Estructuras Clave**:

- `EmailMessage`: Datos unificados (to, from, subject, html, attachments, metadata)
- `SendResult`: Respuesta con message_id y metadata del proveedor

### 1.2 Factory Pattern

**File**: `functions/aws/collection-email-worker/src/factory.rs`

```rust
pub async fn create_email_provider() -> Arc<dyn EmailProvider> {
    let provider_type = std::env::var("EMAIL_PROVIDER")
        .unwrap_or_else(|_| "ses".to_string());
    
    match provider_type.as_str() {
        "brevo" => Arc::new(BrevoProvider::new()),
        "ses" | _ => Arc::new(SesProvider::new().await),
    }
}
```

**Ventajas**:

- ✅ Cambio de proveedor en runtime sin recompilar
- ✅ Fácil agregar nuevos proveedores
- ✅ Testeable con mocks

### 1.3 Implementaciones

#### AWS SES Provider

**File**: `src/providers/ses_provider.rs`

- Usa SDK oficial `aws-sdk-ses`
- Genera emails con `mail-builder`
- Soporta Configuration Set para tracking
- Compatible 100% con implementación anterior

#### Brevo Provider

**File**: `src/providers/brevo_provider.rs`

- API REST transaccional: `POST /v3/smtp/email`
- Headers: `api-key: {BREVO_API_KEY}`
- Attachments convertidos a base64
- Parser de sender: soporta "Name <email@domain.com>"

**Request Body Example**:

```json
{
  "sender": {"name": "Manager", "email": "manager@borls.com"},
  "to": [{"email": "client@example.com"}],
  "subject": "Recordatorio de pago",
  "htmlContent": "<html>...</html>",
  "attachment": [
    {"content": "base64...", "name": "factura.pdf"}
  ]
}
```

---

## 2. Webhook Infrastructure (Next.js)

### 2.1 Dynamic API Route

**File**: `app/api/webhooks/email/[provider]/route.ts`

**Endpoints**:

- `POST /api/webhooks/email/ses` - AWS SES (via SNS)
- `POST /api/webhooks/email/brevo` - Brevo transactional events

**Features**:

- ✅ SNS subscription confirmation (SES)
- ✅ Provider-specific parsing
- ✅ Error handling y logging
- ✅ GET endpoint para health checks

### 2.2 Event Parsers

#### SES Parser

**File**: `lib/webhooks/parsers/ses-parser.ts`

Parsea eventos SNS → formato interno `EmailEvent`:

```typescript
interface EmailEvent {
  messageId: string
  eventType: 'delivered' | 'bounced' | 'opened' | 'complained' | 'failed'
  timestamp: string
  email: string
  metadata?: Record<string, any>
}
```

**Eventos soportados**:

- `Delivery` → delivered
- `Bounce` → bounced (con bounce_type y diagnosticCode)
- `Complaint` → complained
- `Open` → opened

#### Brevo Parser

**File**: `lib/webhooks/parsers/brevo-parser.ts`

Mapea eventos Brevo → mismo formato `EmailEvent`:

| Brevo Event | Internal Event |
|-------------|----------------|
| `delivered` | delivered |
| `hard_bounce`, `soft_bounce`, `blocked`, `invalid_email` | bounced |
| `spam`, `unsubscribed` | complained |
| `opened`, `unique_opened` | opened |
| `error`, `deferred` | failed |

### 2.3 Event Handler

**File**: `lib/webhooks/handlers/email-webhook-handler.ts`

**Flujo de procesamiento**:

1. **Buscar cliente**: Query por `message_id` en `collection_clients.custom_data`
2. **Registrar evento**: Insert en `collection_events` con metadata
3. **Actualizar status**: Update `collection_clients.status` según tipo de evento
4. **Guardar timestamp**: Agregar `{event}_at` en `custom_data`

**Lógica de Status**:

```typescript
delivered  → status: 'delivered'
bounced    → status: 'bounced'
complained → status: 'complained'
opened     → status: 'opened' (solo si status anterior es sent/delivered)
failed     → status: 'failed'
```

---

## 3. Configuration & Environment

### 3.1 Variables de Entorno

**File**: `functions/aws/.env`

```bash
# Provider Selection
EMAIL_PROVIDER=ses|brevo

# Brevo Configuration
BREVO_SMTP_API_URL=https://api.brevo.com/v3/smtp/email
BREVO_API_KEY=xkeysib-xxx...

# AWS Configuration (existente)
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
AWS_REGION=us-east-1
```

### 3.2 Deployment

**File**: `functions/aws/deploy.sh`

Script mejorado que carga automáticamente `.env`:

```bash
# Carga todas las variables de .env
ENV_VARS=$(grep -v '^#' .env | grep -v '^$' | tr '\n' ',' | sed 's/,$//')

# Deploy con env-vars automáticas
cargo lambda deploy \
  --env-vars "${ENV_VARS},APP_ENV=dev,..." \
  collection-email-worker
```

**Uso**:

```bash
cd functions/aws
./deploy.sh
```

---

## 4. Database Schema

### 4.1 collection_events

Tabla que registra todos los eventos de email:

```sql
CREATE TABLE collection_events (
  id UUID PRIMARY KEY,
  execution_id UUID REFERENCES collection_executions(id),
  client_id UUID REFERENCES collection_clients(id),
  event_type TEXT,  -- delivered, bounced, opened, complained, failed
  provider TEXT,    -- ses, brevo
  message_id TEXT,
  event_data JSONB, -- metadata del proveedor
  created_at TIMESTAMP
);
```

### 4.2 collection_clients

Campo `custom_data` almacena:

```json
{
  "message_id": "...",
  "email_sent_at": "2026-02-06T10:00:00Z",
  "delivered_at": "2026-02-06T10:00:05Z",
  "opened_at": "2026-02-06T10:15:00Z"
}
```

---

## 5. Event Flow Comparison

### SES Flow

```
Lambda → AWS SES → Client Inbox
                ↓
              SNS Topic
                ↓
        Next.js Webhook
                ↓
           DB Update
```

### Brevo Flow

```
Lambda → Brevo API → Client Inbox
                  ↓
         Brevo Webhook
                  ↓
         Next.js Webhook
                  ↓
            DB Update
```

---

## 6. Extensibilidad

### Agregar Nuevo Proveedor (ej: SendGrid)

#### Paso 1: Rust Provider

```rust
// src/providers/sendgrid_provider.rs
pub struct SendGridProvider { /* ... */ }

#[async_trait]
impl EmailProvider for SendGridProvider {
    async fn send_email(&self, message: EmailMessage) -> Result<SendResult, ...> {
        // Implementación con SendGrid API
    }
    fn provider_name(&self) -> &str { "SendGrid" }
}
```

#### Paso 2: Factory

```rust
// src/factory.rs
match provider_type.as_str() {
    "sendgrid" => Arc::new(SendGridProvider::new()),
    "brevo" => Arc::new(BrevoProvider::new()),
    "ses" | _ => Arc::new(SesProvider::new().await),
}
```

#### Paso 3: Webhook Parser

```typescript
// lib/webhooks/parsers/sendgrid-parser.ts
export function parseSendGridEvent(body: any): EmailEvent | null {
    // Mapear eventos de SendGrid
}
```

#### Paso 4: API Route

```typescript
// app/api/webhooks/email/[provider]/route.ts
if (provider === 'sendgrid') {
    const event = parseSendGridEvent(body)
    await processEmailEvent('sendgrid', event)
}
```

---

## 7. Configuration por Proveedor

### AWS SES Setup

1. **Lambda**: Default, no requiere cambios
2. **SNS Topic**: Ya configurado → `borls-collection-config`
3. **Webhook**: `https://apex.borls.com/api/webhooks/email/ses`

### Brevo Setup

1. **Environment**:

   ```bash
   EMAIL_PROVIDER=brevo
   BREVO_API_KEY=xkeysib-xxx...
   ```

2. **Brevo Dashboard**:
   - Settings → Webhooks → **Transactional** (no Inbound)
   - URL: `https://apex.borls.com/api/webhooks/email/brevo`
   - Events: `delivered`, `hard_bounce`, `soft_bounce`, `opened`, `spam`

3. **Deploy**:

   ```bash
   cd functions/aws
   ./deploy.sh
   ```

---

## 8. Monitoring & Debugging

### Logs en Lambda

```bash
aws logs tail /aws/lambda/collection-email-worker --follow
```

### Logs en Next.js

```
Vercel Dashboard → Logs
# Buscar: "Webhook received" o "Processed email event"
```

### Testing Webhooks

```bash
# Health check
curl https://apex.borls.com/api/webhooks/email/brevo

# Respuesta esperada:
{
  "status": "Webhook endpoint active",
  "provider": "brevo",
  "supportedProviders": ["ses", "brevo"]
}
```

---

## 9. Métricas y Performance

### Ventajas del Sistema Actual

- ✅ **Flexibilidad**: Cambiar proveedor sin recompilar código
- ✅ **Redundancia**: Failover manual entre proveedores
- ✅ **Observabilidad**: Eventos centralizados en DB
- ✅ **Costo**: Brevo puede ser más económico que SES
- ✅ **Compliance**: Múltiples opciones según región/GDPR

### Limitaciones

- ⚠️ No hay failover automático (requiere cambio manual de `EMAIL_PROVIDER`)
- ⚠️ Webhooks deben configurarse manualmente en cada proveedor
- ⚠️ Rate limiting depende del proveedor seleccionado

---

## 10. Best Practices

### Producción

- ✅ Usar secrets manager para API keys (no hardcodear en .env)
- ✅ Configurar alertas si webhooks fallan
- ✅ Monitorear tasa de bounces por proveedor
- ✅ Implementar retry logic en webhooks

### Testing

- ✅ Test cada proveedor con campaña pequeña primero
- ✅ Verificar que webhooks actualizan DB correctamente
- ✅ Comparar delivery rates entre proveedores

### Seguridad

- ✅ Validar firmas de webhooks (implementado para SNS)
- ✅ Rate limiting en API routes
- ✅ IP whitelisting para webhooks críticos

---

## Referencias

- [AWS SES Documentation](https://docs.aws.amazon.com/ses/)
- [Brevo Transactional API](https://developers.brevo.com/docs/send-a-transactional-email)
- [Brevo Webhooks](https://developers.brevo.com/docs/transactional-webhooks)
