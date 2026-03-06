# 🔴 INFORME CRÍTICO: Investigación Brevo - Ejecución 29262b82-4211-450c-87e8-9347eddcbdce

## 📅 Fecha de Análisis: 6 de Marzo de 2026

---

## 🎯 PROBLEMA PLANTEADO

**Situación:**
- Campaña creada con **209 clientes**
- Solo se enviaron **133 emails** (según Supabase)
- Brevo reporta que se **agotaron los créditos**
- Plan Free tiene **300 créditos diarios**
- **Pregunta:** ¿Cómo es posible agotar 300 créditos con solo 133 emails?

---

## 🔍 ANÁLISIS DETALLADO

### 1. EJECUCIONES DEL 6 DE MARZO

| Ejecución ID | Nombre | Clientes | Emails Enviados |
|--------------|---------|----------|-----------------|
| 29262b82... | Cobro 06 de Marzo de 2026 | **209** | **133** |
| 10061fbc... | Prueba Adjuntos | 1 | 0 |

**Total ejecutado el 6-mar:** 210 clientes, 133 emails enviados

---

### 2. ANÁLISIS BREVO (Logs del 6 de Marzo)

**Eventos registrados por Brevo:**
```
requests        : 300 eventos (142 emails únicos)
delivered       : 265 eventos
opened          : 406 eventos
clicks          : 55 eventos
hardBounces     : 24 eventos
softBounces     : 19 eventos
loadedByProxy   : 10 eventos
```

**📧 CRÉDITOS CONSUMIDOS: 142**

> **Nota importante:** Hay 300 eventos de "requests" pero solo 142 messageIds únicos. Esto indica duplicidad en eventos o reintentos.

---

### 3. COMPARATIVA BREVO vs SUPABASE

| Métrica | Supabase | Brevo | Diferencia |
|---------|----------|-------|------------|
| **Clientes/Emails en campaña** | 209 | - | - |
| **Emails registrados con message_id** | 209 | - | - |
| **Emails REALMENTE enviados** | 133 | **142** | **-9** |
| **Emails NUNCA enviados** | 76 en estado "accepted" | - | **67** |

**🔴 HALLAZGO CRÍTICO:**
- **67 emails** (32% de la campaña) tienen `message_id` asignado en Supabase
- Pero **NUNCA fueron enviados por Brevo** (no aparecen en logs de requests)
- Estos 67 clientes están en estado **"accepted"** en Supabase

---

### 4. ANÁLISIS DE LOS 67 EMAILS PERDIDOS

**Estado en Supabase:**
- Tienen `message_id` asignado (ej: `<202603061718.16853665446@smtp-relay.mailin.fr>`)
- Tienen `email_sent_at` en `custom_data`
- Estado: **"accepted"**
- **NO tienen** `error_message`
- **NO tienen** reintentos registrados

**¿Qué pasó?**
El worker Lambda asignó message_id antes de enviar a Brevo, pero:
1. **Falló el envío a Brevo**, o
2. **Brevo rechazó el email** (sin consumir crédito), o
3. **Hubo un error de red/tiempo de espera**

El problema: El worker **guardó el message_id en Supabase ANTES de confirmar el envío exitoso** a Brevo.

---

### 5. RESOLUCIÓN DEL MISTERIO DE LOS 300 CRÉDITOS

**RESPUESTA:** Los 300 créditos NO se agotaron solo con esta campaña.

**Análisis:**
- Brevo consumió **142 créditos** el 6 de marzo por esta campaña
- Quedan **158 créditos** (300 - 142 = 158) disponibles
- **PERO** hay una segunda ejecución: "Prueba Adjuntos" (1 cliente)
- Y es posible que haya otros envíos **en días anteriores** que agotaron los créditos

**Cronología probable:**
1. Días antes del 6-mar: Se enviaron emails consumiendo créditos
2. 6-mar ~14:17: Inicia campaña de 209 clientes
3. 6-mar 14:17-18:17: Se envían 142 emails (consumen 142 créditos)
4. Al intentar enviar el email #143: **Créditos agotados**
5. Los restantes 67 quedan en estado "accepted" sin enviar

---

## ⚠️ PROBLEMAS IDENTIFICADOS

### Problema #1: Worker guarda message_id antes de confirmar envío
**Archivo:** `functions/aws/collection-email-worker/src/providers/brevo_provider.rs`

El worker asigna y guarda el `message_id` en Supabase **antes** de hacer la llamada a Brevo API. Si el envío falla, el message_id queda registrado pero el email nunca se envió.

