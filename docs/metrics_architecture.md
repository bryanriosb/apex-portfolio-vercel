# Arquitectura de Métricas - Sistema de Email Batching

## Visión General

Este documento explica la arquitectura de métricas duplicadas entre tablas y por qué es INTENCIONAL y NECESARIO para el sistema de email batching.

## ⚠️ Importante: Duplicación Controlada

**Las métricas están DUPLICADAS entre tablas, pero cada una tiene un PROPÓSITO DIFERENTE.**

Esto no es un error de diseño, sino una decisión arquitectónica para:
1. **Performance**: Queries rápidas sin joins complejos
2. **Separación de responsabilidades**: Cada tabla maneja un aspecto diferente
3. **Resiliencia**: Si una tabla falla, las otras mantienen datos críticos
4. **Auditoría**: Múltiples fuentes de verdad para diferentes contextos

---

## 🏗️ Jerarquía de Métricas

### Diagrama de Relaciones

```
                                    NIVEL DOMINIO
                                         │
                    ┌────────────────────┼────────────────────┐
                    │                    │                    │
                    ▼                    ▼                    ▼
       email_reputation_profiles  daily_sending_limits  warmup_progression_rules
         (Histórico acumulado)      (Por día)              (Config)
                    │                    │
                    └────────────────────┘
                              │
                              ▼
                         NIVEL EJECUCIÓN
                              │
           ┌──────────────────┼──────────────────┐
           │                  │                  │
           ▼                  ▼                  ▼
  collection_executions  execution_batches  batch_queue_messages
    (Agregado total)      (Por grupo)        (Infraestructura)
```

### Propósito de Cada Tabla

| Tabla | Alcance | Propósito | Actualizado Por |
|-------|---------|-----------|-----------------|
| **collection_executions** | Una ejecución específica | Dashboard rápido, UI de progreso general | Lambda (agregación) |
| **execution_batches** | Un batch específico | Tracking granular, debugging, reintentos | Lambda (directo) |
| **email_reputation_profiles** | Todos los envíos de un dominio | Reputación histórica, warm-up, alertas | daily_sending_limits (agregación) |
| **daily_sending_limits** | Un día específico para un dominio | Control de cuotas, progresión ramp-up | Lambda (directo) |
| **batch_queue_messages** | Un mensaje SQS | Tracking de infraestructura, DLQ | Lambda/SQS |

---

## 📊 Comparación de Métricas Duplicadas

### Ejemplo Práctico: Campaña de 4200 clientes

**Escenario**: Ejecución "Campaña Febrero" con estrategia Ramp-Up en dominio `bore.sas`

#### Día 1 (50 emails)

```
┌─────────────────────────────────────────────────────────────────┐
│ collection_executions (Agregado Total)                           │
│ execution_id: "camp-001"                                         │
│ emails_sent: 50        ← Total ejecución hasta ahora             │
│ emails_delivered: 48     ← 48 entregados                           │
│ emails_opened: 12        ← 12 abiertos                             │
│ emails_bounced: 2        ← 2 rebotados                             │
└─────────────────────────────────────────────────────────────────┘
                              ↑
                              │ SUM de batches
                              │
┌─────────────────────────────────────────────────────────────────┐
│ execution_batches (Granular)                                     │
│ batch_id: "batch-001"                                            │
│ execution_id: "camp-001"                                         │
│ batch_number: 1                                                  │
│ emails_sent: 25         ← Primer grupo de 25                       │
│ emails_delivered: 24                                             │
│ emails_opened: 6                                                 │
│ emails_bounced: 1                                                  │
├─────────────────────────────────────────────────────────────────┤
│ batch_id: "batch-002"                                            │
│ execution_id: "camp-001"                                         │
│ batch_number: 2                                                  │
│ emails_sent: 25         ← Segundo grupo de 25                      │
│ emails_delivered: 24                                             │
│ emails_opened: 6                                                 │
│ emails_bounced: 1                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### Reputación del Dominio (Histórico)

```
┌─────────────────────────────────────────────────────────────────┐
│ email_reputation_profiles (Histórico Acumulado)                  │
│ domain: "bore.sas"                                               │
│ total_emails_sent: 50       ← Desde creación del dominio        │
│ total_emails_delivered: 48                                       │
│ total_emails_opened: 12                                          │
│ total_emails_bounced: 2                                          │
│ current_warmup_day: 1      ← Día 1 de warm-up                      │
│ daily_sending_limit: 50    ← Límite del día 1                    │
└─────────────────────────────────────────────────────────────────┘
                              ↑
                              │ SUM de días
                              │
