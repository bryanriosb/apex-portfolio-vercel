# Configuración de Webhooks - Guía Rápida

Esta guía te ayudará a configurar los webhooks para tracking de emails en los diferentes proveedores.

---

## 🎯 AWS SES Webhooks (Ya Configurado)

El webhook de SES ya está configurado y funcional a través de SNS.

### Verificación

```bash
# El SNS topic actual está configurado con:
Configuration Set: borls-collection-config
Webhook URL: https://apex.borls.com/api/webhooks/email/ses
```

### Eventos Trackeados

- ✅ **Delivery** - Email entregado exitosamente
- ✅ **Bounce** - Email rebotado (hard/soft)
- ✅ **Open** - Email abierto por el cliente
- ✅ **Complaint** - Cliente marcó como spam

**No requiere acción**, ya está funcionando.

---

## 📬 Brevo Webhooks (Nuevo - Requiere Configuración)

### Paso 1: Acceder a Configuración de Webhooks

1. Inicia sesión en [Brevo Dashboard](https://app.brevo.com)
2. Ve a **Settings** (⚙️ arriba derecha)
3. En el menú lateral izquierdo, selecciona **Webhooks**
4. Selecciona la pestaña **Transactional** (⚠️ NO "Inbound")

### Paso 2: Crear Nuevo Webhook

Haz clic en **"Add a new webhook"**

**Configuración del Webhook:**

```
URL: https://apex.borls.com/api/webhooks/email/brevo
```

### Paso 3: Seleccionar Eventos

Marca las siguientes casillas:

#### ✅ Eventos Esenciales (Requeridos)

- ☑️ **delivered** - Email entregado exitosamente
- ☑️ **hard_bounce** - Rebote permanente (email inválido)
- ☑️ **soft_bounce** - Rebote temporal (buzón lleno, servidor caído)
- ☑️ **opened** - Email abierto por el destinatario

#### ✅ Eventos Importantes (Recomendados)

- ☑️ **spam** - Marcado como spam
- ☑️ **invalid_email** - Formato de email inválido

#### ⚪ Eventos Opcionales

- ☐ **blocked** - Email bloqueado antes de envío
- ☐ **error** - Error en el envío
- ☐ **unsubscribed** - Usuario se dio de baja
- ☐ **click** - Click en enlaces (si usas tracking de clicks)
- ☐ **deferred** - Envío diferido temporalmente

### Paso 4: Guardar y Activar

1. Haz clic en **"Save"**
2. Brevo te mostrará el webhook en la lista
3. Asegúrate de que el estado sea **"Active"** (verde)

### Paso 5: Verificar Configuración

Ejecuta este comando para verificar que el endpoint está activo:

```bash
curl https://apex.borls.com/api/webhooks/email/brevo
```

**Respuesta esperada:**

```json
{
  "status": "Webhook endpoint active",
  "provider": "brevo",
  "supportedProviders": ["ses", "brevo"]
}
```

---

## 🧪 Testing de Webhooks

### Test Manual con Brevo

1. Envía un email de prueba usando Brevo (configurando `EMAIL_PROVIDER=brevo`)
2. Ve a **Brevo Dashboard** → **Statistics** → **Transactional**
3. Busca el email enviado
4. Verifica que los eventos aparecen en tiempo real

### Verificar en Base de Datos

```sql
-- Ver últimos eventos registrados
SELECT 
  event_type, 
  provider, 
  message_id,
  created_at 
FROM collection_events 
ORDER BY created_at DESC 
LIMIT 10;

-- Ver status de clientes actualizados
SELECT 
  id, 
  status, 
  custom_data->>'email' as email,
  custom_data->>'delivered_at' as delivered_at,
  custom_data->>'opened_at' as opened_at
FROM collection_clients 
WHERE status IN ('delivered', 'opened', 'bounced')
ORDER BY updated_at DESC 
LIMIT 10;
```

### Monitorear Logs en Tiempo Real

**Next.js (Vercel):**

```bash
vercel logs --follow
```

Buscar líneas como:

```
[BREVO] Webhook received: {"event":"delivered",...}
Processed brevo delivered event for client@example.com
Updated client xxx status: sent -> delivered
```

---

## 🔄 Cambiar entre Proveedores

### Usar Brevo

```bash
# En functions/aws/.env
EMAIL_PROVIDER=brevo

# Redeploy
cd functions/aws
./deploy.sh
```

### Volver a SES

```bash
# En functions/aws/.env
EMAIL_PROVIDER=ses

# Redeploy
cd functions/aws
./deploy.sh
```

---

## 📊 Mapeo de Eventos

Ambos proveedores actualizan la DB de la misma manera:

| Evento Original | Status en DB | Descripción |
|----------------|--------------|-------------|
| **SES**: Delivery<br>**Brevo**: delivered | `delivered` | Email entregado al servidor destino |
| **SES**: Bounce<br>**Brevo**: hard_bounce, soft_bounce | `bounced` | Email rebotado |
| **SES**: Open<br>**Brevo**: opened | `opened` | Email abierto por el cliente |
| **SES**: Complaint<br>**Brevo**: spam | `complained` | Marcado como spam |
| **SES**: Reject<br>**Brevo**: error | `failed` | Fallo en el envío |

---

## 🛡️ Seguridad

### Brevo Webhook Security (Opcional)

Brevo puede enviar una firma en el header para validar autenticidad:

```typescript
// Header: X-Mailin-Signature
// Valor: HMAC-SHA256 del payload
```

Para implementar validación (mejora futura):

1. Configurar webhook secret en Brevo
2. Agregar validación en `/api/webhooks/email/[provider]/route.ts`
3. Rechazar requests con firma inválida

### AWS SNS Signature

Ya está validado automáticamente por el SDK de AWS al procesar mensajes SNS.

---

## ❓ Troubleshooting

### Webhook no recibe eventos

1. **Verificar URL**: `https://apex.borls.com/api/webhooks/email/brevo` (sin `/` al final)
2. **Verificar que está Active** en Brevo Dashboard
3. **Revisar logs** de Next.js para errores
4. **Test manual**: Enviar POST con curl simulando evento Brevo

### Eventos llegan pero no actualizan DB

1. Verificar que `message_id` se guarda correctamente al enviar email
2. Revisar logs: `Error searching for client` o `No client found`
3. Verificar formato de `custom_data` en `collection_clients`

### Status no cambia en Dashboard

1. Verificar que el evento se registró en `collection_events`
2. Verificar que `collection_clients.status` se actualizó
3. Refrescar dashboard para ver cambios

---

## 📚 Referencias

- [Documentación Técnica Completa](./email_provider_architecture.md)
- [Brevo Webhook Documentation](https://developers.brevo.com/docs/transactional-webhooks)
- [AWS SES Notification Documentation](https://docs.aws.amazon.com/ses/latest/dg/monitor-sending-activity.html)

---

## ✅ Checklist de Setup

- [ ] Acceder a Brevo Dashboard
- [ ] Navegar a Settings → Webhooks → Transactional
- [ ] Crear webhook con URL: `https://apex.borls.com/api/webhooks/email/brevo`
- [ ] Seleccionar eventos: delivered, hard_bounce, soft_bounce, opened, spam
- [ ] Activar webhook
- [ ] Verificar con `curl` que endpoint responde
- [ ] Enviar email de prueba con `EMAIL_PROVIDER=brevo`
- [ ] Verificar que eventos aparecen en `collection_events`
- [ ] Verificar que `collection_clients.status` se actualiza
