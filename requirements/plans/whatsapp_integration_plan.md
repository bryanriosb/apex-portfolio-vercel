# Integración de WhatsApp API mediante apex-ui

Este plan define la estrategia para integrar WhatsApp API en el ecosistema, delegando toda la complejidad de Meta (webhooks, tokens, persistencia) a `apex-ui` y permitiendo que `apex-ai` lo consuma a través de una API interna. Esta es una decisión arquitectónica excelente porque centraliza la lógica y evita duplicar integraciones.

## User Review Required

> [!IMPORTANT]
> **Creación de tablas en Supabase**
> Has aprobado iniciar con la migración. Se ejecutarán los scripts SQL para crear las tablas (`whatsapp_configs`, `whatsapp_conversations`, `whatsapp_messages`, `whatsapp_scheduled_reminders`) y asegurar que el código de `apex-ui` funcione correctamente.

## Proposed Changes

### 1. Migraciones de Base de Datos

Creación de las tablas base en Supabase necesarias para que `apex-ui` pueda operar la lógica de WhatsApp ya existente en su código.

#### [NEW] `supabase/migrations/xxxx_create_whatsapp_tables.sql`

- Script SQL con la creación de `whatsapp_configs`, `whatsapp_conversations`, `whatsapp_messages`, `whatsapp_scheduled_reminders` y las funciones auxiliares detalladas en la documentación original.

---

### 2. API de Envío en apex-ui

Actualmente `apex-ui` tiene Server Actions (`lib/actions/whatsapp`) para enviar mensajes y un Webhook (`/api/whatsapp/webhook`), pero necesita un endpoint REST para que `apex-ai` (u otros microservicios) puedan solicitar envíos.

#### [NEW] `app/api/whatsapp/send/route.ts` (en apex-ui)

- **Seguridad y Validación (Prevención DoS y Replay Attacks):** El endpoint verificará una firma (signature) en los headers (`x-signature` y `x-timestamp`). La firma se calculará usando `HMAC-SHA256(SECRET_KEY, timestamp + "." + payload)`. El endpoint rechazará peticiones cuyo timestamp tenga una diferencia mayor a 5 minutos respecto a la hora del servidor (evitando que si alguien captura la firma y el payload, pueda reutilizarla en el futuro). Si la firma o el timestamp son inválidos, se aborta inmediatamente sin desencriptar ni parsear recursos.
- **Payload Encriptado E2E:** Para mayor robustez, el body del payload estará encriptado asimétricamente usando una llave pública proveída por `apex-ui` (o bien, una encriptación simétrica AES fuerte si se comparte el secreto). Solo `apex-ui` podrá desencriptarlo usando su llave privada.
- Internamente, una vez validado y desencriptado el payload, este endpoint consumirá `sendWhatsAppTextMessageAction` o `sendWhatsAppTemplateMessageAction` de `lib/services/whatsapp/whatsapp-service.ts`.

---

### 3. Tool en apex-ai (Solo para documentación - NO IMPLEMENTAR AHORA)

El microservicio `apex-ai` no tendrá que implementar bases de datos ni webhooks de Meta. Solo necesitará una herramienta (implementada a futuro) para interactuar con la API de `apex-ui`.

#### [NEW] `agents/tools/whatsapp_tool.ts` (en apex-ai)

- Crear una Tool (herramienta del agente) llamada `send_whatsapp_message`.
- La herramienta hará un HTTP POST simple a `https://[APEX_UI_URL]/api/whatsapp/send` con los parámetros y el secreto de autenticación.
- El agente podrá decidir cuándo usar esta herramienta para comunicarse con un cliente.

## Verification Plan

### Manual Verification

1. **Migraciones:** Ejecutar el SQL en Supabase y verificar en el dashboard que las 4 tablas existan.
2. **Configuración en UI:** Usar los formularios en `apex-ui` (`SharedWhatsAppConfigForm`) para guardar una configuración de WhatsApp.
3. **Endpoint UI:** Hacer un `curl` local a `http://localhost:3001/api/whatsapp/send` simulando ser `apex-ai` y verificar que el mensaje se procesa.
4. **Agente IA:** Escribir a un agente en `apex-ai` indicándole "Envía un mensaje de WhatsApp a X" y comprobar que la *tool* es llamada correctamente y el mensaje llega.