┌─────────────────────────────────────────────────────────────────┐
│ daily_sending_limits (Por Día)                                   │
│ reputation_profile_id: "rep-001"                                 │
│ date: "2026-02-02"                                               │
│ daily_limit: 50                                                  │
│ emails_sent: 50          ← Solo hoy                                │
│ emails_delivered: 48                                               │
│ emails_opened: 12                                                  │
│ emails_bounced: 2                                                  │
│ day_open_rate: 25.00     ← 12/48 = 25%                             │
│ can_progress_to_next_day: TRUE  ← Cumple umbral de 20%             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔍 Cuándo Usar Cada Tabla

### collection_executions

**Usar cuando**: Necesitas métricas agregadas de toda una campaña rápidamente

**Ejemplos**:
```sql
-- Dashboard: Mostrar progreso de ejecución
SELECT 
    name,
    emails_sent,
    emails_delivered,
    ROUND((emails_delivered::numeric / emails_sent) * 100, 2) as delivery_rate,
    status
FROM collection_executions
WHERE business_id = 'uuid'
ORDER BY created_at DESC;

-- Resultado instantáneo, sin joins
-- "Campaña Febrero": 4200 sent, 4100 delivered, 97.62% rate, processing
```

**No usar cuando**: Necesitas saber qué grupo específico falló o métricas históricas del dominio.

---

### execution_batches

**Usar cuando**: Necesitas granularidad, debugging, o reintentos

**Ejemplos**:
```sql
-- Debugging: Qué batches fallaron?
SELECT 
    batch_number,
    batch_name,
    status,
    emails_sent,
    emails_failed,
    error_message
FROM execution_batches
WHERE execution_id = 'camp-001'
  AND status = 'failed';

-- Resultado: "Batch 5 failed: 25 sent, 25 failed, error: SES timeout"

-- Reintentar batches específicos
UPDATE execution_batches
SET status = 'pending', retry_count = retry_count + 1
WHERE execution_id = 'camp-001'
  AND status = 'failed'
  AND retry_count < 3;
```

**No usar cuando**: Solo necesitas el total agregado (usa collection_executions para mejor performance).

---

### email_reputation_profiles

**Usar cuando**: Necesitas evaluar la salud de un dominio o decidir estrategia

**Ejemplos**:
```sql
-- Decidir estrategia: ¿Este dominio está warm-up?
SELECT 
    domain,
    is_warmed_up,
    current_warmup_day,
    open_rate,
    bounce_rate,
    current_strategy
FROM email_reputation_profiles
WHERE domain = 'bore.sas';

-- Resultado: 
-- domain: bore.sas
-- is_warmed_up: false
-- current_warmup_day: 3
-- open_rate: 24.50
-- bounce_rate: 2.10
-- current_strategy: ramp_up
-- Acción: Continuar con ramp_up, puede progresar al día 4

-- Alerta: Dominios con problemas
SELECT domain, bounce_rate, has_reputation_issues
FROM email_reputation_profiles
WHERE bounce_rate > 5
   OR has_reputation_issues = true;
```

**No usar cuando**: Necesitas métricas de una ejecución específica (no tiene execution_id).

---

### daily_sending_limits

**Usar cuando**: Necesitas controlar cuotas diarias o validar límites

**Ejemplos**:
```sql
-- Verificar cuota disponible hoy
SELECT 
    daily_limit - emails_sent as remaining_today,
    daily_limit,
    emails_sent,
    limit_reached,
    paused_until
FROM daily_sending_limits
WHERE reputation_profile_id = 'rep-001'
  AND date = CURRENT_DATE;

-- Resultado: "Remaining: 50/150, limit_reached: false, no pause"

-- Validar progresión warm-up
SELECT 
    date,
    day_open_rate,
    can_progress_to_next_day
FROM daily_sending_limits
WHERE reputation_profile_id = 'rep-001'
ORDER BY date DESC
LIMIT 5;

-- Resultado:
-- 2026-02-02 | 25.00 | true  ← Puede progresar
-- 2026-02-01 | 22.00 | true  
-- 2026-01-31 | 28.00 | true
```

**No usar cuando**: Necesitas métricas agregadas totales (usa email_reputation_profiles).

---

## ⚖️ Consistencia de Datos

### Reglas de Consistencia

1. **collection_executions vs execution_batches**:
   ```
   collection_executions.emails_* = SUM(execution_batches.emails_*)
                                    WHERE execution_id = X
   ```