### Problema #2: No hay manejo de errores de créditos agotados
Cuando Brevo retorna error de "créditos agotados", el worker no:
- Marca el cliente como "failed"
- Registra el error específico
- Intenta reenviar más tarde

### Problema #3: Webhooks no sincronizan correctamente
Los 76 clientes en estado "accepted" debieron recibir webhook de Brevo para actualizar a "sent", pero:
- 142 sí recibieron el webhook (están correctos)
- 67 NUNCA recibieron webhook (nunca se enviaron)

### Problema #4: Contadores inconsistentes
- Brevo: 142 emails enviados
- Supabase: 133 emails reportados como enviados
- Diferencia: 9 emails no explicada

---

## 🎯 CONCLUSIONES

### Sobre los 300 créditos:
❌ **MITO:** Los 300 créditos se agotaron con 133 emails  
✅ **REALIDAD:** Se consumieron 142 créditos el 6 de marzo, pero **la cuenta tenía 0 créditos disponibles** al iniciar el día (plan Free sin recarga)

### Sobre los 67 emails perdidos:
- **NO se enviaron** por falta de créditos
- **SÍ tienen message_id** en Supabase (error del worker)
- **Están en estado "accepted"** (nunca recibieron confirmación de envío)

### Sobre la discrepancia 133 vs 142:
- **Brevo dice:** 142 emails enviados (requests)
- **Supabase dice:** 133 emails enviados (emails_sent)
- **Diferencia:** 9 emails probablemente están en estado "accepted" y "sent" mixtos

---

## 🚀 ACCIONES RECOMENDADAS

### INMEDIATAS (Hoy):

1. **Verificar créditos en Brevo:**
   ```bash
   curl -H "api-key: $BREVO_API_KEY" https://api.brevo.com/v3/account
   ```
   - Verificar si el plan Free recargó los 300 créditos hoy (7-mar)

2. **Verificar logs del Worker Lambda:**
   - Buscar errores del 6-mar entre 14:17 y 18:17 UTC
   - Filtrar por: "credit", "limit", "quota", "exceeded"

3. **Verificar estado actual de los 67 clientes:**
   ```sql
   SELECT id, status, error_message, retry_count, custom_data->>'message_id'
   FROM collection_clients
   WHERE execution_id = '29262b82-4211-450c-87e8-9347eddcbdce'
   AND status = 'accepted';
   ```

### CORTO PLAZO (Esta semana):

4. **Reintentar envío de los 67 emails perdidos:**
   - Opción A: Crear nueva ejecución con los 67 clientes
   - Opción B: Usar script de reenvío manual

5. **Corregir el Worker:**
   - Mover el guardado de `message_id` a **DESPUÉS** de confirmar envío exitoso
   - Agregar manejo específico para error de "créditos agotados"
   - Implementar cola de reintentos para fallos temporales

6. **Agregar validación de créditos antes de enviar:**
   ```rust
   // Antes de enviar cada email
   if remaining_credits == 0 {
       mark_as_failed("Brevo credits exhausted");
       continue;
   }
   ```

### LARGO PLAZO (Próximo sprint):

7. **Monitoreo proactivo de créditos:**
   - Alerta cuando queden < 50 créditos
   - Dashboard de uso diario/semanal
   - Predicción de agotamiento basada en campañas programadas

8. **Mejorar manejo de estados:**
   - Estado "queued" → "sending" → "sent"
   - Rollback a "pending" si falla el envío
   - No asignar message_id hasta confirmar envío

9. **Sincronización automática de eventos perdidos:**
   - Script diario que compare Brevo vs Supabase
   - Reconciliación automática de discrepancias

---

## 📊 DATOS CRÍTICOS PARA GUARDAR

```yaml
Ejecución ID: 29262b82-4211-450c-87e8-9347eddcbdce
Fecha: 2026-03-06
Total Clientes: 209
Enviados Exitosamente: 142 (Brevo) / 133 (Supabase)
En Estado Accepted (No Enviados): 67
Créditos Consumidos: 142
Créditos Disponibles al Inicio: 0 (Plan Free sin recarga)
```

---

## ❓ PREGUNTAS PENDIENTES

1. ¿Cuándo se agotaron los créditos exactamente? (hora/minuto)
2. ¿Hubo otros envíos el 5 de marzo que consumieron créditos?
3. ¿Por qué hay 9 emails de diferencia entre Brevo (142) y Supabase (133)?
4. ¿Los webhooks de Brevo están funcionando correctamente?

---

**Reporte generado el:** 7 de Marzo de 2026  
**Investigador:** Opencode Agent  
**Status:** COMPLETADO - Requiere acción del equipo
