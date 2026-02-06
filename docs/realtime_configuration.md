# Configuración Realtime para Dashboard de Collection

## ✅ Estado Actual

El dashboard **YA tiene realtime implementado** y functional. Los hooks se encargan de las subscripciones automáticamente.

---

## 📊 Tablas que DEBEN tener Realtime Habilitado

### 1. `collection_clients` ⭐ **CRÍTICA**

**Razón**: Se actualiza cuando llegan eventos de webhooks (delivered, opened, bounced, clicked, etc.)

**Usado por:**

- Dashboard principal (`/admin/dashboard`)
- Hook `useRealtimeExecution` (vista de ejecución individual)
- Webhook handler (actualiza status y custom_data)

**Eventos escuchados:**

- `INSERT`: Cuando se crean nuevos clientes
- `UPDATE`: Cuando cambia el status (sent → delivered → opened)
- `DELETE`: Cuando se eliminan clientes

**Sin realtime**: Los cambios de status de emails NO se verán hasta refrescar página manualmente.

---

### 2. `collection_executions` ⭐ **IMPORTANTE**

**Razón**: Se actualiza cuando cambia el progreso, status o métricas de una ejecución

**Usado por:**

- Dashboard principal (lista de ejecuciones activas)
- Hook `useRealtimeExecution` (detalles de ejecución)
- Proceso de envío de emails (actualiza progreso)

**Eventos escuchados:**

- `UPDATE`: Cambios en status, progreso, contadores

**Sin realtime**: El progreso de ejecuciones en curso NO se actualizará automáticamente.

---

### 3. `collection_events` 🔵 **OPCIONAL (recomendado)**

**Razón**: Registra todos los eventos de webhooks para auditoría

**Usado por:**

- Vistas de detalle de clientes (si se implementa timeline de eventos)
- Debugging y análisis

**Eventos escuchados:**

- `INSERT`: Nuevos eventos de webhooks

**Sin realtime**: Los eventos se registran pero no se ven en tiempo real (generalmente no se muestran en dashboard principal).

---

## 🔧 Cómo Habilitar Realtime en Supabase

### Opción 1: Via Supabase Dashboard (Recomendado)

1. Ir a **Database** → **Replication**
2. Buscar la tabla (ej: `collection_clients`)
3. Hacer clic en **Enable Realtime**
4. Repetir para cada tabla necesaria

### Opción 2: Via SQL

```sql
-- Habilitar realtime para collection_clients
ALTER PUBLICATION supabase_realtime ADD TABLE collection_clients;

-- Habilitar realtime para collection_executions
ALTER PUBLICATION supabase_realtime ADD TABLE collection_executions;

-- Habilitar realtime para collection_events (opcional)
ALTER PUBLICATION supabase_realtime ADD TABLE collection_events;
```

### Verificar que está habilitado

```sql
-- Ver qué tablas tienen realtime habilitado
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
```

---

## 🎯 Implementación Actual

### Dashboard Principal (`/app/admin/dashboard/page.tsx`)

```typescript
// Líneas 196-240
useEffect(() => {
  if (!activeBusiness?.id) return

  const channel = supabase
    .channel('dashboard-realtime')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'collection_executions',
      filter: `business_id=eq.${activeBusiness.id}`,
    }, () => {
      // Refresca stats cuando cambian ejecuciones
      getDashboardStatsAction(activeBusiness.id).then(setStats)
      getActiveExecutionsAction(activeBusiness.id).then(setActiveExecutions)
    })
    .on('postgres_changes', {
      event: '*', 
      schema: 'public', 
      table: 'collection_clients'
    }, async (payload) => {
      // Refresca clientStats cuando cambian clientes
      for (const exec of activeExecutions) {
        const clientStats = await getExecutionClientsAction(exec.id)
        setActiveExecutionClientStats(exec.id, clientStats)
      }
    })
    .subscribe()

  return () => supabase.removeChannel(channel)
}, [activeBusiness?.id, supabase, activeExecutions])
```

### Hook de E jecución (`/hooks/collection/use-realtime-execution.ts`)

```typescript
// Líneas 96-151
useEffect(() => {
  if (!initialExecution?.id) return

  // Suscripción a actualizaciones de la ejecución
  const executionChannel = supabase
    .channel(`execution-${initialExecution.id}`)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'collection_executions',
      filter: `id=eq.${initialExecution.id}`,
    }, (payload) => {
      setExecution(payload.new as CollectionExecution)
    })
    .subscribe()

  // Suscripción a cambios en clientes
  const clientsChannel = supabase
    .channel(`clients-${initialExecution.id}`)
    .on('postgres_changes', {
      event: '*', // INSERT, UPDATE, DELETE
      schema: 'public',
      table: 'collection_clients',
      filter: `execution_id=eq.${initialExecution.id}`,
    }, () => {
      fetchClientStats()
      fetchRecentClients()
    })
    .subscribe()

  return () => {
    supabase.removeChannel(executionChannel)
    supabase.removeChannel(clientsChannel)
  }
}, [initialExecution?.id, supabase])
```

