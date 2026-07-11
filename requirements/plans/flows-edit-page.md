# Plan: Mover edición de Flujos a Página Dedicada

## Descripción

Cambiar la experiencia de edición/creación de workflows de un Dialog a una página dedicada full-width. Esto aprovecha el espacio total para el editor ReactFlow y sigue el patrón existente del template builder (`app/admin/collection/templates/`).

## Scope

**In:**
- Crear `app/admin/agentic/flows/create/page.tsx` — página thin wrapper para crear
- Crear `app/admin/agentic/flows/edit/[id]/page.tsx` — página thin wrapper para editar
- Crear `components/workflows/WorkflowFlowEditor.tsx` — componente full-page con FlowEditor
- Modificar `app/admin/agentic/flows/page.tsx` — quitar Dialog, navegar a páginas dedicadas

**Out:**
- No se elimina `WorkflowForm.tsx` (queda por si se necesita en el futuro)
- No cambia la lógica del FlowEditor ni los nodos

## Action Items

- [x] Crear `components/workflows/WorkflowFlowEditor.tsx` — componente full-page que:
  - Acepta `id?: string` (si tiene, es modo edición; si no, es creación)
  - Carga datos del workflow por ID usando `WorkflowsService.getWorkflow(id)` en `useEffect`
  - Renderiza header con botón "Volver" + título + "Guardar"
  - Renderiza campos name, description y el FlowEditor a ancho completo
  - Maneja submit con `createWorkflow` o `updateWorkflow` según el modo
  - Navigate a `/admin/agentic/flows` después de guardar con `router.push`
  - Loading spinner mientras carga, toast de error si falla
- [x] Crear `app/admin/agentic/flows/create/page.tsx` — `<WorkflowFlowEditor />` (sin id)
- [x] Crear `app/admin/agentic/flows/edit/[id]/page.tsx` — `<WorkflowFlowEditor id={params.id} />`
- [x] Modificar `app/admin/agentic/flows/page.tsx`:
  - Quitar Dialog, formOpen, editingWorkflow, isSubmitting states
  - Quitar handleSubmit (se mueve al WorkflowFlowEditor)
  - "Nuevo Flujo" → `<Link href="/admin/agentic/flows/create">`
  - Edit action → `router.push(/admin/agentic/flows/edit/${workflow.id})`
  - Mantener delete (ConfirmDeleteDialog) y toggle active
- [x] Lint y typecheck

## Archivos Relacionados
- `app/admin/collection/templates/page.tsx` — referencia del patrón
- `app/admin/collection/templates/create/page.tsx` — referencia create
- `app/admin/collection/templates/edit/[id]/page.tsx` — referencia edit
- `components/collection/templates/builder/TemplateBuilder.tsx` — referencia del componente dedicado
