# Plan: Eventos de Automatización + i18n Centralizado

Extender el WebSocket de automatización para manejar los 12 tipos de eventos del protocolo, con un sistema de i18n centralizado en español que migre las traducciones existentes de `JobDetailPanel` y `JobObservabilityViewer`, y que el `AutomationTicker` muestre todos los eventos tipados.

## Scope

**In:**
- Tipos TypeScript para los 12 eventos server→client + enums del protocolo
- Sistema de i18n centralizado (sin librería externa, `Record<string, string>` tipado)
- Archivos de traducción: eventos, status, módulos (`collection` → `Cartera`), campos de dominio, UI labels
- Refactorizar `useAutomationWebSocket` para despachar **todos** los tipos de evento (hoy solo pasa `JobStateChanged`)
- Expandir `automation-events-store` para almacenar eventos tipados por categoría (`category` llega del backend)
- Migrar traducciones de `JobDetailPanel` y `JobObservabilityViewer` al i18n centralizado
- Actualizar `AutomationTicker` para mostrar todos los eventos con labels/iconos por tipo

**Out:**
- Cambios en el backend (Rust/WebSocket server)
- Soporte para idiomas distintos a español
- Componentes de UI nuevos
- Testing e2e del WebSocket

## Action items

### Fase 1: Tipos TypeScript — Eventos del Protocolo

- [x] **1. Crear `lib/types/automation/automation-event-types.ts`**
  - Interfaces server→client: `JobStateChangedEvent`, `WorkflowLogEvent`, `ToolCallStartedEvent`, `ToolCallCompletedEvent`, `AgentThinkingEvent`, `AgentResolvedEvent`, `WorkflowNodeStartedEvent`, `WorkflowNodeCompletedEvent`, `SkillsResolvedEvent`, `ToolConnectionChangedEvent`, `CronTriggeredEvent`, `PongEvent`
  - Enums: `JobType`, `ToolType`, `WorkflowNodeType`, `ToolConnectionStatus`, `WorkflowLogLevel`, `EventCategory`
  - Structs: `SkillInfo`
  - Client→server: `SubscribeMessage`, `PingMessage`, `AutomationClientMessage`
  - Union type: `AutomationServerEvent`
  - Fuentes de referencia: `websocket/src/automation/protocol.rs` (backend), doc de apéndice del usuario

- [x] **2. Consolidar en `lib/services/automation/automation-types.ts`**
  - Eliminar definición parcial de `JobStateChangedEvent` (líneas 140-151)
  - Re-exportar desde `@/lib/types/automation/automation-event-types`
  - Mantener tipos de dominio existentes (`Job`, `AgentJob`, `AgentWorkflowJob`, `ApexJob`, etc.)

- [x] **3. Verificar imports**
  - `hooks/use-automation-websocket.ts:4` → importa `JobStateChangedEvent`
  - `lib/store/automation-events-store.ts:2` → importa `JobStateChangedEvent`
  - `hooks/use-automation-jobs.ts:7` → importa `JobStateChangedEvent`
  - Asegurar que todos apunten a la ubicación consolidada

### Fase 2: Sistema de Internacionalización

- [x] **4. Crear `lib/i18n/es-automation.ts`**
  - `modules`: `{ collection: 'Cartera' }` (+ extensible para futuros módulos)
  - `statuses`: `{ Pending: 'Pendiente', Running: 'Procesando', Interrupted: 'Aprobación', Completed: 'Completada', Failed: 'Fallida' }`
  - `events`: labels para los 12 tipos de evento
    - `JobStateChanged` → `'Cambio de Estado'`
    - `ToolCallStarted` → `'Herramienta Iniciada'`
    - `ToolCallCompleted` → `'Herramienta Completada'`
    - `AgentThinking` → `'Agente Razonando'`
    - `AgentResolved` → `'Agente Resolvió'`
    - `WorkflowNodeStarted` → `'Nodo Iniciado'`
    - `WorkflowNodeCompleted` → `'Nodo Completado'`
    - `SkillsResolved` → `'Skills Aplicadas'`
    - `ToolConnectionChanged` → `'Conexión Cambió'`
    - `CronTriggered` → `'Cron Disparado'`
    - `WorkflowLog` → `'Log de Workflow'`
  - `jobTypes`: `{ AgentJob: 'Trabajo de Agente', AgentWorkflowJob: 'Trabajo de Workflow', ApexJob: 'Trabajo Apex' }`
  - `toolTypes`: `{ Function: 'Función', McpLocal: 'MCP Local', McpRemote: 'MCP Remoto', Integration: 'Integración', IntegrationService: 'Servicio de Integración', Notification: 'Notificación', Ontology: 'Ontología', Artifact: 'Artifacto' }`
  - `nodeTypes`: `{ Agent: 'Agente', HITL: 'Aprobación Humana', Transform: 'Transformación', Assembler: 'Ensamblador', Function: 'Función' }`
  - `connectionStatus`: `{ Connected: 'Conectado', Disconnected: 'Desconectado', TokenRefreshed: 'Token Refrescado', AuthFailed: 'Error de Autenticación' }`
  - `logLevels`: `{ INFO: 'Información', WARN: 'Advertencia', ERROR: 'Error' }`
  - `categories`: `{ tool: 'Herramienta', agent: 'Agente', workflow: 'Workflow', connection: 'Conexión', scheduling: 'Programación' }`

