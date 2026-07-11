# Plan: Página de Flujos (Workflows) — Agencia IA

## Descripción

Agregar la funcionalidad **Flujo** a la sección "Agencia IA" del sidebar. La página incluye un `DataTable` con filtros para listar workflows, CRUD completo (crear, editar, eliminar, activar/desactivar), y un **editor visual interactivo** usando ReactFlow (`@xyflow/react`) para construir y editar el `graph_json` (nodos, edges, conditional edges, channels, config).

**Componentes reutilizados del codebase:**
- `Canvas` → wrapper de ReactFlow (`components/ai-elements/canvas.tsx`)
- `Node`, `NodeHeader`, `NodeContent`, `NodeFooter` → nodos card (`components/ai-elements/node.tsx`)
- `Edge.Animated`, `Edge.Temporary` → edges customizados (`components/ai-elements/edge.tsx`)
- `Panel`, `Controls` → controles del editor (`components/ai-elements/panel.tsx`, `controls.tsx`)
- `ConfirmDeleteDialog` → confirmación de eliminación
- `DataTable` → listado con filtros
- Patrón de acciones: `apiApexAiAuth` + `handleApiCall` (mismo que agents)

## Scope

**In:**
- Item "Flujo" en sidebar (`SIDE_AGENCY_MENU_ITEMS`)
- Modelo + Zod schema (`lib/models/workflows/workflow.ts`)
- Actions CRUD (`lib/actions/workflows/workflow-actions.ts`)
- Service (`lib/services/workflows/workflow-service.ts`)
- Columnas DataTable (`components/workflows/WorkflowsColumns.tsx`)
- Página principal (`app/admin/agentic/flows/page.tsx`) con DataTable + filtros
- Editor visual ReactFlow (`components/workflows/FlowEditor.tsx`)
- Formulario crear/editar (`components/workflows/WorkflowForm.tsx`)
- Panel lateral de propiedades del nodo seleccionado (`components/workflows/NodePropertiesPanel.tsx`)
- Dialog de confirmación de eliminación

**Out:**
- Enqueue/execución de workflows
- Visualización Mermaid
- Scheduling/cron

## Layout del Editor ReactFlow (Propuesto)

```
┌─────────────────────────────────────────────────────────────────┐
│  Header: [← Volver]  Nombre del Workflow    [Guardar] [Cancelar]│
├──────────────────────┬──────────────────────────────────────────┤
│                      │                                          │
│  Panel lateral       │     Canvas ReactFlow                    │
│  (320px, Sheet)      │     - Background grid                   │
│                      │     - Nodos drag&drop                    │
│  ┌────────────────┐  │     - Conexiones drag-to-connect        │
│  │ Channels       │  │     - Selección múltiple                │
│  │ [input]  [x]   │  │     - Delete con Backspace/Delete       │
│  │ [+] Agregar    │  │                                          │
│  ├────────────────┤  │  ┌──────────┐    ┌──────────┐           │
│  │ Config         │  │  │ __start__│───▶│ Classifier│          │
│  │ Recursion: [10]│  │  └──────────┘    └────┬─────┘           │
│  │ Checkpoint: [▼]│  │                       │                  │
│  ├────────────────┤  │              ┌────────▼────────┐         │
│  │ + Agregar Nodo │  │              ▼                  ▼         │
│  │  ○ Agent       │  │       ┌──────────┐      ┌──────────┐    │
│  │  ○ Function    │  │       │ Payment  │      │ Dispute  │    │
│  └────────────────┘  │       └────┬─────┘      └────┬─────┘    │
│                      │            └────────┬────────┘           │
│  Panel propiedades   │                     ▼                    │
│  (al seleccionar)    │               ┌──────────┐              │
│  ┌────────────────┐  │               │ __end__  │              │
│  │ Nodo: Classifier│  │               └──────────┘              │
│  │ Agent: [▼ select]│  │                                          │
│  │ Input: [...]    │  │  [Controls: zoom +/-, fit]              │
│  │ Output: [...]   │  │                                          │
│  │ Stream: [✓]     │  │                                          │
│  │ Interrupt: [ ]  │  │                                          │
│  └────────────────┘  │                                          │
├──────────────────────┴──────────────────────────────────────────┤
│  Footer: Nodos: 5 | Edges: 4 | Channels: 3                     │
└─────────────────────────────────────────────────────────────────┘
```

**Nodos personalizados en el canvas:**
- **Agent Node**: Card con header (icono Bot + nombre), content (agent_id, stream, enable_ui badges), handles left/right
- **Function Node**: Card con header (icono Cog + logic name), content (config key-value), handles left/right
- **Start/End Node**: Card pequeño redondo con icono, sin handles de entrada (start) o salida (end)

