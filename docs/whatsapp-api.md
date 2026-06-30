# Guía de Integración WhatsApp Business Cloud API

## 1. Resumen Ejecutivo

Esta guía documenta la integración completa con **WhatsApp Business Cloud API** tal como está implementada en el proyecto actual. Está escrita de forma **agnóstica al lenguaje de programación**: describe los contratos HTTP, el esquema de base de datos, los flujos de datos y las decisiones de arquitectura, con ejemplos prácticos en `curl`.

El proyecto actual usa **Next.js 14 + Supabase**, pero los conceptos aquí descritos pueden replicarse en cualquier stack que pueda:

- Recibir y responder peticiones HTTP.
- Almacenar configuraciones, mensajes y conversaciones en una base de datos relacional.
- Realizar peticiones HTTPS a `graph.facebook.com`.
- Ejecutar lógica programada para recordatorios.

> **Nota importante**: el documento anterior (`whatsapp-api.md` previo) describía una API standalone en Rust que nunca fue implementada. Esta versión refleja el código real del repositorio.

---

## 2. Arquitectura Conceptual

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Meta Cloud API                                 │
│                    https://graph.facebook.com/v21.0                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                      ▲
                                      │ HTTPS /messages
                                      │ HTTPS /{media_id}
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Tu Aplicación (cualquier stack)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │  Config CRUD │  │Send / Receive│  │   Webhook    │  │  Scheduled   │   │
│  │              │  │   Messages   │  │   Handler    │  │  Reminders   │   │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘   │
│         └──────────────────┴──────────────────┘               │           │
│                            │                                  │           │
│                            ▼                                  ▼           │
│                   ┌─────────────────┐              ┌─────────────────┐    │
│                   │   Capa de DB    │              │   Cron / Jobs   │    │
│                   │  (PostgreSQL)   │              │   Programados   │    │
│                   └─────────────────┘              └─────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Principios de diseño

| Principio | Descripción |
|-----------|-------------|
| **Multi-tenant** | Cada `business_account_id` puede tener su propio número. Opcionalmente, cada `business_id` puede tener configuración propia. |
| **Resolución jerárquica** | Se resuelve config en 3 niveles: `business_id` → `business_account_id` → config compartida. |
| **Conversaciones de 24h** | WhatsApp permite mensajes de sesión solo dentro de la ventana de conversación. Fuera de ella se debe usar templates aprobados. |
| **Persistencia completa** | Todos los mensajes entrantes, salientes y cambios de estado se guardan en DB. |
| **Templates primero** | Para notificaciones proactivas siempre se intenta enviar un template aprobado; el mensaje de texto libre solo funciona dentro de la ventana de 24h. |

---

## 3. Glosario

| Término | Significado |
|---------|-------------|
| `business_account_id` | Identificador de la cuenta de negocio en tu plataforma (equivalente a un tenant principal). |
| `business_id` | Identificador de una sucursal o negocio específico dentro de una cuenta. |
| `phone_number_id` | ID del número de teléfono registrado en Meta Cloud API. Se usa en la URL de envío. |
| `whatsapp_business_account_id` | ID de la cuenta de WhatsApp Business (WABA) en Meta. |
| `access_token` | Token permanente de Meta con permisos `whatsapp_business_messaging` y `whatsapp_business_management`. |
| `webhook_verify_token` | Token compartido entre tu app y Meta para validar la suscripción del webhook. |
| `display_phone_number` | Número de teléfono formateado para mostrar al cliente (ej: `+573001234567`). |
| `wamid.xxx` | ID del mensaje asignado por Meta. Se usa para rastrear estado. |

---

## 4. Esquema de Base de Datos

Este es el esquema mínimo que el código actual espera encontrar en la base de datos. Las tablas deben llamarse exactamente así y contener al menos estos campos.

### 4.1 `whatsapp_configs`

Almacena la configuración de cada número de WhatsApp.

```sql
CREATE TYPE whatsapp_config_status AS ENUM (
  'active',
  'inactive',
  'pending_verification'
);

CREATE TABLE whatsapp_configs (
    id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_account_id             UUID,
    business_id                     UUID,
    phone_number_id                 TEXT NOT NULL,
    whatsapp_business_account_id    TEXT NOT NULL,
    access_token                    TEXT NOT NULL,
    webhook_verify_token            TEXT NOT NULL,
    display_phone_number            TEXT,
    status                          whatsapp_config_status DEFAULT 'active',
    is_shared                       BOOLEAN DEFAULT FALSE,
    is_enabled                      BOOLEAN DEFAULT TRUE,
    created_at                      TIMESTAMPTZ DEFAULT NOW(),
    updated_at                      TIMESTAMPTZ DEFAULT NOW(),

    -- Una sola config por (business_account_id, business_id), permitiendo NULLs
    CONSTRAINT uq_whatsapp_configs_business
        UNIQUE NULLS NOT DISTINCT (
            business_account_id,
            business_id
        )
);

CREATE INDEX idx_whatsapp_configs_account
    ON whatsapp_configs(business_account_id);

CREATE INDEX idx_whatsapp_configs_business
    ON whatsapp_configs(business_id);

CREATE INDEX idx_whatsapp_configs_phone_number
    ON whatsapp_configs(phone_number_id);

CREATE INDEX idx_whatsapp_configs_shared
    ON whatsapp_configs(is_shared)
    WHERE is_shared = TRUE;
```