- [x] **5. Crear `lib/i18n/es-domain.ts`**
  - Consolidar `COMMON_TRANSLATIONS` de `JobDetailPanel` (50+ campos: `email_reply`, `customer_name`, `amount`, etc.)
  - Consolidar `JOB_SCHEMAS` de `JobDetailPanel` (schemas por job type: `agent-workflow-job_email_reply`, etc.)
  - Consolidar `ARG_TRANSLATIONS` de `JobObservabilityViewer` (40+ campos)

- [x] **6. Crear `lib/i18n/es-ui.ts`**
  - Labels de UI: `informacionGeneral`, `trabajo`, `ejecucionAgente`, `resultadoEjecucion`, `metadatos`, `contextoDelTrabajo`, `accionRequerida`, `registrosDeDecision`, `conectando`, `reconectando`, `sinActividadReciente`, `reconectar`, `enviandoDecision`, `verMas`, `verMenos`, `verDiagrama`, `verAgentes`, `agentesDelGrafo`, `composicionDelGrafo`, `observabilidadDeEjecucion`, `cadenaDePensamiento`, `costoTotal`, `usoTokens`, `eventos`, `interacciones`, `errorRenderizandoDiagrama`, `trabajoDeAgentes`, `trabajoDeWorkflow`, `ejecucionUnica`, `nombre`, `descripcion`, `skillsActivos`, `agenteId`, `idSesion`, `usuarioId`, `resultado`, `razonamiento`, `error`, `grafo`, `agente`, `flujoDelGrafo`, `obteniendoRegistros`, `noHayDatosDisponibles`, `noHayEventosRegistrados`, `si`, `no`, `general`

- [x] **7. Crear `lib/i18n/index.ts`**
  - Barrel export con objeto `es` consolidado (todos los namespaces)
  - Funciones helper tipadas:
    - `t(key: string, params?: Record<string, string>)` — interpolar parámetros con `{key}`
    - `getModuleLabel(module: string)` → traduce módulo o retorna el original
    - `getStatusLabel(status: string)` → traduce status
    - `getEventLabel(type: string)` → label del tipo de evento
    - `getFieldLabel(key: string)` → label de campo de dominio
    - `getJobTypeLabel(jobType: string)` → label del tipo de job
    - `getToolTypeLabel(toolType: string)` → label del tipo de tool
    - `getNodeTypeLabel(nodeType: string)` → label del tipo de nodo
    - `getConnectionStatusLabel(status: string)` → label del status de conexión
    - `getLogLevelLabel(level: string)` → label del nivel de log
    - `getCategoryLabel(category: string)` → label de la categoría

- [x] **8. Crear `hooks/use-automation-i18n.ts`**
  - Hook React que retorne todas las funciones helper tipadas
  - Consumible en componentes client-side
  - Default locale: `es`

### Fase 3: Refactorizar WebSocket Hook — Todos los Eventos

- [x] **9. Refactorizar `hooks/use-automation-websocket.ts`**
  - Cambiar firma del callback: `onEvent: (event: AutomationServerEvent) => void` (antes era `JobStateChangedEvent`)
  - En `onMessage` (línea 56-68): eliminar el filtro `parsed.job_id && parsed.new_status` que solo deja pasar `JobStateChanged`
  - Pasar **todos** los eventos parseados (excepto `Pong`) al callback como `AutomationServerEvent`
  - Enviar mensaje `Subscribe` al conectar (después de `onOpen`): `ws.send(JSON.stringify({ type: 'Subscribe', filters: null }))`
  - Mantener heartbeat existente (`Ping` cada 30s)

