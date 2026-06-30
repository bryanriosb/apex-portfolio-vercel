# Guía de Integración Interna: WhatsApp API Gateway

Este documento detalla cómo los microservicios internos (ej. `apex-ai`) deben interactuar con `apex-ui` para enviar mensajes de WhatsApp. Todo el manejo de webhooks, almacenamiento en Supabase y peticiones a Meta Cloud API se realiza a través de `apex-ui`.

---

## 1. Arquitectura y Mecanismos de Seguridad

Para prevenir accesos no autorizados, ataques de denegación de servicio (DoS) y ataques de repetición (Replay Attacks), el endpoint en `apex-ui` utiliza un mecanismo de **Firma HMAC + Encriptación AES-256-GCM**.

### Diagrama de Secuencia de Seguridad

```text
  [Microservicio (apex-ai)]                      [API Gateway (apex-ui)]
             |                                             |
  1. Genera JSON Payload                                   |
             |                                             |
  2. Encripta Payload (AES-256-GCM)                        |
     con llave derivada de SECRET                          |
             |                                             |
  3. Obtiene Timestamp actual (s)                          |
             |                                             |
  4. Genera Firma HMAC-SHA256                              |
     Payload: `${timestamp}.${encrypted_body}`             |
             |                                             |
  5. HTTP POST /api/whatsapp/send                          |
     Headers:                                              |
      - x-timestamp: 171456...                             |
      - x-signature: a1b2c3...                             |
     Body: { iv, authTag, ciphertext }  -----------------> |
                                                           |
                                                 6. Verifica Timestamp (ventana de 5 mins)
                                                 7. Recalcula y verifica Firma HMAC
                                                 8. Si es válido -> Desencripta Payload
                                                 9. Invoca Server Actions de WhatsApp
                                                           |
  10. Retorna Resultado (200 OK) <------------------------ |
             |                                             |
```

---

## 2. Implementación de Seguridad en el Cliente (`apex-ai`)

Para realizar una petición, el cliente debe compartir el mismo secreto (`API_SECRET`) configurado en `apex-ui`.

### Paso a paso:

1. **Derivar la Llave:** Generar un hash SHA-256 del secreto compartido. Esto nos da los 32 bytes necesarios para `AES-256-GCM`.
2. **Encriptar el Payload:** Convertir el payload a JSON y encriptarlo con la llave derivada. Conservar el `IV` y el `AuthTag`.
3. **Generar Timestamp:** Obtener los segundos desde Epoch (ej. `Math.floor(Date.now() / 1000)`).
4. **Firmar:** Generar un HMAC-SHA256 usando el secreto original sobre el string `${timestamp}.${raw_json_body}` (donde `raw_json_body` es el cuerpo JSON con la data encriptada).

### Esquema de Datos del Payload (Antes de Encriptar)

El endpoint acepta dos tipos de envíos: `text` (texto libre para conversaciones de 24h) y `template` (plantillas pre-aprobadas por Meta).

#### A) Enviar Mensaje de Texto (Solo activo 24h)
```typescript
{
  "type": "text",
  "data": {
    "business_account_id": "UUID",
    "business_id": "UUID",
    "to_phone": "573001234567",
    "content": "Hola, ¿en qué te puedo ayudar hoy?"
  }
}
```

#### B) Enviar Plantilla
```typescript
{
  "type": "template",
  "data": {
    "business_account_id": "UUID",
    "business_id": "UUID",
    "to_phone": "573001234567",
    "template_name": "appointment_reminder",
    "components": [
      {
        "type": "body",
        "parameters": [
          { "type": "text", "text": "Borls Spa" },
          { "type": "text", "text": "María" },
          { "type": "text", "text": "3:00 PM" }
        ]
      }
    ]
  }
}
```

---

## 3. Ejemplo Práctico de Consumo (TypeScript)

El siguiente ejemplo muestra cómo `apex-ai` (o cualquier cliente TS/JS) debe construir y enviar la petición de manera segura.

```typescript
import crypto from 'crypto';

async function sendSecureWhatsAppMessage(secret: string, unencryptedPayload: object) {
  const url = 'https://[APEX_UI_URL]/api/whatsapp/send';
  
  // 1. Derivar Llave
  const encryptionKey = crypto.createHash('sha256').update(secret).digest();

  // 2. Encriptar
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey, iv);
  
  const payloadString = JSON.stringify(unencryptedPayload);
  let ciphertext = cipher.update(payloadString, 'utf8', 'hex');
  ciphertext += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  // Body crudo que se enviará
  const rawBody = JSON.stringify({
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    ciphertext
  });

  // 3. Generar Timestamp
  const timestamp = Math.floor(Date.now() / 1000).toString();

  // 4. Firmar
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex');

  // 5. Enviar HTTP Request
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-timestamp': timestamp,
      'x-signature': signature
    },
    body: rawBody
  });

  if (!response.ok) {
    const errorBody = await response.json();
    throw new Error(`Error en el gateway: ${errorBody.error}`);
  }

  return await response.json();
}
```

## 4. Estructura de Respuesta

Si la petición es validada, desencriptada y el mensaje es procesado, el API Gateway retornará (HTTP 200):

```json
{
  "success": true,
  "data": {
    "id": "UUID-DEL-MENSAJE-EN-DB",
    "whatsapp_message_id": "wamid.HBg...",
    "status": "sent",
    ...
  }
}
```

Si hay algún error de seguridad o de sintaxis:

```json
{
  "error": "Petición expirada o timestamp inválido (Replay Attack Prevention)"
}
```