**Reglas de negocio para esta tabla:**

- `is_shared = TRUE` indica que es el número global fallback. Solo debe existir una.
- Si `business_id IS NULL` y `is_shared = FALSE`, la config pertenece a toda la `business_account_id`.
- Si `business_id IS NOT NULL` y `is_shared = FALSE`, la config es exclusiva de esa sucursal.
- `is_enabled = FALSE` desactiva el envío para esa config.

### 4.2 `whatsapp_conversations`

Representa una conversación activa de 24h entre un cliente y un negocio.

```sql
CREATE TABLE whatsapp_conversations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_account_id UUID NOT NULL,
    business_id         UUID NOT NULL,
    phone               TEXT NOT NULL,
    customer_name       TEXT,
    last_message_at     TIMESTAMPTZ DEFAULT NOW(),
    expires_at          TIMESTAMPTZ,
    is_active           BOOLEAN DEFAULT TRUE,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_whatsapp_conversations_lookup
    ON whatsapp_conversations(business_id, phone, is_active, expires_at);

CREATE INDEX idx_whatsapp_conversations_active
    ON whatsapp_conversations(is_active)
    WHERE is_active = TRUE;
```

**Comportamiento esperado:**

- `expires_at` debe calcularse como `NOW() + INTERVAL '24 hours'` cada vez que llega o sale un mensaje.
- `is_active` debe ser `FALSE` cuando `expires_at < NOW()`.
- Debe existir como máximo una conversación activa por `(business_id, phone)`.

### 4.3 `whatsapp_messages`

Almacena todos los mensajes entrantes y salientes.

```sql
CREATE TYPE whatsapp_message_type AS ENUM (
  'text',
  'image',
  'document',
  'audio',
  'video',
  'template',
  'interactive'
);

CREATE TYPE whatsapp_message_status AS ENUM (
  'pending',
  'sent',
  'delivered',
  'read',
  'failed'
);

CREATE TABLE whatsapp_messages (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_account_id UUID NOT NULL,
    business_id         UUID NOT NULL,
    conversation_id     UUID REFERENCES whatsapp_conversations(id),
    whatsapp_message_id TEXT,
    to_phone            TEXT NOT NULL,
    from_phone          TEXT,
    direction           TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    message_type        whatsapp_message_type NOT NULL,
    content             TEXT,
    media_url           TEXT,
    template_name       TEXT,
    status              whatsapp_message_status DEFAULT 'pending',
    error_message       TEXT,
    sent_at             TIMESTAMPTZ,
    delivered_at        TIMESTAMPTZ,
    read_at             TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_whatsapp_messages_business
    ON whatsapp_messages(business_id);

CREATE INDEX idx_whatsapp_messages_conversation
    ON whatsapp_messages(conversation_id);

CREATE INDEX idx_whatsapp_messages_whatsapp_id
    ON whatsapp_messages(whatsapp_message_id);

CREATE INDEX idx_whatsapp_messages_phones
    ON whatsapp_messages(to_phone, from_phone);

CREATE INDEX idx_whatsapp_messages_created
    ON whatsapp_messages(business_id, created_at DESC);
```

### 4.4 `whatsapp_scheduled_reminders`

Cola de recordatorios de citas programados para envío futuro.

```sql
CREATE TYPE whatsapp_reminder_type AS ENUM (
  'appointment_reminder',
  'appointment_confirmation',
  'custom'
);

CREATE TYPE whatsapp_reminder_status AS ENUM (
  'pending',
  'sent',
  'failed',
  'cancelled'
);

CREATE TABLE whatsapp_scheduled_reminders (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id      UUID NOT NULL,
    business_account_id UUID NOT NULL,
    business_id         UUID NOT NULL,
    customer_phone      TEXT NOT NULL,
    customer_name       TEXT NOT NULL,
    scheduled_for       TIMESTAMPTZ NOT NULL,
    reminder_type       whatsapp_reminder_type DEFAULT 'appointment_reminder',
    status              whatsapp_reminder_status DEFAULT 'pending',
    error_message       TEXT,
    sent_at             TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT uq_whatsapp_scheduled_reminders_appointment
        UNIQUE (appointment_id, reminder_type, scheduled_for)
);

CREATE INDEX idx_whatsapp_scheduled_reminders_pending
    ON whatsapp_scheduled_reminders(status, scheduled_for)
    WHERE status = 'pending';
```

### 4.5 Funciones auxiliares requeridas

El código actual espera dos funciones en la base de datos. Si no las usas, debes reemplazarlas por lógica equivalente en tu backend.

#### `get_or_create_whatsapp_conversation`

Busca o crea una conversación activa para un `(business_account_id, business_id, phone)`.