- [x] **10. Actualizar `hooks/use-automation-jobs.ts`**
  - Cambiar tipo del callback para recibir `AutomationServerEvent`
  - Discriminar por `event.type`:
    - `JobStateChanged` → lógica existente de actualización de jobs (líneas 94-124)
    - Demás tipos → enviar al store para el ticker
  - Mantener `fetchMetrics()` después de cada evento relevante

### Fase 4: Expandir Store de Eventos

- [x] **11. Refactorizar `lib/store/automation-events-store.ts`**
  - Cambiar tipo de `events` de `JobStateChangedEvent[]` a `AutomationServerEvent[]`
  - Cambiar tipo de `lastEvent` de `JobStateChangedEvent | null` a `AutomationServerEvent | null`
  - Usar `event.category` (campo inyectado por backend) para clasificar eventos
  - Mantener deduplicación por `(job_id, type, timestamp)` (antes era `job_id, new_status, timestamp`)
  - Mantener compatibilidad: los eventos `JobStateChanged` (sin `category`) se almacenan igual
  - Agregar selectores:
    - `getEventsByCategory(category: EventCategory)` → filtra por categoría
    - `getEventsByJobId(jobId: string)` → filtra por job_id

### Fase 5: Migrar Traducciones de Componentes

- [x] **12. Refactorizar `components/automation/JobDetailPanel.tsx`**
  - Eliminar `MODULE_MAP` (líneas 30-32)
  - Eliminar `STATUS_MAP` (líneas 34-40)
  - Eliminar `COMMON_TRANSLATIONS` (líneas 42-93)
  - Eliminar `JOB_SCHEMAS` (líneas 95-119)
  - Importar desde `@/lib/i18n/`: `getModuleLabel`, `getStatusLabel`, `getFieldLabel`, `t`
  - Reemplazar en `JobContextViewer`:
    - `MODULE_MAP[job.module.toLowerCase()]` → `getModuleLabel(job.module)`
    - `STATUS_MAP[job.status]` → `getStatusLabel(job.status)`
    - `activeTranslations[key]` → `getFieldLabel(key)`
  - Reemplazar en `renderKeyValue`: usar `getFieldLabel(key)` en lugar del merge de `COMMON_TRANSLATIONS` + `JOB_SCHEMAS`
  - Reemplazar strings UI: `'Información General'`, `'Trabajo'`, `'Ejecución del Agente'`, etc. por `t('ui.informacionGeneral')`, etc.
  - Reemplazar `'Sí'`/`'No'` por `t('ui.si')`/`t('ui.no')`

- [x] **13. Refactorizar `components/automation/JobObservabilityViewer.tsx`**
  - Eliminar `ARG_TRANSLATIONS` (líneas 30-80)
  - Importar `getFieldLabel` desde `@/lib/i18n/`
  - Reemplazar en `renderValue` y `translateKey`: `ARG_TRANSLATIONS[k]` → `getFieldLabel(k)`
  - Reemplazar strings UI hardcodeados por traducciones del i18n

