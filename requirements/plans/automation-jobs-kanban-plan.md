# Plan: Interfaz de Automatización - Kanban de Agent Jobs

Construcción de una nueva interfaz en `/admin/agentic/automation` para gestionar `AgentJob` y `AgentWorkflowJob` mediante un tablero Kanban en tiempo real con capacidad HITL (Human-in-the-Loop).

## Arquitectura del Proyecto (Patrón Existente)

```
Components (Client)
└── Hooks (Client)
    └── Services (Client/Server)
        └── Actions (Server - 'use server')
            └── apiApexAiAuth (axios con Bearer token)
```

- **Actions** (`lib/actions/`): Server Actions con `'use server'` que usan axios para llamar a la API externa. Implementan CRUD genérico en `lib/actions/api/crud.ts`
- **Services** (`lib/services/`): Lógica de negocio que consume actions o gestiona estado complejo
- **Hooks** (`hooks/`): Abstracción React para consumir services en componentes
- **WebSocket**: Handshake via `getAuthTicket()` para obtener JWT ticket, luego conexión WS pasando `token` como query param

## Scope

**In:**
- Nuevo submenú "Automatización" en Agencia IA (icono Zap de Lucide)
- Layout de 2 columnas: sidebar de módulos (shrink) + área principal (grande)
- **Vista Dashboard**: Scroll vertical con bloques Kanban, uno por cada módulo. Cada bloque tiene scroll horizontal propio
- **Vista Detalle**: Kanban de 4 columnas (PENDING, RUNNING, INTERRUPTED, COMPLETED) + panel lateral "Automation Log"
- WebSocket para sincronización en tiempo real (con handshake JWT)
- Panel lateral HITL para jobs en INTERRUPTED usando `@zavora-ai/adk-ui-react`
- Server Actions para consumir API REST
- Service de automation que orquesta actions
- Hooks React para estado y WebSocket
- Icono animado profesional para jobs en ejecución

**Out:**
- Implementación del backend REST/WebSocket
- Drag & drop manual entre columnas
- Creación/edición de jobs (solo visualización y aprobación)

## Estructura Visual (Basada en Imágenes de Referencia)

### Vista Dashboard (automate-a.png)
```
[Sidebar: Módulos] | [Main: Scroll Vertical]
                     [Bloque: Módulo A]
                       [PROCESSING] [ACTION REQUIRED] [COMPLETED]
                     [Bloque: Módulo B]
                       [PROCESSING] [ACTION REQUIRED] [COMPLETED]
                     [Bloque: Módulo C]
                       [PROCESSING] [ACTION REQUIRED] [COMPLETED]
```

### Vista Detalle (automate.png)
```
[Sidebar: Módulos] | [Main: Kanban 4 cols] | [Panel: Automation Log]
                       [PENDING] [RUNNING] [APPROVAL] [COMPLETED]
```

### Panel HITL (automate-2.png)
- Panel lateral derecho (Sheet)
- Tabs: "Review scenario" / "Agent decision log"
- Contexto del agente renderizado dinámicamente

## Action items

### Fase 1: Infraestructura y Navegación

- [ ] **1. Agregar dependencia `@zavora-ai/adk-ui-react`**
  - `bun add @zavora-ai/adk-ui-react`
  - Verificar compatibilidad con React 18

- [ ] **2. Actualizar menú sidebar en `const/sidebar-menu.ts`**
  - Agregar sub-item "Automatización" en grupo "Agencia IA"
  - URL: `/admin/agentic/automation`
  - Icono: `Zap` de Lucide
  - Posición: debajo de "Conectores"

- [ ] **3. Crear estructura de directorios**
  ```
  app/admin/agentic/automation/
  ├── page.tsx                      # Server Component
  components/automation/
  ├── AutomationLayout.tsx          # Layout principal 2 columnas
  ├── ModuleSidebar.tsx             # Sidebar izquierdo con módulos
  ├── DashboardView.tsx             # Vista: Todos los módulos como filas
  ├── DetailView.tsx                # Vista: Módulo individual + Log
  ├── KanbanBlock.tsx               # Bloque Kanban por módulo (scroll-x)
  ├── KanbanColumn.tsx              # Columna individual (scroll-y)
  ├── JobCard.tsx                   # Tarjeta de job
  ├── AutomationLog.tsx             # Panel lateral de log
  ├── HITLPanel.tsx                 # Panel lateral para HITL
  ├── HITLFormRenderer.tsx          # Wrapper ADK-UI Renderer
  ├── RunningIndicator.tsx          # Icono animado
  hooks/
  ├── use-automation.ts             # Hook principal de automation
  lib/services/automation/
  ├── automation-service.ts         # Service que consume actions
  ├── automation-types.ts           # Tipos TypeScript
  lib/actions/automation/
  ├── automation-actions.ts         # Server Actions para API REST
  ```

### Fase 2: Server Actions (lib/actions/automation/)