---

## 🔄 Flujo de Eventos Realtime

### Cuando llega un webhook de Brevo/SES

```
1. Email entregado/abierto
   ↓
2. Brevo/SES envía webhook a /api/webhooks/email/[provider]
   ↓
3. Next.js parser normaliza evento
   ↓
4. email-webhook-handler.ts actualiza:
   - collection_events (INSERT)
   - collection_clients (UPDATE status + custom_data)
   ↓
5. Supabase Realtime publica cambio
   ↓
6. Dashboard recibe notificación via websocket
   ↓
7. React refresca UI automáticamente
```

**Resultado**: El usuario ve el cambio de status en < 1 segundo sin refrescar página.

---

## ⚡ Optimizaciones Implementadas

### 1. Polling Inteligente

El dashboard usa polling adaptativo:

- **2 segundos** cuando hay ejecuciones activas (progreso rápido)
- **10 segundos** cuando no hay ejecuciones activas (ahorro de recursos)
- Se detiene completamente cuando no hay actividad

### 2. Canales Específicos

Cada vista crea su propio canal con filtros:

- Dashboard: Filtra por `business_id`
- Ejecución individual: Filtra por `execution_id`

Esto reduce tráfico de websocket innecesario.

### 3. Batch Updates

Cuando se detectan cambios en `collection_clients`, el dashboard:

- Agrupa actualizaciones de todos los clientes de una ejecución
- Hace una sola query para refrescar stats
- Evita N queries individuales

---

## 🧪 Testing Realtime

### Test Manual

1. **Abrir dashboard** en el navegador
2. **Enviar email** desde una campaña
3. **Abrir DevTools** → Console
4. Deberías ver logs:

   ```
   Subscribed to execution updates
   Subscribed to client updates
   Dashboard: Client change detected
   ```

5. **Ir a Brevo** y simular evento (o esperar que llegue real)
6. **Ver dashboard** actualizar automáticamente

### Test con curl (simular webhook)

```bash
# Simular evento delivered
curl -X POST https://apex.borls.com/api/webhooks/email/brevo \
  -H "Content-Type: application/json" \
  -H "authorization: tu_BREVO_WEBHOOK_KEY" \
  -d '{
    "event": "delivered",
    "email": "cliente@example.com",
    "message-id": "mensaje_id_real",
    "date": "'$(date -Iseconds)'"
  }'
```

Deberías ver el status cambiar en el dashboard sin refrescar.

---

## ✅ Checklist de Configuración

- [ ] Verificar que `collection_clients` tiene realtime habilitado
- [ ] Verificar que `collection_executions` tiene realtime habilitado
- [ ] (Opcional) Habilitar `collection_events` para auditoría
- [ ] Abrir dashboard y verificar logs de suscripción en console
- [ ] Enviar email de prueba y ver que actualiza automáticamente
- [ ] Simular webhook y verificar cambio de status en tiempo real

---

## 🐛 Troubleshooting

### No veo updates en tiempo real

1. **Verificar realtime habilitado**:

   ```sql
   SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
   ```

2. **Verificar logs de browser**:
   - Abrir DevTools → Console
   - Buscar: "Subscribed to..." o "SUBSCRIBED"
   - Si no aparece → problema de conexión

3. **Verificar RLS policies**:
   - Las subscripciones respetan Row Level Security
   - Usuario debe tener permiso `SELECT` en las tablas

4. **Verificar límites de Supabase**:
   - Plan Free: Max 2 concurrent connections
   - Plan Pro: Max 500 concurrent connections

### Delay en updates

- **Normal**: 100-500ms de latencia
- **Lento (> 2s)**: Verificar red o plan de Supabase
- **Muy lento**: Considerar reducir filtros o usar polling

---

## 📚 Referencias

- [Supabase Realtime Docs](https://supabase.com/docs/guides/realtime)
- [PostgreSQL Replication Publications](https://www.postgresql.org/docs/current/sql-createpublication.html)
- Hook implementado: [`/hooks/collection/use-realtime-execution.ts`](file:///home/bryan/Workspace/borls/apex-portfolio/hooks/collection/use-realtime-execution.ts)
- Dashboard: [`/app/admin/dashboard/page.tsx`](file:///home/bryan/Workspace/borls/apex-portfolio/app/admin/dashboard/page.tsx)