## Action Items

### Fase 1: Modelo y Actions
- [x] Crear `lib/models/workflows/workflow.ts` con interfaces `WorkflowDefinition`, `CreateWorkflowDefinitionRequest`, `UpdateWorkflowDefinitionRequest`, tipos auxiliares para `graph_json` (`GraphNode`, `GraphEdge`, `ConditionalEdge`, `GraphConfig`, `InputMapperConfig`, `OutputMapperConfig`), y Zod schema `workflowFormSchema` (name requerido, description requerido)
- [x] Crear `lib/actions/workflows/workflow-actions.ts` con `listWorkflowsAction(params?)`, `getWorkflowAction(id)`, `createWorkflowAction(data)`, `updateWorkflowAction(id, data)`, `deleteWorkflowAction(id)` — usando `apiApexAiAuth` + `handleApiCall` (patrón idéntico a `lib/actions/agents/agents-actions.ts`)
- [x] Crear `lib/services/workflows/workflow-service.ts` con clase `WorkflowsService` delegando a las actions

### Fase 2: Sidebar y DataTable
- [x] Agregar item `{ title: 'Flujo', url: '/admin/agentic/flows', icon: GitBranch, moduleCode: 'ai_assistant', allowedRoles: [COMPANY_ADMIN, BUSINESS_ADMIN, PROFESSIONAL] }` a `SIDE_AGENCY_MENU_ITEMS` en `const/sidebar-menu.ts` (agregar import de `GitBranch` de lucide-react)
- [x] Crear `components/workflows/WorkflowsColumns.tsx` con columnas: nombre+descripción, nodos (conteo de `graph_json.nodes.length`), is_active (Badge), created_at (formateado con timezone), actions placeholder. `filterFn` en is_active
- [x] Crear `app/admin/agentic/flows/page.tsx` con DataTable en modo externo (data plano sin paginación), filtro faceted `is_active`, búsqueda por nombre, botón "Nuevo Flujo", acciones editar/activar-desactivar/eliminar en DropdownMenu, Dialog para formulario+editor, ConfirmDeleteDialog

### Fase 3: Editor Visual ReactFlow
- [x] Crear `components/workflows/FlowEditor.tsx` — componente principal que:
  - Convierte `graph_json` a nodos/edges de ReactFlow (posiciones iniciales calculadas con layout automático tipo grid)
  - Renderiza `<Canvas>` con `nodeTypes` personalizados (AgentNode, FunctionNode, StartNode, EndNode)
  - Permite: agregar nodos (botón + panel), conectar nodos (drag-to-connect), eliminar nodos/edges (Backspace), seleccionar nodos (click)
  - Actualiza `graph_json` en tiempo real cuando el usuario modifica el grafo
  - Muestra `<Controls>` y `<Panel>` para info del grafo
- [x] Crear `components/workflows/AgentNode.tsx` y `FunctionNode.tsx` — nodos card personalizados usando los componentes `Node`, `NodeHeader`, `NodeContent`, `NodeFooter` de `components/ai-elements/`
- [x] Crear `components/workflows/StartNode.tsx` y `EndNode.tsx` — nodos terminales pequeños
- [x] Crear `components/workflows/NodePropertiesPanel.tsx` — panel lateral que se muestra al seleccionar un nodo, con campos editables según el tipo (agent_id selector, input_mapper, output_mapper, stream toggle, interrupt flags, logic name, config)
- [x] Crear `components/workflows/ChannelManager.tsx` — componente para gestionar la lista de channels (agregar/eliminar) en el panel lateral

### Fase 4: Formulario y Dialog
- [x] Crear `components/workflows/WorkflowForm.tsx` con react-hook-form + zod, campos name, description, y el `<FlowEditor>` embebido para construir/editar graph_json
- [x] Integrar en el Dialog del page.tsx: al crear → formulario vacío con graph_json por defecto `{ channels: [], nodes: [], edges: [], conditional_edges: [], config: { recursion_limit: 10 } }`, al editar → formulario precargado con los datos del workflow

### Fase 5: Validación
- [x] Ejecutar lint (`bun run lint`) y typecheck (`bun run typecheck`) para verificar código correcto
- [x] Verificar que la página carga, el DataTable muestra datos, los filtros funcionan, y el editor ReactFlow renderiza correctamente

## Preguntas Abiertas
- ¿El endpoint de listado acepta `is_active` como filtro query param o es un filtro booleano simple (true/false)?
- Para el layout automático de nodos al cargar el editor: ¿instalar `dagre` como dependencia directa o usar un cálculo de grid simple (columnas con spacing fijo)?