2. **email_reputation_profiles vs daily_sending_limits**:
   ```
   email_reputation_profiles.total_emails_* = SUM(daily_sending_limits.emails_*)
                                               WHERE reputation_profile_id = X
   ```

### Detección de Inconsistencias

**Vista de consistencia** (ya creada):
```sql
-- Detectar ejecuciones con métricas inconsistentes
SELECT 
    execution_id,
    execution_name,
    diff_sent,
    diff_delivered,
    is_consistent
FROM execution_metrics_consistency_check
WHERE is_consistent = FALSE;

-- Resultado esperado: Vacío (sin inconsistencias)
-- Si hay resultados: Ejecutar reconciliación
```

### Reconciliación Manual

**Función disponible** (ya creada):
```sql
-- Corregir métricas de una ejecución específica
SELECT * FROM reconcile_execution_metrics('uuid-execution');

-- Resultado:
-- metric_name       | old_value | new_value | updated
-- emails_sent       | 4000      | 4200      | true
-- emails_delivered  | 3900      | 4100      | true
-- emails_opened     | 800       | 1000      | true
-- emails_bounced    | 100       | 100       | true
```

---

## 🚨 Troubleshooting: Métricas Inconsistentes

### Síntoma: Dashboard muestra datos incorrectos

**Diagnóstico**:
```sql
-- Paso 1: Verificar consistencia
SELECT * FROM execution_metrics_consistency_check
WHERE execution_id = 'tu-execution-uuid';

-- Si is_consistent = FALSE:
-- Paso 2: Ver detalles
SELECT 
    exec_emails_sent,
    batch_emails_sent,
    diff_sent
FROM execution_metrics_consistency_check
WHERE execution_id = 'tu-execution-uuid';

-- Paso 3: Reconciliar
SELECT * FROM reconcile_execution_metrics('tu-execution-uuid');

-- Paso 4: Verificar corrección
SELECT * FROM execution_metrics_consistency_check
WHERE execution_id = 'tu-execution-uuid';
-- Debe mostrar is_consistent = TRUE
```

### Síntoma: Dominio con reputación incorrecta

**Diagnóstico**:
```sql
-- Verificar si daily_limits suman correctamente a reputation_profiles
WITH daily_totals AS (
    SELECT 
        reputation_profile_id,
        SUM(emails_sent) as daily_total_sent
    FROM daily_sending_limits
    GROUP BY reputation_profile_id
)
SELECT 
    erp.domain,
    erp.total_emails_sent as profile_total,
    dt.daily_total_sent as calculated_total,
    erp.total_emails_sent - dt.daily_total_sent as difference
FROM email_reputation_profiles erp
LEFT JOIN daily_totals dt ON erp.id = dt.reputation_profile_id
WHERE erp.total_emails_sent != dt.daily_total_sent;

-- Si hay diferencias, recalcular:
UPDATE email_reputation_profiles
SET total_emails_sent = (
    SELECT COALESCE(SUM(emails_sent), 0)
    FROM daily_sending_limits
    WHERE reputation_profile_id = email_reputation_profiles.id
)
WHERE id = 'uuid-reputation-profile';
```

---

## 📈 Mejores Prácticas

### 1. Queries de Dashboard

**Correcto** (rápido):
```sql
SELECT 
    name,
    emails_sent,
    emails_delivered,
    open_rate,
    status
FROM collection_executions
WHERE business_id = 'uuid'
ORDER BY created_at DESC
LIMIT 10;
-- Tiempo: < 10ms
```

**Incorrecto** (lento):
```sql
-- No hagas esto para dashboards
SELECT 
    ce.name,
    SUM(eb.emails_sent) as emails_sent,
    SUM(eb.emails_delivered) as emails_delivered
FROM collection_executions ce
LEFT JOIN execution_batches eb ON ce.id = eb.execution_id
WHERE ce.business_id = 'uuid'
GROUP BY ce.id, ce.name
ORDER BY ce.created_at DESC
LIMIT 10;
-- Tiempo: > 500ms (con muchos batches)
```

### 2. Debugging de Batches

**Correcto**:
```sql
-- Usar execution_batches para granularidad
SELECT 
    batch_number,
    status,
    emails_sent,
    emails_delivered,
    emails_opened,
    scheduled_for,
    completed_at
FROM execution_batches
WHERE execution_id = 'uuid'
ORDER BY batch_number;
```

### 3. Evaluación de Estrategia