```sql
CREATE OR REPLACE FUNCTION get_or_create_whatsapp_conversation(
    p_business_account_id UUID,
    p_business_id UUID,
    p_phone TEXT,
    p_customer_name TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    v_conversation_id UUID;
    v_expires_at TIMESTAMPTZ := NOW() + INTERVAL '24 hours';
BEGIN
    -- Buscar conversación activa existente
    SELECT id INTO v_conversation_id
    FROM whatsapp_conversations
    WHERE business_id = p_business_id
      AND phone = p_phone
      AND is_active = TRUE
      AND expires_at > NOW()
    ORDER BY last_message_at DESC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    IF v_conversation_id IS NOT NULL THEN
        UPDATE whatsapp_conversations
        SET last_message_at = NOW(),
            customer_name = COALESCE(p_customer_name, customer_name),
            expires_at = v_expires_at
        WHERE id = v_conversation_id;

        RETURN v_conversation_id;
    END IF;

    -- Crear nueva conversación
    INSERT INTO whatsapp_conversations (
        business_account_id,
        business_id,
        phone,
        customer_name,
        last_message_at,
        expires_at,
        is_active
    ) VALUES (
        p_business_account_id,
        p_business_id,
        p_phone,
        p_customer_name,
        NOW(),
        v_expires_at,
        TRUE
    )
    ON CONFLICT (business_id, phone) WHERE is_active = TRUE
    DO UPDATE SET
        last_message_at = NOW(),
        expires_at = v_expires_at,
        customer_name = COALESCE(p_customer_name, whatsapp_conversations.customer_name)
    RETURNING id INTO v_conversation_id;

    RETURN v_conversation_id;
END;
$$;
```

> **Nota**: la constraint `UNIQUE (business_id, phone) WHERE is_active = TRUE` debe agregarse previamente:
>
> ```sql
> CREATE UNIQUE INDEX idx_whatsapp_conversations_active_unique
>     ON whatsapp_conversations(business_id, phone)
>     WHERE is_active = TRUE;
> ```

#### `resolve_incoming_message_business`

Para configs específicas de cuenta, resuelve a qué `business_id` pertenece un mensaje entrante basado en la conversación activa más reciente.

```sql
CREATE OR REPLACE FUNCTION resolve_incoming_message_business(
    p_business_account_id UUID,
    p_phone TEXT
)
RETURNS TABLE (
    business_id UUID,
    conversation_id UUID
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.business_id,
        c.id AS conversation_id
    FROM whatsapp_conversations c
    WHERE c.business_account_id = p_business_account_id
      AND c.phone = p_phone
      AND c.is_active = TRUE
      AND c.expires_at > NOW()
    ORDER BY c.last_message_at DESC
    LIMIT 1;
END;
$$;
```

---

## 5. Configuración de Número y Credenciales

### 5.1 Prerrequisitos en Meta