- [ ] **4. Crear `automation-actions.ts`**
  - Usar funciones CRUD de `lib/actions/api/crud.ts`
  - `'use server'`
  - Funciones:
    ```typescript
    export async function getAutomationMetrics(): Promise<AutomationMetricsResponse>
    export async function getAgentJobs(module: string): Promise<AgentJob[]>
    export async function getWorkflowJobs(module: string): Promise<AgentWorkflowJob[]>
    export async function getWorkflowJobDetail(id: string): Promise<AgentWorkflowJob>
    export async function resumeWorkflowJob(id: string, stateUpdates: Record<string, any>): Promise<any>
    export async function getAutomationLog(module: string): Promise<AutomationLogEntry[]>
    ```
  - Usar `activeBusinessId` del store cuando aplique
  - Base URL manejado automáticamente por `apiApexAiAuth` interceptor

### Fase 3: Tipos y Service

- [ ] **5. Definir tipos en `lib/services/automation/automation-types.ts`**
  - `JobStatus`: `'Pending' | 'Running' | 'Interrupted' | 'Completed' | 'Failed'`
  - `AgentJob` y `AgentWorkflowJob` (según instrucciones técnicas)
  - `ModuleMetrics` con métricas por módulo
  - `AutomationMetricsResponse`
  - `JobStateChangedEvent` para WebSocket
  - `InterruptData`, `UiResponse`, `UiEvent`
  - `AutomationLogEntry`
  - Helper `safeParseJSON`

- [ ] **6. Implementar `AutomationService` en `lib/services/automation/automation-service.ts`**
  - Clase que consume las Server Actions
  - Métodos que delegan a actions:
    ```typescript
    class AutomationService {
      async getMetrics(): Promise<AutomationMetricsResponse>
      async getAgentJobs(module: string): Promise<AgentJob[]>
      async getWorkflowJobs(module: string): Promise<AgentWorkflowJob[]>
      async getWorkflowJobDetail(id: string): Promise<AgentWorkflowJob>
      async resumeWorkflowJob(id: string, stateUpdates: Record<string, any>): Promise<any>
      async getAutomationLog(module: string): Promise<AutomationLogEntry[]>
    }
    ```

### Fase 4: WebSocket con Handshake

- [x] **7. Implementar hook `useAutomationWebSocket`**
  - Usar patrón de `AgentService` + `WebSocketService`
  - **Handshake**:
    1. Llamar `getAuthTicket()` para obtener JWT ticket
    2. Construir URL: `wss://apex-ai.borls.com/ws/automation?token={ticket}&agent_id={agentId}&user_id={userId}`
  - Escuchar eventos `JobStateChangedEvent`
  - Reconexión automática con backoff exponencial (1s, 2s, 4s, 8s, max 30s)
  - Actualizar estado local de jobs al recibir eventos
  - Cleanup en unmount

### Fase 5: Hook Principal

- [x] **8. Crear `useAutomation` hook**
  - Estado: jobs por módulo, métricas, vista actual, módulo seleccionado
  - Métodos:
    - `loadMetrics()` - carga métricas iniciales
    - `loadJobs(module)` - carga jobs de un módulo
    - `selectModule(module)` - cambia a vista detalle
    - `backToDashboard()` - vuelve a vista dashboard
    - `handleJobStateChange(event)` - procesa evento WebSocket
  - Integra `useAutomationWebSocket` para updates en tiempo real
  - Expone estado y métodos a componentes

### Fase 6: UI - Layout y Componentes Principales

- [x] **9. Crear `AutomationLayout`**
  - Flex row: sidebar fijo (~280px) + main flex-1
  - Estado global: `viewMode` ('dashboard' | 'detail'), `selectedModule`
  - Toggle entre vistas al hacer click en módulo del sidebar
  - Recibe `initialMetrics` desde Server Component

- [x] **10. Crear `ModuleSidebar`**
  - Lista vertical de módulos con métricas resumidas
  - Cada módulo: nombre, contadores, badges de estado
  - Click en módulo → cambia a vista detalle
  - Botón "Ver todos" para volver a dashboard

- [x] **11. Crear `DashboardView`**
  - Scroll vertical con múltiples `KanbanBlock`
  - Un bloque por cada módulo activo
  - Cada bloque: header + scroll horizontal propio
  - Columnas por bloque: PROCESSING, ACTION REQUIRED (Interrupted), COMPLETED

- [x] **12. Crear `KanbanBlock`**
  - Contenedor horizontal con scroll-x
  - Header: nombre del módulo + icono + métricas
  - Múltiples `KanbanColumn` en fila horizontal
  - Estilo: sin esquinas redondeadas, fondo oscuro/bordered

- [x] **13. Crear `KanbanColumn`**
  - Header: nombre + contador + icono de estado
  - Scroll vertical interno (`ScrollArea`)
  - Ancho fijo (~300px)
  - Colores: PROCESSING (azul), ACTION REQUIRED (ámbar), COMPLETED (verde)

