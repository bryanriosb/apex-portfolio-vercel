# Click Tracking - Brevo Integration

## 📊 Nuevo Evento: `clicked`

Ahora el sistema trackea cuando los clientes hacen click en links dentro de los emails.

## ✅ Implementación Completa

### 1. Parser Brevo

Mapea eventos de Brevo:

- `click` → `clicked`
- `clicked` → `clicked`

Captura metadata adicional:

```typescript
{
  link: "https://example.com/factura/123",  // URL clickeada
  originalEvent: "click",
  timestamp: "2026-02-06T12:00:00Z"
}
```

### 2. Event Handler

Comportamiento al recibir evento `clicked`:

- Si status es `sent` o `delivered` → actualiza a `opened`
- Si ya está en `opened` → mantiene status, solo registra el evento
- Guarda `clicked_at` en `custom_data`

### 3. Database

Cada click se registra en:

- `collection_events` con metadata del link
- `collection_clients.custom_data` agrega timestamp

## 📋 Configuración en Brevo

**Activar en Dashboard:**
Settings → Webhooks → Transactional → Events

```
✅ Clicked  (o "Click" según versión de interfaz)
```

## 🔗 Para que funcione el tracking

Brevo automáticamente convierte links en URLs trackeables cuando:

1. Envías email vía API transaccional
2. El link está en formato `<a href="...">...</a>`
3. El tracking está habilitado en tu cuenta

**Ejemplo de link trackeable:**

```html
<a href="https://apex.borls.com/pago/12345">Ver factura</a>
```

Brevo lo convierte a:

```
https://brevo-tracking.com/click?id=xxx&url=https://apex.borls.com/pago/12345
```

## 📊 Análisis de Engagement

Con click tracking puedes saber:

- ✅ Cuántos clientes abren el email (`opened`)
- ✅ Cuántos hacen click en botones/links (`clicked`)
- ✅ Qué links son más efectivos
- ✅ Tasa de conversión: enviados → clicks

### Query útil

```sql
-- Clientes que hicieron click
SELECT 
  email,
  custom_data->>'clicked_at' as clicked_at,
  custom_data->>'opened_at' as opened_at,
  status
FROM collection_clients
WHERE custom_data ? 'clicked_at'
ORDER BY clicked_at DESC;

-- Engagement por campaña
SELECT 
  execution_id,
  COUNT(*) FILTER (WHERE status = 'delivered') as entregados,
  COUNT(*) FILTER (WHERE status = 'opened') as abiertos,
  COUNT(*) FILTER (WHERE custom_data ? 'clicked_at') as clicks,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE custom_data ? 'clicked_at') / 
    NULLIF(COUNT(*) FILTER (WHERE status = 'delivered'), 0), 
    2
  ) as click_rate_percent
FROM collection_clients
GROUP BY execution_id;
```

## 🎯 Métricas Clave

| Métrica | Fórmula |
|---------|---------|
| **Open Rate** | (opened / delivered) × 100 |
| **Click Rate** | (clicked / delivered) × 100 |
| **Click-to-Open Rate** | (clicked / opened) × 100 |

## ⚠️ Notas Importantes

1. **Un cliente puede hacer múltiples clicks**: Cada uno genera un evento
2. **Status no retrocede**: Si está en `opened`, no vuelve a `delivered`
3. **Link disponible**: El campo `metadata.link` tiene la URL clickeada
4. **Tracking automático**: No necesitas modificar tus templates

## 🔍 Ver Clicks en Dashboard

Los eventos `clicked` aparecerán en:

- `collection_events` tabla con `event_type = 'clicked'`
- Logs con mensaje: "Processed brevo clicked event for ..."

## 🚀 Próximos Pasos

1. ✅ Activar evento "Clicked" en Brevo Dashboard
2. ✅ Enviar email de prueba
3. ✅ Hacer click en un link del email
4. ✅ Verificar que el evento se registra en `collection_events`
5. ✅ Ver que `custom_data.clicked_at` se actualiza