1. Crear una app en [Meta for Developers](https://developers.facebook.com/).
2. Agregar el producto **WhatsApp**.
3. Crear o conectar un **WhatsApp Business Account (WABA)**.
4. Registrar un número de teléfono (puede ser un número de prueba inicialmente).
5. Obtener:
   - `phone_number_id`
   - `whatsapp_business_account_id`
   - `access_token` permanente (recomendado) o de corta duración
   - Crear un `webhook_verify_token` propio (string aleatorio seguro)
6. Configurar el webhook en Meta apuntando a `https://tu-dominio.com/api/whatsapp/webhook`.
7. Suscribirse al campo `messages` del webhook.

### 5.2 Configuración compartida (fallback global)

Esta es la config que se usa cuando ninguna cuenta tiene config propia.

**Ejemplo con curl (Supabase REST):**

```bash
export SUPABASE_URL="https://tu-proyecto.supabase.co"
export SUPABASE_SERVICE_KEY="tu-service-role-key"

curl -X POST "${SUPABASE_URL}/rest/v1/whatsapp_configs" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "phone_number_id": "123456789012345",
    "whatsapp_business_account_id": "987654321098765",
    "access_token": "EAAG...",
    "webhook_verify_token": "verify-token-seguro-aleatorio",
    "display_phone_number": "+573001234567",
    "is_shared": true,
    "is_enabled": true,
    "status": "active"
  }'
```

### 5.3 Configuración por `business_account_id`

Cuando una cuenta de negocio quiere su propio número.

```bash
curl -X POST "${SUPABASE_URL}/rest/v1/whatsapp_configs" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "business_account_id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    "business_id": null,
    "phone_number_id": "123456789012346",
    "whatsapp_business_account_id": "987654321098766",
    "access_token": "EAAG...",
    "webhook_verify_token": "verify-token-seguro-aleatorio",
    "display_phone_number": "+573009876543",
    "is_shared": false,
    "is_enabled": true,
    "status": "active"
  }'
```

### 5.4 Configuración por `business_id` (sucursal)

Cuando una sucursal específica necesita un número distinto al de la cuenta.

```bash
curl -X POST "${SUPABASE_URL}/rest/v1/whatsapp_configs" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "business_account_id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    "business_id": "b1ffcd22-ad1c-5f19-cc7e-7cc0ce491b22",
    "phone_number_id": "123456789012347",
    "whatsapp_business_account_id": "987654321098767",
    "access_token": "EAAG...",
    "webhook_verify_token": "verify-token-seguro-aleatorio",
    "display_phone_number": "+573002345678",
    "is_shared": false,
    "is_enabled": true,
    "status": "active"
  }'
```

### 5.5 Resolución de configuración

Antes de enviar cualquier mensaje, debes resolver qué configuración usar siguiendo esta prioridad exacta:

```
1. Config específica del business_id
   WHERE business_account_id = ?
     AND business_id = ?
     AND is_shared = false
     AND is_enabled = true

2. Config específica de la business_account_id
   WHERE business_account_id = ?
     AND business_id IS NULL
     AND is_shared = false
     AND is_enabled = true

3. Config compartida (fallback global)
   WHERE is_shared = true
     AND is_enabled = true

4. Si no se encuentra ninguna: WhatsApp no está configurado.
```

**Ejemplo de resolución con curl (Supabase):**

```bash
# Intento 1: config específica del business_id
curl -s -G "${SUPABASE_URL}/rest/v1/whatsapp_configs" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
  --data-urlencode "business_account_id=eq.a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11" \
  --data-urlencode "business_id=eq.b1ffcd22-ad1c-5f19-cc7e-7cc0ce491b22" \
  --data-urlencode "is_shared=eq.false" \
  --data-urlencode "is_enabled=eq.true" \
  --data-urlencode "limit=1"

# Intento 2: config de la cuenta
curl -s -G "${SUPABASE_URL}/rest/v1/whatsapp_configs" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
  --data-urlencode "business_account_id=eq.a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11" \
  --data-urlencode "business_id=is.null" \
  --data-urlencode "is_shared=eq.false" \
  --data-urlencode "is_enabled=eq.true" \
  --data-urlencode "limit=1"

# Intento 3: config compartida
curl -s -G "${SUPABASE_URL}/rest/v1/whatsapp_configs" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
  --data-urlencode "is_shared=eq.true" \
  --data-urlencode "is_enabled=eq.true" \
  --data-urlencode "limit=1"
```

---

## 6. Envío de Mensajes

### 6.1 Flujo general

1. Resolver configuración (3 niveles).
2. Obtener o crear la conversación activa para el destinatario.
3. Construir payload de Meta.
4. Enviar a `POST https://graph.facebook.com/v21.0/{phone_number_id}/messages`.
5. Guardar el mensaje en `whatsapp_messages` con estado `sent` o `failed`.
6. Actualizar `last_message_at` y `expires_at` de la conversación.

### 6.2 Mensaje de texto

Solo funciona si existe una conversación activa de 24h. Fuera de la ventana, Meta devolverá error.

**Payload a Meta:**

```json
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "573001234567",
  "type": "text",
  "text": {
    "body": "Hola, este es un mensaje de prueba"
  }
}
```

**Ejemplo con curl directo a Meta:**

```bash
export PHONE_NUMBER_ID="123456789012345"
export ACCESS_TOKEN="EAAG..."

curl -X POST "https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "recipient_type": "individual",
    "to": "573001234567",
    "type": "text",
    "text": {
      "body": "Hola, este es un mensaje de prueba"
    }
  }'
```

**Respuesta exitosa de Meta:**

```json
{
  "messaging_product": "whatsapp",
  "contacts": [
    { "input": "573001234567", "wa_id": "573001234567" }
  ],
  "messages": [
    { "id": "wamid.HBgL..." }
  ]
}
```

**Guardar en tu DB (ejemplo Supabase):**

```bash
curl -X POST "${SUPABASE_URL}/rest/v1/whatsapp_messages" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "business_account_id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    "business_id": "b1ffcd22-ad1c-5f19-cc7e-7cc0ce491b22",
    "conversation_id": "c2ggde33-be2d-6g2a-dd8f-8dd1df5a2c33",
    "whatsapp_message_id": "wamid.HBgL...",
    "to_phone": "573001234567",
    "from_phone": "573009876543",
    "direction": "outbound",
    "message_type": "text",
    "content": "Hola, este es un mensaje de prueba",
    "status": "sent",
    "sent_at": "2026-06-12T15:00:00Z"
  }'
```

### 6.3 Mensaje con template aprobado

Se usa para iniciar conversaciones fuera de la ventana de 24h. El template debe estar aprobado previamente en Meta.

**Payload a Meta:**

```json
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "573001234567",
  "type": "template",
  "template": {
    "name": "appointment_confirmation",
    "language": { "code": "es_CO" },
    "components": [
      {
        "type": "body",
        "parameters": [
          { "type": "text", "text": "Nombre del negocio" },
          { "type": "text", "text": "Nombre del cliente" },
          { "type": "text", "text": "Lunes, 15 de Enero 2026 a las 3:00 PM" },
          { "type": "text", "text": "Corte de cabello" },
          { "type": "text", "text": "María" },
          { "type": "text", "text": "Calle 123 - Tel: 3001234567" }
        ]
      }
    ]
  }
}
```

**Ejemplo con curl directo a Meta:**

```bash
curl -X POST "https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "recipient_type": "individual",
    "to": "573001234567",
    "type": "template",
    "template": {
      "name": "appointment_confirmation",
      "language": { "code": "es_CO" },
      "components": [
        {
          "type": "body",
          "parameters": [
            { "type": "text", "text": "Nombre del negocio" },
            { "type": "text", "text": "Nombre del cliente" },
            { "type": "text", "text": "Lunes, 15 de Enero 2026 a las 3:00 PM" },
            { "type": "text", "text": "Corte de cabello" },
            { "type": "text", "text": "María" },
            { "type": "text", "text": "Calle 123 - Tel: 3001234567" }
          ]
        }
      ]
    }
  }'
```

**Guardar en tu DB:**

```bash
curl -X POST "${SUPABASE_URL}/rest/v1/whatsapp_messages" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "business_account_id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    "business_id": "b1ffcd22-ad1c-5f19-cc7e-7cc0ce491b22",
    "conversation_id": "c2ggde33-be2d-6g2a-dd8f-8dd1df5a2c33",
    "whatsapp_message_id": "wamid.HBgL...",
    "to_phone": "573001234567",
    "from_phone": "573009876543",
    "direction": "outbound",
    "message_type": "template",
    "content": "Template: appointment_confirmation",
    "template_name": "appointment_confirmation",
    "status": "sent",
    "sent_at": "2026-06-12T15:00:00Z"
  }'
```

### 6.4 Estructura de `components`

| Tipo | Uso | Ejemplo de parámetros |
|------|-----|----------------------|
| `header` | Título del template | `{ "type": "text", "text": "..." }` |
| `body` | Cuerpo del mensaje | Array de `{ "type": "text", "text": "..." }` |
| `button` | Botones interactivos | `{ "type": "payload", "payload": "..." }` |

**Ejemplo con header:**

```json
{
  "components": [
    {
      "type": "header",
      "parameters": [
        { "type": "text", "text": "Recordatorio de cita" }
      ]
    },
    {
      "type": "body",
      "parameters": [
        { "type": "text", "text": "Juan" },
        { "type": "text", "text": "Lunes 15 de enero" }
      ]
    }
  ]
}
```

---

## 7. Recepción de Mensajes (Webhook)

### 7.1 Configuración del webhook en Meta

URL: `https://tu-dominio.com/api/whatsapp/webhook`

Token de verificación: el mismo valor que guardaste en `whatsapp_configs.webhook_verify_token` (o una variable de entorno `WHATSAPP_WEBHOOK_VERIFY_TOKEN`).

Campos a suscribirse: `messages`.

### 7.2 Verificación GET

Meta enviará:

```
GET /api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=TOKEN&hub.challenge=CHALLENGE
```

Tu endpoint debe:

1. Validar que `hub.mode == "subscribe"`.
2. Validar que `hub.verify_token` coincida con tu token configurado.
3. Responder `HTTP 200` con el valor de `hub.challenge` como body plano.

**Ejemplo de respuesta correcta:**

```http
HTTP/1.1 200 OK
Content-Type: text/plain

CHALLENGE
```

**Ejemplo con curl (simulando la verificación):**

```bash
curl -X GET "https://tu-dominio.com/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=verify-token-seguro-aleatorio&hub.challenge=1234567890"
```

### 7.3 Eventos POST

Meta enviará payloads con este formato:

```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "987654321098765",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "573009876543",
              "phone_number_id": "123456789012345"
            },
            "contacts": [
              {
                "profile": { "name": "Juan Pérez" },
                "wa_id": "573001234567"
              }
            ],
            "messages": [
              {
                "from": "573001234567",
                "id": "wamid.XXX",
                "timestamp": "1715000000",
                "type": "text",
                "text": { "body": "Hola, quiero información" }
              }
            ],
            "statuses": [
              {
                "id": "wamid.YYY",
                "status": "delivered",
                "timestamp": "1715000005",
                "recipient_id": "573001234567"
              }
            ]
          },
          "field": "messages"
        }
      ]
    }
  ]
}
```

### 7.4 Procesamiento de mensajes entrantes

Para cada mensaje en `messages`:

1. **Buscar la config** por `phone_number_id`.
2. **Determinar `business_account_id` y `business_id`:**
   - Si la config NO es compartida (`is_shared = false`) y tiene `business_account_id`, usar ese `business_account_id`.
   - Si la config es compartida o no tiene `business_account_id`, buscar la conversación activa más reciente por el teléfono del remitente (`from`) y usar su `business_account_id` y `business_id`.
   - Si no hay conversación activa, descartar o guardar en una cola de no-ruteado.
3. **Obtener o crear conversación** para el `(business_account_id, business_id, from)`.
4. **Extraer contenido** según el tipo de mensaje:

| Tipo | Contenido a guardar | Acción adicional |
|------|---------------------|------------------|
| `text` | `text.body` | Ninguna |
| `image` | `image.caption` o `[Imagen]` | Descargar URL del media |
| `document` | `[Documento: filename]` | Descargar URL del media |
| `audio` | `[Audio]` | Descargar URL del media |
| `video` | `video.caption` o `[Video]` | Descargar URL del media |
| `interactive` | `button_reply.title` o `list_reply.title` | Ninguna |

5. **Guardar en `whatsapp_messages`** con `direction = 'inbound'` y `status = 'delivered'`.
6. **Actualizar conversación**: `last_message_at = NOW()`, `expires_at = NOW() + 24h`, `customer_name` si viene en `contacts`.

### 7.5 Descarga de media

Para obtener la URL de descarga de un archivo:

```bash
curl -X GET "https://graph.facebook.com/v21.0/{media_id}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```

Respuesta:

```json
{
  "url": "https://lookaside.fbsbx.com/whatsapp_business/attachments/?mid=...",
  "mime_type": "image/jpeg",
  "sha256": "...",
  "file_size": 12345,
  "id": "...",
  "messaging_product": "whatsapp"
}
```

> **Importante**: la URL de descarga expira. Guarda el `media_id` y descarga el archivo inmediatamente, o almacena la URL solo como referencia temporal.

### 7.6 Actualizaciones de estado

Para cada objeto en `statuses`:

```json
{
  "id": "wamid.YYY",
  "status": "delivered",
  "timestamp": "1715000005",
  "recipient_id": "573001234567",
  "errors": [
    {
      "code": 131,
      "title": "Recipient's number is not a valid WhatsApp number",
      "message": "..."
    }
  ]
}
```

Tu endpoint debe buscar el mensaje en `whatsapp_messages` por `whatsapp_message_id` y actualizar:

- `status` a `sent`, `delivered`, `read` o `failed`.
- `delivered_at` si `status == 'delivered'`.
- `read_at` si `status == 'read'`.
- `error_message` si `status == 'failed'`.

**Ejemplo de actualización en DB:**

```bash
curl -X PATCH "${SUPABASE_URL}/rest/v1/whatsapp_messages?whatsapp_message_id=eq.wamid.YYY" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "delivered",
    "delivered_at": "2026-06-12T15:00:05Z"
  }'
```

### 7.7 Respuesta del webhook

Tu endpoint siempre debe responder `HTTP 200` a Meta, incluso si hay errores internos. De lo contrario, Meta reintentará la entrega.

```http
HTTP/1.1 200 OK
Content-Type: application/json

{ "status": "processed" }
```

---

## 8. Templates de Negocio Implementados

Estos templates representan los flujos reales del proyecto. Para usarlos, debes crear templates con exactamente estos nombres y variables en Meta Business Manager.

### 8.1 `appointment_confirmation`

**Variables (6):**

1. Nombre del negocio
2. Nombre del cliente
3. Fecha y hora de la cita
4. Servicios
5. Nombre del especialista
6. Ubicación con teléfono

**Payload de ejemplo:**

```json
{
  "template_name": "appointment_confirmation",
  "language_code": "es_CO",
  "components": [
    {
      "type": "body",
      "parameters": [
        { "type": "text", "text": "Borls Spa" },
        { "type": "text", "text": "María García" },
        { "type": "text", "text": "Lunes, 15 de Enero 2026 a las 3:00 PM" },
        { "type": "text", "text": "Corte de cabello, Manicure" },
        { "type": "text", "text": "Ana López" },
        { "type": "text", "text": "Calle 123 #45-67 - Tel: 3001234567" }
      ]
    }
  ]
}
```

**Fallback de texto libre** (si el template falla):

```
✨ *CITA CONFIRMADA* ✨

Hola *{customer_name}*,

Tu cita ha sido agendada exitosamente.

━━━━━━━━━━━━━━━━━━━━━

📅 *Fecha:* {formattedDate}
🕐 *Hora:* {formattedTime}
⏱️ *Duración:* {totalDuration} minutos

💇 *Servicios:*
• {servicio1}
• {servicio2}

👤 *Especialista:* {specialist_name}
💰 *Total:* $XXX.XXX

━━━━━━━━━━━━━━━━━━━━━

📍 *{business_name}*
{business_address}
📞 {business_phone}

━━━━━━━━━━━━━━━━━━━━━

_Te enviaremos un recordatorio antes de tu cita._
```

### 8.2 `appointment_reminder`

**Variables (5):**

1. Nombre del negocio
2. Nombre del cliente
3. Hora de la cita
4. Servicios
5. Ubicación con teléfono

**Payload de ejemplo:**

```json
{
  "template_name": "appointment_reminder",
  "language_code": "es_CO",
  "components": [
    {
      "type": "body",
      "parameters": [
        { "type": "text", "text": "Borls Spa" },
        { "type": "text", "text": "María García" },
        { "type": "text", "text": "3:00 PM" },
        { "type": "text", "text": "Corte de cabello" },
        { "type": "text", "text": "Calle 123 - Tel: 3001234567" }
      ]
    }
  ]
}
```

### 8.3 `appointment_cancellation`

**Variables (5):**

1. Nombre del cliente
2. Nombre del negocio
3. Fecha
4. Hora
5. Motivo (puede estar vacío)

**Payload de ejemplo:**

```json
{
  "template_name": "appointment_cancellation",
  "language_code": "es_CO",
  "components": [
    {
      "type": "body",
      "parameters": [
        { "type": "text", "text": "María García" },
        { "type": "text", "text": "Borls Spa" },
        { "type": "text", "text": "Lunes, 15 de Enero 2026" },
        { "type": "text", "text": "3:00 PM" },
        { "type": "text", "text": "Motivo: Cancelado por el cliente" }
      ]
    }
  ]
}
```

### 8.4 `appointment_rescheduled`

**Variables (6):**

1. Nombre del cliente
2. Nombre del negocio
3. Fecha/hora anterior
4. Nueva fecha/hora
5. Especialista
6. Ubicación con teléfono

**Payload de ejemplo:**

```json
{
  "template_name": "appointment_rescheduled",
  "language_code": "es_CO",
  "components": [
    {
      "type": "body",
      "parameters": [
        { "type": "text", "text": "María García" },
        { "type": "text", "text": "Borls Spa" },
        { "type": "text", "text": "Lunes, 15 de Enero 2026 a las 3:00 PM" },
        { "type": "text", "text": "Martes, 16 de Enero 2026 a las 10:00 AM" },
        { "type": "text", "text": "Ana López" },
        { "type": "text", "text": "Calle 123 - Tel: 3001234567" }
      ]
    }
  ]
}
```

### 8.5 `appointment_completed`

**Variables (4):**

1. Nombre del cliente
2. Nombre del negocio
3. Servicios
4. Especialista

**Payload de ejemplo:**

```json
{
  "template_name": "appointment_completed",
  "language_code": "es_CO",
  "components": [
    {
      "type": "body",
      "parameters": [
        { "type": "text", "text": "María García" },
        { "type": "text", "text": "Borls Spa" },
        { "type": "text", "text": "Corte de cabello, Manicure" },
        { "type": "text", "text": "Ana López" }
      ]
    }
  ]
}
```

### 8.6 `medical_record_signature_request`

**Variables (5):**

1. Nombre del cliente
2. Nombre del negocio
3. Fecha del documento
4. URL de firma
5. Días hasta expiración

**Payload de ejemplo:**

```json
{
  "template_name": "medical_record_signature_request",
  "language_code": "es_CO",
  "components": [
    {
      "type": "body",
      "parameters": [
        { "type": "text", "text": "María García" },
        { "type": "text", "text": "Borls Spa" },
        { "type": "text", "text": "12 de Junio de 2026" },
        { "type": "text", "text": "https://tuapp.com/firmar/abc123" },
        { "type": "text", "text": "7" }
      ]
    }
  ]
}
```

---

## 9. Recordatorios Programados

### 9.1 Flujo

1. Cuando se agenda una cita, insertar un registro en `whatsapp_scheduled_reminders` con `scheduled_for` igual a la fecha/hora en que debe enviarse (por ejemplo, 2 horas antes de la cita).
2. Un cron o job programado consulta periódicamente:
   - `status = 'pending'`
   - `scheduled_for <= NOW()`
3. Para cada recordatorio pendiente:
   - Resolver config.
   - Enviar mensaje (template primero, fallback a texto).
   - Marcar como `sent` o `failed`.

### 9.2 Crear recordatorio

```bash
curl -X POST "${SUPABASE_URL}/rest/v1/whatsapp_scheduled_reminders" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "appointment_id": "d4hhfg55-cf4e-7h3b-ee0g-0ee2eg6b3d44",
    "business_account_id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    "business_id": "b1ffcd22-ad1c-5f19-cc7e-7cc0ce491b22",
    "customer_phone": "573001234567",
    "customer_name": "María García",
    "scheduled_for": "2026-06-12T13:00:00Z",
    "reminder_type": "appointment_reminder",
    "status": "pending"
  }'
```

### 9.3 Consultar pendientes

```bash
curl -s -G "${SUPABASE_URL}/rest/v1/whatsapp_scheduled_reminders" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
  --data-urlencode "status=eq.pending" \
  --data-urlencode "scheduled_for=lte.2026-06-12T15:00:00Z" \
  --data-urlencode "order=scheduled_for.asc" \
  --data-urlencode "limit=50"
```

### 9.4 Marcar como enviado

```bash
curl -X PATCH "${SUPABASE_URL}/rest/v1/whatsapp_scheduled_reminders?id=eq.{reminder_id}" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "sent",
    "sent_at": "2026-06-12T15:00:00Z"
  }'
```

### 9.5 Cancelar recordatorios de una cita

```bash
curl -X PATCH "${SUPABASE_URL}/rest/v1/whatsapp_scheduled_reminders?appointment_id=eq.{appointment_id}&status=eq.pending" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{ "status": "cancelled" }'
```

---

## 10. Componentes UI de Referencia

El proyecto actual incluye estos componentes React. Si implementas en otro framework, estos son los conceptos de UI que debes replicar.

| Componente | Responsabilidad |
|------------|-----------------|
| `SharedWhatsAppConfigForm` | Formulario para crear/editar la configuración compartida global. |
| `WhatsAppConfigForm` | Formulario para crear/editar configuración exclusiva de una `business_account_id`. |
| `WhatsAppAccountsList` | Lista de todas las configs (compartida + específicas) con opción de eliminar. |
| `WhatsAppTestMessage` | Envío manual de un mensaje de texto a un número para probar la config. |
| `WhatsAppChat` | Widget de chat que muestra historial y permite responder mensajes. |
| `WhatsAppMessageList` | Lista paginada de mensajes de una conversación. |
| `SendWhatsAppButton` | Botón contextual para enviar un mensaje de texto manual a un cliente. |

### Pantallas recomendadas

1. **Configuración global** (`/admin/settings/whatsapp`)
   - Formulario de config compartida.
   - Lista de configs por cuenta.
   - URL del webhook visible para copiar.
   - Botón de prueba de envío.

2. **Chat de soporte** (`/admin/whatsapp/chat` o dentro del perfil del cliente)
   - Lista de conversaciones activas.
   - Vista de mensajes por conversación.
   - Campo para responder (solo dentro de ventana de 24h).

---

## 11. Integración Paso a Paso

### Paso 1: Crear tablas en la base de datos

Ejecutar el SQL de la sección 4.

### Paso 2: Configurar variables de entorno

```bash
WHATSAPP_WEBHOOK_VERIFY_TOKEN=verify-token-seguro-aleatorio
```

Si usas Supabase, también necesitas:

```bash
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
```

### Paso 3: Crear config compartida

Usar el curl de la sección 5.2.

### Paso 4: Crear templates en Meta

Crear en [Meta Business Manager](https://business.facebook.com/) los templates con los nombres y variables exactas de la sección 8.

### Paso 5: Implementar endpoint de webhook

Crear un endpoint en `POST/GET /api/whatsapp/webhook` que cumpla con las secciones 7.2 y 7.3.

### Paso 6: Implementar envío de mensajes

Crear funciones que:

1. Resuelvan config.
2. Obtengan/creen conversación.
3. Hagan POST a Meta.
4. Guarden en `whatsapp_messages`.

### Paso 7: Implementar recordatorios programados

Crear un cron o job que consulte `whatsapp_scheduled_reminders` y envíe los pendientes.

### Paso 8: Probar

1. Enviar un template a tu número personal.
2. Responder desde WhatsApp y verificar que llega al webhook.
3. Verificar que los estados (`sent`, `delivered`, `read`) se actualizan.
4. Programar un recordatorio y verificar que se envía.

---

## 12. Consideraciones de Seguridad

- **Nunca expongas el `access_token`** en el frontend. Las peticiones a Meta deben hacerse desde el servidor.
- **Almacena el access token encriptado** si es posible. El proyecto actual no lo hace, pero es una mejora recomendada.
- **Usa Service Role Key** de Supabase solo en el servidor, nunca en el cliente.
- **Valida la suscripción del webhook** comparando `hub.verify_token` con un secreto fuerte.
- **Sanitiza los números de teléfono** antes de enviar: elimina todo excepto dígitos.
- **Limita qué usuarios pueden configurar WhatsApp**. El proyecto actual usa permisos de módulo (`whatsapp`) y características (`whatsapp_notifications`, `has_whatsapp_owner`).

---

## 13. Matriz de Errores Comunes de Meta

| Código Meta | Significado | Acción recomendada |
|-------------|-------------|-------------------|
| 100 | Parámetro faltante o inválido | Revisar payload |
| 101 | Parámetro incorrecto | Revisar docs de Meta |
| 103 | Servicio no disponible | Reintentar |
| 104 | Rate limit excedido | Esperar y reintentar con backoff |
| 131 | Número no tiene WhatsApp | Verificar número del destinatario |
| 132 | Mensaje expirado | Reintentar |
| 133 | Template no encontrado | Verificar nombre exacto en Meta |
| 134 | Template no aprobado | Esperar aprobación o revisar rechazo |
| 135 | Variables no coinciden | Contar parámetros del template |

---

## 14. Limitaciones de la Implementación Actual

Para evitar confusiones, estos features aparecían en el documento anterior pero **no están implementados** en el código real:

- Envío batch de mensajes.
- Rate limiting por `business_id`.
- Idempotencia con `idempotency_key`.
- Caché de configuraciones.
- Event bus externo (SQS, Redis, webhook saliente).
- Encriptación de `access_token`.
- Endpoint `/api/v1/media/{media_id}`.
- Endpoint `POST /messages/{id}/read`.
- Provider pattern para múltiples proveedores de WhatsApp.

Si los necesitas para otro proyecto, debes agregarlos por separado.

---

## 15. Referencias

- [WhatsApp Cloud API Documentation](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [WhatsApp Cloud API Error Codes](https://developers.facebook.com/docs/whatsapp/cloud-api/support/error-handling)
- [Meta Graph API Explorer](https://developers.facebook.com/tools/explorer/)
- [Supabase REST API](https://supabase.com/docs/guides/api)
