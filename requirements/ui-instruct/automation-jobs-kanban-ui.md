# Especificaciones de Interfaz: Automation Jobs Kanban (NextJS 14)

## 1. Visión General de la Interfaz

La nueva interfaz para gestionar automatizaciones (`AgentJob` y `AgentWorkflowJob`) consistirá en un layout de **dos columnas principales** diseñado para una aplicación en NextJS 14.

> **Nota:** Ambas vistas son requeridas: **Dashboard** (vista resumen con métricas) y **Kanban** (tablero visual). No son mutuamente excluyentes; el usuario podrá alternar entre ambas.

1. **Columna Izquierda (Fija / Sidebar):**
   - Mostrará el listado de **Módulos** (ej. "Collection", "Sales", "Support") de los cuales provienen las automatizaciones.
   - Actuará como filtro global para la vista. Mostrará contadores (métricas) de jobs activos por módulo, permitiendo al usuario cambiar de contexto.

2. **Columna Derecha (Principal / Kanban):**
   - Contendrá el **Tablero Kanban**.
   - Dividido en 4 columnas estáticas que representan el ciclo de vida del trabajo:
      - **PENDIENTES** (Estado: `Pending`)
      - **PROCESANDO** (Estado: `Running`)
      - **APROBACIÓN** (Estado: `Interrupted` / HITL - *Human in the loop*) — **Solo aplica para `AgentWorkflowJob`**
      - **COMPLETADA** (Estado: `Completed`)

---

## 2. Contratos de Datos (TypeScript Types) y Endpoints REST

Para simplificar la implementación, aquí se definen las interfaces de TypeScript que el frontend debe implementar y los endpoints que debe consumir. (Nota: Se asume que las llamadas HTTP incluyen el Bearer Token en los headers).

### 2.1. Métricas de Módulos (Sidebar)

- **Endpoint:** `GET /api/jobs/metrics?business_id={business_id}`
- **Uso:** Renderizar la columna izquierda.

```typescript
export interface ModuleMetrics {
  module: string;
  total_agent_jobs: number;
  agent_jobs_by_status: Record<string, number>; // ej: { "Pending": 5, "Running": 2 }
  total_workflow_jobs: number;
  workflow_jobs_by_status: Record<string, number>;
  total_apex_jobs: number;
  apex_jobs_by_status: Record<string, number>;
}

export interface AutomationMetricsResponse {
  modules: ModuleMetrics[];
}
```

### 2.2. Listado de Jobs (Carga del Kanban)

- **Endpoints:**
  - `GET /api/jobs?module={module}&business_id={business_id}` (Para listado de ApexJobs)
  - `GET /api/agents/jobs?module={module}&business_id={business_id}` (Para listado de AgentJobs)
  - `GET /api/agents/workflows/jobs?module={module}&business_id={business_id}` (Para listado de AgentWorkflowJobs)
- **Uso:** Poblar las tarjetas de las columnas del Kanban.

```typescript
export type JobStatus = 'Pending' | 'Running' | 'Interrupted' | 'Completed' | 'Failed';

export interface AgentJob {
  id: string;
  parent_id: string | null;
  agent_id: string;
  module: string;
  kind: string;
  status: JobStatus;
  input_content: string;
  metadata: string; // Puede venir como string JSONificado
  result_content: string;
  result_reasoning: string;
  result_session_id: string;
  error_message: string;
  user_id: string;
  session_id: string;
  scheduled_at: string | null;
  timezone: string | null;
  cron: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgentWorkflowJob {
  id: string;
  parent_id: string | null;
  agent_workflow_definition_id: string;
  module: string;
  kind: string;
  status: JobStatus;
  thread_id: string;
  input_state: string; // Puede venir como string JSONificado
  result_state: string; // Puede venir como string JSONificado
  error_message: string;
  interrupt_data: string; // Puede venir como string JSONificado
  metadata: string; // Puede venir como string JSONificado
  user_id: string;
  scheduled_at: string | null;
  timezone: string | null;
  cron: string | null;
  created_at: string;
  updated_at: string;
}
```