**Correcto**:
```sql
-- Usar email_reputation_profiles para decisiones de estrategia
SELECT 
    domain,
    is_warmed_up,
    current_warmup_day,
    open_rate,
    bounce_rate,
    CASE 
        WHEN is_warmed_up THEN 'batch'
        WHEN bounce_rate > 5 THEN 'conservative'
        ELSE 'ramp_up'
    END as recommended_strategy
FROM email_reputation_profiles
WHERE business_id = 'uuid';
```

### 4. Control de Cuotas

**Correcto**:
```sql
-- Usar daily_sending_limits para validación de límites
SELECT 
    daily_limit - emails_sent as remaining_today,
    limit_reached,
    paused_until
FROM daily_sending_limits
WHERE reputation_profile_id = 'uuid'
  AND date = CURRENT_DATE;
```

---

## 🔧 Mantenimiento

### Limpieza de Datos Antiguos

```sql
-- Limpiar mensajes SQS procesados (más de 30 días)
DELETE FROM batch_queue_messages
WHERE status IN ('processed', 'failed', 'dlq')
  AND created_at < NOW() - INTERVAL '30 days';

-- Archivar daily_sending_limits antiguos (opcional)
-- Considerar mantener 1 año para análisis histórico
```

### Monitoreo de Consistencia

```sql
-- Crear job para verificar consistencia cada hora
-- Ejemplo con pg_cron (si está instalado):

SELECT cron.schedule(
    'check-metrics-consistency',
    '0 * * * *', -- Cada hora
    $$
    INSERT INTO consistency_check_log (checked_at, inconsistent_count)
    SELECT NOW(), COUNT(*)
    FROM execution_metrics_consistency_check
    WHERE is_consistent = FALSE;
    $$
);
```

---

## 📋 Checklist de Implementación

### Fase 1: Entendimiento ✅
- [x] Leer este documento completamente
- [x] Entender las 4 tablas de métricas
- [x] Comprender las relaciones jerárquicas
- [x] Conocer cuándo usar cada tabla

### Fase 2: Desarrollo
- [ ] Implementar Lambda para actualizar execution_batches
- [ ] Implementar agregación a collection_executions
- [ ] Implementar daily_sending_limits updates
- [ ] Implementar agregación a email_reputation_profiles

### Fase 3: Testing
- [ ] Crear ejecución de prueba (50 clientes)
- [ ] Verificar consistencia: `SELECT * FROM execution_metrics_consistency_check`
- [ ] Confirmar todas las métricas coinciden
- [ ] Probar función de reconciliación

### Fase 4: Monitoreo
- [ ] Configurar alertas si `is_consistent = FALSE`
- [ ] Dashboard de métricas de consistencia
- [ ] Logging de reconciliaciones automáticas

---

## 📞 FAQ

### Q: ¿Por qué no solo usar execution_batches y calcular todo on-demand?
**R**: Performance. Con 4200 clientes en 84 batches, agregar on-demand requiere leer 84 filas. Con collection_executions, es 1 fila directa.

### Q: ¿Y si quiero eliminar collection_executions y calcular desde batches?
**R**: Posible, pero el dashboard será lento. Para 10 ejecuciones, necesitas leer 840 filas (10 × 84 batches) en lugar de 10 filas.

### Q: ¿Cómo me aseguro de que nunca haya inconsistencias?
**R**: 
1. Lambda actualiza execution_batches primero (fuente de verdad)
2. Lambda actualiza collection_executions después (agregado)
3. Trigger en execution_batches actualiza automáticamente collection_executions
4. Vista `execution_metrics_consistency_check` detecta discrepancias
5. Job programado reconcilia automáticamente si hay diferencias

### Q: ¿Puedo eliminar email_reputation_profiles y usar solo daily_sending_limits?
**R**: Posible, pero queries de reputación requerirán SUM todos los días. Con 1 año de datos, eso son 365 filas por dominio vs 1 fila en reputation_profiles.

### Q: ¿Qué pasa si borro un batch?
**R**: 
- collection_executions quedará inconsistente (diferente suma)
- La vista `execution_metrics_consistency_check` lo detectará
- Ejecutar `reconcile_execution_metrics()` para corregir
- Alternativa: Marcar batch como 'cancelled' en lugar de borrar

---

## 📚 Referencias

- [Documento principal de estrategias](./delivery_strategy.md)
- [Migración SQL](../supabase/migrations/20250202000000_email_reputation_and_batching_system.sql)
- [Vistas de consistencia en SQL](../supabase/migrations/20250202000000_email_reputation_and_batching_system.sql#L391)

---

**Documento v1.0** | Febrero 2026 | Arquitectura de Métricas - Sistema de Email Batching