- [x] **14. Refactorizar `components/automation/AutomationTicker.tsx`**
  - Adaptar para mostrar **todos** los tipos de eventos (hoy solo muestra `JobStateChanged` con `event.module` y `event.new_status`)
  - Crear función `getEventDisplay(event: AutomationServerEvent)` que retorne `{ icon, label, module }` según `event.type`:
    - `JobStateChanged` → icono por `job_type`, label = `getStatusLabel(event.new_status)`, module = `getModuleLabel(event.module)`
    - `ToolCallStarted/Completed` → icono `Wrench`, label = `getEventLabel(event.type)` + `event.tool_name`, module = del job
    - `AgentThinking/Resolved` → icono `Brain`, label = `getEventLabel(event.type)` + `event.agent_name`, module = del job
    - `WorkflowNodeStarted/Completed` → icono `GitBranch`, label = `getEventLabel(event.type)` + `event.node_id`, module = del job
    - `SkillsResolved` → icono `Sparkles`, label = `getEventLabel(event.type)`, module = del job
    - `ToolConnectionChanged` → icono `Plug`, label = `getConnectionStatusLabel(event.status)`, module = event.tool_name
    - `CronTriggered` → icono `Clock`, label = `getEventLabel(event.type)`, module = del job
    - `WorkflowLog` → icono `FileText`, label = `event.message`, module = del job
  - Cambiar store selector: `s.events` → `s.events` (ya es `AutomationServerEvent[]` tras Fase 4)
  - Adaptar key del motion div: usar `event.type + event.job_id + event.timestamp` (antes era `event.job_id + event.new_status + event.timestamp`)
  - Reemplazar strings hardcodeados:
    - `'Conectando...'` → `t('ui.conectando')`
    - `'Reconectando...'` → `t('ui.reconectando')`
    - `'Sin actividad reciente'` → `t('ui.sinActividadReciente')`
    - `'Reconectar'` → `t('ui.reconectar')`
    - `event.new_status` → `getStatusLabel(event.new_status)` (solo para `JobStateChanged`)
    - `[event.module || 'General']` → `[getModuleLabel(event.module) || t('ui.general')]`

- [x] **15. Refactorizar `components/automation/JobCard.tsx`**
  - Reemplazar `getBadgeText()` hardcodeado:
    - `'ACCIÓN REQUERIDA'` → `getStatusLabel('Interrupted')` o label del i18n
    - `'AUTOMATIZADO'` → `t('ui.automatizado')`
    - `'AI-APEX'` → `t('ui.aiApex')`

- [x] **16. Revisar otros componentes en `components/automation/`**
  - `AutomationLog.tsx` — migrar strings hardcodeados al i18n
  - `DetailView.tsx` — migrar strings hardcodeados al i18n
  - `DashboardView.tsx` — migrar strings hardcodeados al i18n
  - `KanbanColumn.tsx` — migrar strings hardcodeados al i18n
  - `ModuleSidebar.tsx` — migrar strings hardcodeados al i18n
  - `RunningIndicator.tsx` — migrar si tiene strings

### Fase 6: Validación

- [x] **17. Typecheck y Lint**
  - Ejecutar `bunx tsc --noEmit` para verificar que todos los tipos son consistentes
  - Ejecutar `bun run lint` para verificar regressions
  - Verificar que los componentes que consumen `useAutomationWebSocket` y `useAutomationJobs` compilan correctamente

- [x] **18. Verificación de flujo**
  - Verificar que el store de eventos sigue funcionando con el flujo existente de actualización de jobs en `useAutomationJobs`
  - Verificar que `AutomationTicker` muestra todos los tipos de evento recibidos
  - Verificar que `JobDetailPanel` usa las traducciones centralizadas

## Estructura de Archivos (Resultado)

```
lib/types/automation/
├── automation-event-types.ts          ← NUEVO: tipos del protocolo WS

lib/i18n/
├── index.ts                           ← NUEVO: barrel + helpers
├── es-automation.ts                   ← NUEVO: eventos, status, módulos
├── es-domain.ts                       ← NUEVO: campos de dominio (migrado de componentes)
├── es-ui.ts                           ← NUEVO: labels de UI

hooks/
├── use-automation-i18n.ts             ← NUEVO: hook React para i18n
├── use-automation-websocket.ts        ← MODIFICADO: todos los eventos + Subscribe
├── use-automation-jobs.ts             ← MODIFICADO: discriminar por event.type

lib/store/
├── automation-events-store.ts         ← MODIFICADO: AutomationServerEvent[]

lib/services/automation/
├── automation-types.ts                ← MODIFICADO: re-exportar desde event-types

components/automation/
├── JobDetailPanel.tsx                  ← MODIFICADO: usar i18n centralizado
├── JobObservabilityViewer.tsx         ← MODIFICADO: usar i18n centralizado
├── AutomationTicker.tsx               ← MODIFICADO: todos los eventos + i18n
├── JobCard.tsx                        ← MODIFICado: usar i18n centralizado
```

## Open questions

Ninguna — resueltas por el usuario:
1. `category` llega en los eventos del backend → se usa para clasificar
2. No se implementa mecanismo nuevo de eventos → se extiende el existente
3. Todos los tipos de eventos se emitirán y mostrarán en `AutomationTicker`