*(Nota: Dependiendo del formateo final del REST endpoint en Rust, los campos `metadata`, `interrupt_data`, `input_state` y `result_state` podrían estar serializados como `string` o como un `object`. Se recomienda usar `JSON.parse` si vienen como `string`).*

### 2.3. Detalle del Job para Aprobación (Modal / Drawer HITL)

- **Endpoint:** `GET /api/agents/workflows/jobs/{id}`
- **Uso:** Cuando el usuario hace clic en una tarjeta en la columna **APROBACIÓN** (`Interrupted`), se consulta este endpoint para obtener el contexto completo. El campo crítico aquí es el `interrupt_data`.

El backend emite una estructura anidada que contiene el formulario dinámico generado por `adk-ui`. El frontend debe extraer el campo `ui_form` de esta estructura para renderizarlo.

#### 2.3.1. Estructura Completa de `interrupt_data`

```typescript
export interface InterruptData {
  thread_id: string;          // ID del hilo de ejecución en Neo4j
  checkpoint_id: string;      // ID del checkpoint donde se pausó
  step: number;               // Paso del grafo donde se interrumpió
  interrupt: {
    type: 'Dynamic';          // Siempre "Dynamic" para interrupciones HITL
    message: string;          // Mensaje descriptivo (ej: "missing_approval")
    data: {
      reason: string;         // Razón de la interrupción (ej: "missing_approval")
      gate_field: string;     // Campo del estado que se espera (ej: "promise_approved")
      ui_form: UiResponse;    // ← FORMULARIO DINÁMICO ADK-UI
    };
  };
}
```

#### 2.3.2. Estructura del Formulario Dinámico (`UiResponse`)

El campo `ui_form` sigue el estándar `UiResponse` de `adk-ui`. Contiene un array de componentes tipados:

```typescript
export interface UiResponse {
  id?: string;
  theme?: 'light' | 'dark' | 'system';
  components: Component[];
}

export type Component =
  // Atoms
  | { type: 'text'; id?: string; content: string; variant?: TextVariant }
  | { type: 'button'; id?: string; label: string; action_id: string; variant?: ButtonVariant; disabled?: boolean; icon?: string }
  | { type: 'icon'; id?: string; name: string; size?: number }
  | { type: 'image'; id?: string; src: string; alt?: string }
  | { type: 'badge'; id?: string; label: string; variant?: BadgeVariant }
  
  // Inputs
  | { type: 'text_input'; id?: string; name: string; label: string; input_type?: 'text' | 'email' | 'password' | 'tel' | 'url'; placeholder?: string; required?: boolean; default_value?: string; min_length?: number; max_length?: number; error?: string }
  | { type: 'number_input'; id?: string; name: string; label: string; min?: number; max?: number; step?: number; required?: boolean; default_value?: number; error?: string }
  | { type: 'select'; id?: string; name: string; label: string; options: SelectOption[]; required?: boolean; error?: string }
  | { type: 'multi_select'; id?: string; name: string; label: string; options: SelectOption[]; required?: boolean }
  | { type: 'switch'; id?: string; name: string; label: string; default_checked?: boolean }
  | { type: 'date_input'; id?: string; name: string; label: string; required?: boolean }
  | { type: 'slider'; id?: string; name: string; label: string; min?: number; max?: number; step?: number; default_value?: number }
  | { type: 'textarea'; id?: string; name: string; label: string; placeholder?: string; rows?: number; required?: boolean; default_value?: string; error?: string }
  
  // Layouts
  | { type: 'stack'; id?: string; direction: 'horizontal' | 'vertical'; children: Component[]; gap?: number }
  | { type: 'grid'; id?: string; columns: number; children: Component[]; gap?: number }
  | { type: 'card'; id?: string; title?: string; description?: string; content: Component[]; footer?: Component[] }
  | { type: 'container'; id?: string; children: Component[]; padding?: number }
  | { type: 'divider'; id?: string }
  | { type: 'tabs'; id?: string; tabs: Tab[] }
  
  // Data Display
  | { type: 'table'; id?: string; columns: TableColumn[]; data: Record<string, unknown>[]; sortable?: boolean; page_size?: number; striped?: boolean }
  | { type: 'list'; id?: string; items: string[]; ordered?: boolean }
  | { type: 'key_value'; id?: string; pairs: KeyValuePair[] }
  | { type: 'code_block'; id?: string; code: string; language?: string }
  
  // Visualizations
  | { type: 'chart'; id?: string; title?: string; kind: ChartKind; data: Record<string, unknown>[]; x_key: string; y_keys: string[]; x_label?: string; y_label?: string; show_legend?: boolean; colors?: string[] }
  
  // Feedback
  | { type: 'alert'; id?: string; title: string; description?: string; variant?: AlertVariant }
  | { type: 'progress'; id?: string; value: number; label?: string }
  | { type: 'toast'; id?: string; message: string; variant?: AlertVariant; duration?: number; dismissible?: boolean }
  | { type: 'modal'; id?: string; title: string; content: Component[]; footer?: Component[]; size?: ModalSize; closable?: boolean }
  | { type: 'spinner'; id?: string; size?: SpinnerSize; label?: string }
  | { type: 'skeleton'; id?: string; variant?: SkeletonVariant; width?: string; height?: string };

export type TextVariant = 'h1' | 'h2' | 'h3' | 'h4' | 'body' | 'caption' | 'code';
export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
export type BadgeVariant = 'default' | 'info' | 'success' | 'warning' | 'error' | 'secondary' | 'outline';
export type AlertVariant = 'info' | 'success' | 'warning' | 'error';
export type ChartKind = 'bar' | 'line' | 'area' | 'pie';
export type ModalSize = 'small' | 'medium' | 'large' | 'full';
export type SpinnerSize = 'small' | 'medium' | 'large';
export type SkeletonVariant = 'text' | 'circle' | 'rectangle';

export interface SelectOption {
  label: string;
  value: string;
}

export interface TableColumn {
  header: string;
  accessor_key: string;
  sortable?: boolean;
}

export interface Tab {
  label: string;
  content: Component[];
}

export interface KeyValuePair {
  key: string;
  value: string;
}
```

