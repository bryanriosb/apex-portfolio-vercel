# Plan

Agregar la sección de "Agentes" a la sección "Agencia IA" del sidebar, con una página completa de CRUD usando DataTable que consuma la API `/api/agents`. El enfoque sigue la arquitectura existente: Server Actions → Services → Components, reutilizando patrones comprobados de Integraciones.

**Estado: COMPLETADO** ✅

## Scope
- **In:** Sidebar menu item, página Agentes con DataTable, server actions CRUD, servicio, columnas, formulario de creación/edición con editor de system_prompt, eliminación
- **Out:** Configuración de herramientas/skills por agente (futuro), Chat con agente, executions

## Decisiones técnicas
- **Editor para system_prompt:** Textarea monospace mejorado con resize vertical, preservando markdown con saltos de línea y símbolos. No se usa TipTap (diseñado para HTML de emails).
- **API:** Se asume lista completa sin paginación (similar a integrations existentes)

## Action items
[x] 1. Agregar icono `Bot` de lucide-react y item "Agentes" al array `SIDE_AGENCY_MENU_ITEMS` en `const/sidebar-menu.ts` (url: `/admin/agentic/agents`)
[x] 2. Crear tipos TypeScript en `lib/models/agents/agent.ts`: `Agent`, `CreateAgentRequest`, `UpdateAgentRequest`, `AgentResponse` según esquema de la API
[x] 3. Crear server actions CRUD en `lib/actions/agents/agents-actions.ts` (listAgents, getAgent, createAgent, updateAgent, deleteAgent) usando `apiApexAiAuth`
[x] 4. Crear servicio `AgentsService` en `lib/services/agents/agents-service.ts` siguiendo patrón de `IntegrationsService`
[x] 5. Crear componente de columnas `AgentsColumns.tsx` en `components/agents/` con columnas: nombre, descripción, proveedor modelo, modelo, estado (is_active), UI habilitada, tags, fecha actualización, acciones
[x] 6. Crear página `app/admin/agentic/agents/page.tsx` con DataTable, header con botón crear, loading state, empty state, dialog de eliminación
[x] 7. Crear componente `AgentForm.tsx` en `components/agents/` para creación/edición con: nombre (requerido), descripción, proveedor modelo, nombre modelo, API key ref, system_prompt (textarea monospace con resize), max_loops, skill_tags, enable_ui. Validación con zod y FormField de shadcn
[x] 8. Crear componente `AgentFormFields.tsx` para extraer los campos del formulario y mantener limpio el componente principal
[x] 9. Verificar que el sidebar renderice correctamente el nuevo item en sección "Agencia IA"
[x] 10. Probar flujo CRUD completo: listar, crear, editar, eliminar agente
[x] 11. Ejecutar lint y typecheck para validar código

## Archivos creados/modificados
| Acción | Archivo |
|--------|---------|
| Modificado | `const/sidebar-menu.ts` |
| Creado | `lib/models/agents/agent.ts` |
| Creado | `lib/actions/agents/agents-actions.ts` |
| Creado | `lib/services/agents/agents-service.ts` |
| Creado | `components/agents/AgentsColumns.tsx` |
| Creado | `components/agents/AgentForm.tsx` |
| Creado | `components/agents/AgentFormFields.tsx` |
| Creado | `app/admin/agentic/agents/page.tsx` |
