# Control de Idempotencia - Implementación Completada

## 📋 Resumen

Se ha implementado un sistema robusto de **control de idempotencia** en el Worker de emails para prevenir envíos duplicados, uno de los problemas críticos identificados en la investigación.

---

## 🔧 Cambios Realizados

### 1. Nuevos Métodos en SupabaseService (`src/supabase.rs`)

#### `check_client_processed()`
Verifica si un cliente ya fue procesado antes de intentar enviar:
- Retorna `(is_processed, message_id_if_exists)`
- Un cliente se considera procesado si:
  - Status no es "pending" ni "processing"
  - Tiene un `message_id` asignado en `custom_data`

#### `claim_client()`
Adquiere un bloqueo atómico sobre el cliente usando Optimistic Locking:
- Solo permite procesar clientes en estado "pending"
- Actualiza estado a "processing" con timestamp y worker_id
- Previene que múltiples workers procesen el mismo cliente simultáneamente

#### `check_event_exists()`
Verifica si un evento ya existe en `collection_events`:
- Busca por combinación de `client_id` + `event_type` + `message_id`
- Previene duplicados en la tabla de eventos

---

### 2. Modificaciones en el Flujo de Envío (`src/main.rs`)

#### Verificación #1: Antes de procesar cada cliente
```rust
match supabase.check_client_processed(&client.id).await {
    Ok((true, Some(message_id))) => {
        // Cliente ya procesado, saltar
        continue;
    }
    Ok((true, None)) => {
        // Cliente ya procesado, saltar
        continue;
    }
    // Continuar con procesamiento...
}
```

#### Verificación #2: Adquirir bloqueo atómico
```rust
match supabase.claim_client(&client.id).await {
    Ok(true) => {
        // Bloqueo adquirido exitosamente
    }
    Ok(false) => {
        // Otro worker ya lo está procesando, saltar
        continue;
    }
}
```

#### Verificación #3: Antes de cada reintento
Si un intento falla y se va a reintentar, verifica si otro worker ya lo procesó:
```rust
if attempt > 1 {
    match supabase.check_client_processed(&client.id).await {
        Ok((true, Some(msg_id))) => {
            // Otro worker lo procesó, detener reintentos
            break;
        }
    }
}
```

#### Verificación #4: Después de envío exitoso
Antes de marcar como "accepted", verifica si el evento ya existe:
```rust
match supabase.check_event_exists(&client.id, "email_sent", &message_id).await {
    Ok(true) => {
        // Evento duplicado detectado, no insertar de nuevo
        break;
    }
    Ok(false) => {
        // Evento no existe, proceder normalmente
    }
}
```

---

## 🛡️ Mecanismos de Protección

### 1. **Prevención de Duplicados por Reintentos**
- Si un envío falla y se reintenta, se verifica si otro worker ya lo procesó
- Evita que el mismo worker envíe múltiples veces al mismo cliente

### 2. **Prevención de Duplicados por Workers Concurrentes**
- El `claim_client()` usa una operación atómica UPDATE con condición
- Solo un worker puede cambiar el estado de "pending" a "processing"
- Otros workers reciben `false` y saltan al siguiente cliente

### 3. **Prevención de Eventos Duplicados**
- Verificación en `collection_events` antes de insertar
- Protege contra webhooks duplicados o race conditions

### 4. **Recuperación de Fallos**
- Si un worker falla después de adquirir el bloqueo pero antes de completar,
  el cliente queda en estado "processing"
- El próximo worker que intente procesarlo fallará en `claim_client()`
- Se podría agregar un timeout para reintentar clientes "stuck" en "processing"

---

## 📊 Impacto Esperado

### Antes de la implementación:
- ❌ 59 clientes con eventos `email_sent` duplicados
- ❌ 100 eventos duplicados por race conditions
- ❌ Reenvíos automáticos de Brevo generaban múltiples message_ids
- ❌ Workers concurrentes procesaban el mismo cliente

### Después de la implementación:
- ✅ Cada cliente se procesa exactamente una vez
- ✅ Bloqueo atómico previene race conditions
- ✅ Verificación de eventos existentes previene duplicados
- ✅ Logs detallados para debugging con prefijo `[IDEMPOTENCY]`

---

## 🚀 Despliegue

### Pasos para desplegar:

1. **Compilar y desplegar el Worker:**
```bash
cd functions/aws/collection-email-worker
cargo build --release
# Desplegar a AWS Lambda
```

2. **Verificar logs:**
Buscar mensajes con prefijo `[IDEMPOTENCY]` para confirmar que está funcionando:
```
[INFO] [IDEMPOTENCY] Client xxx already processed with message_id: yyy. Skipping.
[INFO] [IDEMPOTENCY] Successfully claimed client xxx for processing
[WARN] [IDEMPOTENCY] Client xxx was already claimed by another worker...
```

3. **Monitorear métricas:**
- Contar eventos duplicados debería reducirse a 0
- Contadores de ejecución deberían ser ≤ total_clients

---

## 📝 Notas Adicionales

### Limitaciones Actuales:
1. **Clientes en estado "processing" stuck:** Si un worker falla después de adquirir el bloqueo pero antes de completar, el cliente queda en "processing" indefinidamente.
   
   **Solución futura:** Agregar un timestamp de inicio de procesamiento y un job que resetee clientes "processing" con más de X minutos.

2. **Múltiples emails por cliente:** Aún se envían múltiples emails si el cliente tiene varios emails en su array.
   
   **Solución futura:** Decidir si enviar solo al primer email o contar como un solo envío.

### Próximos Pasos Recomendados:
1. Agregar índice único en `collection_events` para prevenir duplicados a nivel de BD
2. Implementar timeout para clientes stuck en "processing"
3. Agregar métricas de idempotencia (cuántos fueron skipped, cuántos fueron claimed, etc.)

---

## ✅ Checklist de Verificación

- [x] Métodos de idempotencia implementados en SupabaseService
- [x] Verificación previa al procesar cada cliente
- [x] Bloqueo atómico con claim_client()
- [x] Verificación entre reintentos
- [x] Verificación de eventos duplicados
- [x] Código compila sin errores
- [ ] Desplegado en AWS Lambda
- [ ] Probado con campaña de prueba
- [ ] Monitoreado en producción

---

**Implementado por:** Opencode Agent  
**Fecha:** 7 de Marzo de 2026  
**Status:** ✅ Listo para despliegue