#### 2.3.3. Ejemplo Completo de `interrupt_data`

```json
{
  "thread_id": "550e8400-e29b-41d4-a716-446655440000",
  "checkpoint_id": "node_human_dispute",
  "step": 3,
  "interrupt": {
    "type": "Dynamic",
    "message": "missing_approval",
    "data": {
      "reason": "missing_approval",
      "gate_field": "promise_approved",
      "ui_form": {
        "theme": "light",
        "components": [
          {
            "type": "text",
            "content": "El cliente ha propuesto un plan de pago",
            "variant": "h3"
          },
          {
            "type": "card",
            "title": "Detalles de la Promesa",
            "content": [
              {
                "type": "key_value",
                "pairs": [
                  { "key": "Cliente", "value": "Juan Pérez" },
                  { "key": "Monto", "value": "$500.000" },
                  { "key": "Fecha", "value": "2026-06-10" }
                ]
              }
            ]
          },
          {
            "type": "stack",
            "direction": "vertical",
            "gap": 16,
            "children": [
              {
                "type": "switch",
                "name": "promise_approved",
                "label": "¿Aprobar promesa de pago?",
                "default_checked": false
              },
              {
                "type": "textarea",
                "name": "supervisor_notes",
                "label": "Notas del supervisor",
                "placeholder": "Ingrese observaciones...",
                "rows": 4
              },
              {
                "type": "button",
                "label": "Enviar Decisión",
                "action_id": "submit_approval",
                "variant": "primary"
              }
            ]
          }
        ]
      }
    }
  }
}
```

### 2.4. Resolución de Aprobación (Reanudar Flujo)

- **Endpoint:** `POST /api/agents/workflows/jobs/{id}/resume`
- **Uso:** Enviar la decisión tomada por el humano al agente.

```typescript
export interface ResumeWorkflowRequest {
  // Las actualizaciones del estado obtenidas del formulario que se inyectarán de vuelta al Grafo
  state_updates: Record<string, any>; 
}
```

---

## 3. Sincronización en Tiempo Real (WebSocket)

El Kanban debe ser reactivo sin necesidad de hacer polling o recargar la página. Ahora la arquitectura backend cuenta con Repositorios Observables (Decorator Pattern) que emiten eventos a Redis de manera automática cada vez que se guarda o actualiza un Job.