- [x] **14. Crear `JobCard`**
  - Diseño tipo tarjeta horizontal
  - Icono según tipo (AgentJob vs WorkflowJob)
  - Título: `kind` o nombre descriptivo
  - Subtítulo: módulo origen, fecha
  - Badge de estado
  - `RunningIndicator` para jobs en ejecución
  - Click en INTERRUPTED → abre `HITLPanel`

- [x] **15. Crear `DetailView`**
  - Layout: Kanban 4 columnas + Automation Log lateral
  - Header del módulo con métricas
  - 4 columnas: PENDING, RUNNING, INTERRUPTED, COMPLETED
  - Panel derecho con `AutomationLog`

- [ ] **16. Crear `AutomationLog`**
  - Panel lateral derecho tipo timeline
  - Eventos cronológicos del módulo
  - Iconos por tipo de evento
  - Timestamp formateado

- [x] **17. Crear `HITLPanel`**
  - Panel lateral derecho (Sheet de shadcn)
  - Header: nombre del job + status
  - Tabs: "Review scenario" / "Agent decision log"
  - Contenido dinámico desde `interrupt_data`

- [x] **18. Crear `HITLFormRenderer`**
  - Wrapper de `Renderer` de `@zavora-ai/adk-ui-react`
  - Extrae `ui_form` de `interrupt_data`
  - Handler `onAction`:
    - `form_submit` → POST a `/resume` via `resumeWorkflowJob`
    - `button_click` → manejar según `action_id`
  - Soporte temas: light/dark/system
  - Estados: loading, submitting (overlay), error

- [ ] **19. Crear `RunningIndicator`**
  - Icono: `Loader2` de Lucide
  - Animación: `animate-spin` + pulso sutil con framer-motion
  - Tamaño: 14px, color primary
  - Ubicación: esquina de tarjeta

### Fase 7: Página Principal

- [ ] **20. Crear página `app/admin/agentic/automation/page.tsx`**
  - Server Component: fetch inicial de métricas via Server Action
  - Renderizar `<AutomationLayout initialMetrics={data} />`
  - Manejo de errores

### Fase 8: Polish y Validación

- [ ] **21. Estados vacíos y loading**
  - Bloque vacío: "No hay jobs en este estado"
  - Loading: componente `<Loading>` existente
  - Error: toast con sonner

- [ ] **22. Lint y typecheck**
  - `bun run lint`
  - `tsc --noEmit`

- [ ] **23. Testing manual**
  - Navegación sidebar → Automatización
  - Vista dashboard con múltiples bloques
  - Click en módulo → vista detalle
  - WebSocket mueve tarjetas entre columnas
  - Click en INTERRUPTED → HITL Panel
  - Submit HITL → cierra panel + mueve tarjeta

## Arquitectura de Datos (Flujo Completo)

```
page.tsx (Server Component)
└── Llama Server Action: getAutomationMetrics()
    └── Retorna initialMetrics como prop
    └── Renderiza AutomationLayout (Client Component)
        ├── ModuleSidebar (muestra métricas)
        ├── DashboardView (múltiples KanbanBlock)
        │   └── KanbanBlock[]
        │       └── KanbanColumn[] (scroll-x propio)
        │           └── JobCard[]
        └── DetailView (módulo seleccionado)
            ├── KanbanBoard (4 columnas)
            │   └── KanbanColumn[] (scroll-y propio)
            │       └── JobCard[]
            └── AutomationLog (panel lateral)

HITLPanel (Sheet lateral)
└── HITLFormRenderer
    └── Renderer (ADK-UI)
        └── Component[] (dinámicos desde backend)
        └── onAction → Llama Server Action: resumeWorkflowJob()
            └── POST /api/v1/agent_workflow_jobs/{id}/resume

WebSocket (useAutomationWebSocket)
├── Handshake: getAuthTicket() → JWT token
├── Conexión: wss://.../ws/automation?token=...
├── Recibe: JobStateChangedEvent
└── Actualiza: Estado local de jobs (mueve entre columnas)
```

## Decisiones de Diseño

**Scroll Strategy:** Cada `KanbanBlock` en Dashboard tiene `overflow-x-auto` horizontal. Las `KanbanColumn` dentro tienen `overflow-y-auto` vertical. El contenedor principal tiene `overflow-y-auto` vertical para apilar múltiples bloques.

**Vista Dashboard vs Detalle:** Dashboard muestra todos los módulos sin columna PENDING (para ahorrar espacio horizontal). La vista detalle muestra un módulo con las 4 columnas completas + Automation Log.

**HITL Container:** Panel lateral tipo Sheet (deslizable desde derecha) en lugar de Dialog centrado. Permite mostrar contenido extenso del contexto del agente cómodamente.

**Icono Running:** `Loader2` con `animate-spin` + pulso sutil. Profesional y minimalista.

## Open questions

1. **¿El endpoint de Automation Log existe o se deriva de los jobs?** Se asume endpoint propio. Si no existe, se construye desde datos de jobs.
2. **¿La vista Dashboard muestra TODOS los módulos o solo activos?** Se muestran módulos con jobs, ordenados por actividad reciente.