- **Conexión WebSocket:**
  - **URL:** `wss://{API_URL}/ws/automation` (Asegurar envío del JWT Bearer token para suscribirse automáticamente al canal del tenant/business_id).
- **Consumo de Eventos:** El backend emitirá eventos estructurados JSON de tipo `JobStateChanged`.

```typescript
export interface AutomationServerMessage {
  type: "JobStateChanged" | "WorkflowLog" | "Pong";
  // Campos variables según el type
}

export interface JobStateChangedEvent extends AutomationServerMessage {
  type: "JobStateChanged";
  job_type: 'AgentJob' | 'AgentWorkflowJob' | 'ApexJob';
  job_id: string;
  old_status: JobStatus;
  new_status: JobStatus;
  timestamp: string;
  user_id?: string;
  origin?: string;
  module?: string;
  app_name?: string;
}
```

**Acción UI:** Un Client Component en NextJS deberá instanciar el WebSocket. Al recibir el mensaje de `type: "JobStateChanged"`, el UI debe:

1. Validar si el `module` corresponde al que se está viendo en el Kanban actualmente o ignorarlo/actualizar el contador del Sidebar.
2. Si corresponde al contexto actual, buscar la tarjeta del Job en el estado de React (mediante el `job_id`).
3. **Si el Job YA EXISTE** en el estado local:
   - Moverla de la columna de `old_status` a `new_status` (o actualizar directamente su propiedad `status`).
   - Si el `new_status` es `Interrupted` (en workflows), habilitar el botón/estado para requerir intervención humana.
4. **Si el Job NO EXISTE** en el estado local (ej. fue creado asíncronamente en background):
   - El UI debe hacer fetch del detalle del Job usando su ID y tipo, y agregarlo al Kanban en la columna correspondiente a `new_status`.
   - Dependiendo del `job_type`, llamar a:
     - `GET /api/jobs/{job_id}` (Para ApexJob)
     - `GET /api/agents/jobs/{job_id}` (Para AgentJob)
     - `GET /api/agents/workflows/jobs/{job_id}` (Para AgentWorkflowJob)
   - Alternativamente, para mayor simplicidad, el UI podría disparar una recarga (`refetch`) de la lista de jobs completa de ese módulo si detecta un `job_id` nuevo.

---

## 4. Flujo de Arquitectura en NextJS 14

### 4.1. Dependencias Requeridas

El frontend debe instalar el renderer oficial de adk-ui:

```bash
npm install @zavora-ai/adk-ui-react
```

Peer dependencies: `react >= 17.0.0` y `react-dom >= 17.0.0`.

### 4.2. Montaje Inicial (App Router)

1. **Server Component (Recomendado):** La página base (ej. `/automation`) puede hacer fetch en servidor de `/api/jobs/metrics?business_id={business_id}` y pasarlo como prop inicial a un Client Component del Kanban.
2. **Client Component (Estado):** Un componente cliente `<KanbanBoard initialModule="collection" />` se encarga de manejar el estado de las tarjetas y establecer la conexión WebSocket.

### 4.3. Flujo de Intervención Humana (HITL - Formularios Dinámicos con adk-ui)

Dado que el frontend NextJS no conoce a priori qué datos pedirá el agente, el renderizado en la columna **APROBACIÓN** debe ser totalmente dinámico usando el renderer oficial `@zavora-ai/adk-ui-react`.

#### 4.3.1. Tipos de Eventos de UI (UiEvent)

Cuando el usuario interactúa con los componentes renderizados, el renderer emite eventos estructurados:

```typescript
export type UiEvent =
  | { action: 'form_submit'; action_id: string; data: Record<string, unknown> }
  | { action: 'button_click'; action_id: string }
  | { action: 'input_change'; name: string; value: unknown }
  | { action: 'tab_change'; index: number };
```

**Mapeo de acciones:**

- `form_submit`: Se emite cuando se presiona un botón con `action_id` dentro de un formulario. Contiene `data` con los valores de todos los inputs.
- `button_click`: Se emite al hacer clic en un botón standalone (fuera de formulario).
- `input_change`: Se emite al cambiar el valor de un input (para validación en tiempo real).
- `tab_change`: Se emite al cambiar de pestaña en un componente `tabs`.

#### 4.3.2. Implementación del Modal HITL

```tsx
'use client';

import { useState, useEffect } from 'react';
import { Renderer } from '@zavora-ai/adk-ui-react';
import type { UiResponse, UiEvent } from '@zavora-ai/adk-ui-react';

interface HITLModalProps {
  jobId: string;
  onClose: () => void;
}

export function HITLModal({ jobId, onClose }: HITLModalProps) {
  const [uiResponse, setUiResponse] = useState<UiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/agents/workflows/jobs/${jobId}`)
      .then(res => res.json())
      .then(job => {
        // Extraer ui_form de la estructura anidada de interrupt_data
        const form = job.interrupt_data?.interrupt?.data?.ui_form ?? null;
        setUiResponse(form);
        setLoading(false);
      })
      .catch(err => {
        setError('Error cargando el job: ' + err.message);
        setLoading(false);
      });
  }, [jobId]);

  const handleAction = async (event: UiEvent) => {
    if (event.action === 'form_submit') {
      setSubmitting(true);
      try {
        const response = await fetch(`/api/agents/workflows/jobs/${jobId}/resume`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            state_updates: event.data
          }),
        });

        if (!response.ok) {
          throw new Error('Error al reanudar el workflow');
        }

        onClose();
        // El WebSocket emitirá JobStateChanged moviendo la tarjeta de APROBACIÓN a PROCESANDO
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setSubmitting(false);
      }
    }
  };

  if (loading) return <div>Cargando...</div>;
  if (error) return <div className="text-red-500">{error}</div>;
  if (!uiResponse) return <div>No hay formulario disponible</div>;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        {submitting && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-50">
            <span>Enviando...</span>
          </div>
        )}
        
        {/* Renderizar cada componente usando el Renderer oficial */}
        {uiResponse.components.map((component, index) => (
          <Renderer
            key={index}
            component={component}
            onAction={handleAction}
            theme={uiResponse.theme || 'light'}
          />
        ))}
      </div>
    </div>
  );
}
```

#### 4.3.3. Flujo Completo HITL

1. **Apertura de la Tarea:**
   - El usuario da clic a un Job en la columna **APROBACIÓN**.
   - Se abre un `Drawer` o `Modal` y se hace fetch del detalle (`GET /api/agents/workflows/jobs/{id}`).
   - El frontend extrae `interrupt_data.interrupt.data.ui_form` del response.

2. **Renderizado de Contexto (Solo Lectura):**
   - El renderer pinta automáticamente todos los componentes: títulos (`text`), tarjetas informativas (`card`), tablas (`table`), etc.
   - Los componentes son auto-contenidos y no requieren configuración adicional del frontend.

3. **Renderizado del Formulario:**
   - El renderer interpreta automáticamente los inputs (`text_input`, `select`, `switch`, `textarea`, etc.).
   - Cada input tiene un `name` único que se usará como key en el `state_updates`.
   - Los botones con `action_id` disparan eventos cuando se presionan.

4. **Envío de la Decisión (Submit):**
   - Al presionar un botón dentro de un formulario, el renderer emite `UiEvent` de tipo `form_submit`.
   - El `event.data` contiene un objeto con todos los valores de los inputs (key = `name`, value = valor ingresado).
   - El frontend hace `POST /api/agents/workflows/jobs/{id}/resume` con `{ state_updates: event.data }`.
   - **Estado de Carga:** Bloquear la UI con un overlay mientras se envía para prevenir doble envío.
   - Al responder el backend con `200 OK`, cerrar el modal.
   - Segundos después, el WebSocket emitirá `JobStateChanged` moviendo el Job de APROBACIÓN a PROCESANDO.

---

## 5. Consideraciones Técnicas

### 5.1. Parsing de Campos JSON

Algunos campos de los jobs pueden venir como strings JSON. El frontend debe manejar ambos casos:

```typescript
function safeParseJSON(value: string | object | null): any {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

// Uso:
const interruptData = safeParseJSON(job.interrupt_data);
const uiForm = interruptData?.interrupt?.data?.ui_form;
```

### 5.2. Manejo de Errores

- Si `interrupt_data` está vacío o no tiene `ui_form`, mostrar un mensaje de error amigable.
- Si el renderer no puede interpretar un componente, debe fallar silenciosamente o mostrar un placeholder, no romper toda la UI.

### 5.3. Temas

El campo `theme` en `UiResponse` puede ser `light`, `dark` o `system`. El frontend debe pasar este valor al `Renderer` para que aplique los estilos correctos.

### 5.4. WebSocket Reconnection

Implementar reconnection automática con backoff exponencial en caso de desconexión del WebSocket de automatización.

---

## 6. Componentes UI Custom (Opcional)

Si el agente necesita renderizar componentes que no están en el catálogo estándar de adk-ui (30+ tipos documentados en la sección 2.3.2), el frontend tiene dos opciones:

### 6.1. Usar Componentes Estándar como Contenedores (Recomendado)

El agente puede componer interfaces complejas usando los componentes existentes:

```json
{
  "type": "card",
  "title": "Vista Personalizada",
  "content": [
    {
      "type": "text",
      "content": "## Encabezado Markdown\n\nCon **negrita**, *itálica* y [links](https://ejemplo.com)",
      "variant": "body"
    },
    {
      "type": "code_block",
      "code": "const ejemplo = 'código personalizado';",
      "language": "typescript"
    },
    {
      "type": "stack",
      "direction": "horizontal",
      "children": [
        { "type": "badge", "label": "Estado: Activo", "variant": "success" },
        { "type": "badge", "label": "Prioridad: Alta", "variant": "error" }
      ]
    }
  ]
}
```

**Ventajas:**

- No requiere cambios en el frontend
- Totalmente soportado por `@zavora-ai/adk-ui-react`
- El agente tiene control completo del contenido

### 6.2. Wrapper con Componentes Custom

Si se requiere un componente completamente nuevo (ej: un mapa interactivo, un visor de PDF, un reproductor de audio), el frontend puede crear un wrapper:

```tsx
import { Renderer } from '@zavora-ai/adk-ui-react';
import type { Component, UiEvent } from '@zavora-ai/adk-ui-react';

// Componentes custom del frontend
import { CustomMap } from './components/CustomMap';
import { PDFViewer } from './components/PDFViewer';

interface CustomComponentProps {
  component: Component;
  onAction?: (event: UiEvent) => void;
}

function CustomComponentWrapper({ component, onAction }: CustomComponentProps) {
  // Interceptar componentes custom antes de pasar al Renderer oficial
  if (component.type === 'custom_map') {
    return (
      <CustomMap 
        latitude={(component as any).latitude}
        longitude={(component as any).longitude}
        markers={(component as any).markers}
      />
    );
  }
  
  if (component.type === 'pdf_viewer') {
    return (
      <PDFViewer 
        url={(component as any).url}
        page={(component as any).page}
      />
    );
  }
  
  // Delegar al Renderer oficial para componentes estándar
  return <Renderer component={component} onAction={onAction} />;
}

// Uso en el HITLModal
function HITLModal({ jobId }: { jobId: string }) {
  const [uiResponse, setUiResponse] = useState<UiResponse | null>(null);
  
  // ... fetch logic ...
  
  return (
    <div>
      {uiResponse.components.map((component, i) => (
        <CustomComponentWrapper 
          key={i}
          component={component}
          onAction={handleAction}
        />
      ))}
    </div>
  );
}
```

**Consideraciones para UI Custom:**

- El backend debe emitir el componente con un `type` único (ej: `"custom_map"`)
- El frontend debe conocer de antemano los tipos custom que puede recibir
- Los componentes custom NO están tipados por `@zavora-ai/adk-ui-react`, usar `as any` o definir tipos propios
- Documentar en el backend qué componentes custom están disponibles para que el agente los use

### 6.3. Restricciones del Renderer Oficial

El Renderer de `@zavora-ai/adk-ui-react` tiene un switch exhaustivo de componentes. Si recibe un tipo desconocido, muestra:

```html
<div class="text-red-500">Unknown component: custom_type</div>
```

Por esto es **obligatorio** interceptar componentes custom antes de pasarlos al Renderer, o usar el wrapper propuesto en la sección 6.2.
