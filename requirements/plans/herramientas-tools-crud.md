# Plan: Módulo Herramientas (Tools) — CRUD + asignación a Agentes

## Contexto

- Backend: apex-ai (Rust, ClickHouse). Tablas `tool_definitions` (global, sin tenant) y `agent_tools` (mapeo agent ↔ tool con `business_account_id` + `business_id`).
- Tipos de tool (enum `ToolType`): `Function, McpLocal, McpRemote, Integration, IntegrationService, Notification, Ontology, Artifact`.
- **Exclusión acordada**: `McpLocal` y `McpRemote` NO se gestionan en Herramientas (ya existen en Conectores `/admin/agentic/connectors`). Se filtran de la lista y del selector de tipo.
- Tipo `Function`: código en `execution_config.source_code`, lenguaje en `execution_config.language` (`JavaScript` | `Rust`), `backend` (`ProcessBackend` por defecto), `timeout_ms` (default 5000). `schema_json` es JSON Schema de argumentos.
- Editor de código: CodeMirror 6 (`@uiw/react-codemirror` + langs javascript/json/rust). Decisión aprobada.
- Modificar backend apex-ai: aprobado.

## Gaps de backend detectados (bloqueaban la misión)

1. No existía `POST /api/v1/agents/tools` (crear tool global sin agente).
2. No existía endpoint para mapear una tool EXISTENTE a un agente (el POST siempre creaba una nueva).
3. `CreateToolRequest`/`PUT`/`PATCH` no aceptaban `description` ni `schema_json` (forzados a `""`/`"{}"`).
4. `ToolDefinitionResponse` no exponía `description`, `schema_json`, `module` ni `is_active`.
5. `find_all` solo retorna activas → el toggle is_active ocultaría tools para siempre; la lista de administración necesita ver también inactivas.

## Fase 1 — Backend apex-ai

- [x] DTO `CreateGlobalToolRequest` { name, description?, tool_type, schema_json?, execution_config, module? } con validación de `tool_type` vía `ToolType::from_str_opt` (excluye cualquier string inválido).
- [x] Handler + ruta `POST /api/v1/agents/tools` → crea tool global (sin mapping), 201 con `ToolDefinitionResponse`.
- [x] Handler + ruta `POST /api/v1/agents/{id}/tools/{tool_id}` → mapea tool existente al agente (usa `business_account_id`/`business_id` del agente, valida existencia de ambos, evita duplicado). 201.
- [x] Extender `CreateToolRequest` (PUT) y `PatchToolRequest` con `description` y `schema_json` opcionales; aplicarlos en `update_tool`/`patch_tool`.
- [x] Extender `ToolDefinitionResponse` con `description`, `module`, `schema_json`, `is_active`.
- [x] Repo: `find_all_any_status()` (incluye inactivas) usado por `list_all_tools` para la vista de administración; `find_all` intacto para no romper runtime.
- [x] `cargo check` verde.

## Fase 2 — Sidebar

- [x] `const/sidebar-menu.ts`: importar `Wrench` (mismo icono del event panel de automation) e insertar item `Herramientas` (`/admin/agentic/tools`, moduleCode `ai_assistant`, mismos allowedRoles) ANTES de `Agentes` en `SIDE_AGENCY_MENU_ITEMS`.

## Fase 3 — Capa de datos frontend (patrón actions → services)

- [x] `lib/models/agents/tool.ts`: interfaces `ToolDefinition`, `AgentToolStatus`, requests; `TOOL_TYPES` gestionables (sin Mcp*), `FUNCTION_LANGUAGES`; `toolFormSchema` (zod) con validación condicional por tipo (Function requiere source_code/language; JSON válido en schema_json y execution_config).
- [x] `lib/actions/agents/tools-actions.ts` (`'use server'`, axios `apiApexAiAuth`): list, get, createGlobal, update (PUT), patch, delete, listAgentTools (query user_id + business_account_id), mapToolToAgent, unmapToolFromAgent.
- [x] `lib/services/agents/tools-service.ts`: clase `ToolsService` delegando a las actions.

## Fase 4 — Página Herramientas + CRUD DataTable

- [x] Dependencias: `bun add @uiw/react-codemirror @codemirror/lang-javascript @codemirror/lang-json @codemirror/lang-rust`.
- [x] `components/agents/tools/ToolsColumns.tsx`: name, description, tool_type (badge), lenguaje (para Function), is_active (switch/badge), updated_at (`formatInBusinessTimeZone` con timezone del activeBusinessStore, formato "mar 10, 2026 12:27"), acciones (editar/activar-desactivar/eliminar).
- [x] `components/agents/tools/CodeEditor.tsx`: wrapper CodeMirror (tema según next-themes, sin esquinas redondeadas, altura configurable, extensión según language js/rust/json).
- [x] `components/agents/tools/ToolForm.tsx` + `ToolFormFields.tsx`: FormField shadcn + zod. Campos comunes: name, description, tool_type (Select w-full, sin Mcp*), is_active. Si `Function`: Select lenguaje (JavaScript/Rust) + timeout_ms + CodeEditor para `source_code`. Para otros tipos: CodeEditor JSON para `execution_config`. Siempre: CodeEditor JSON para `schema_json` (colapsable/tab Avanzado).
- [x] `app/admin/agentic/tools/page.tsx`: patrón de la página Agentes (modo controlado del DataTable, filtro por tool_type, búsqueda por name, Dialog crear/editar, ConfirmDeleteDialog para soft-delete, Loading, botones size sm).
- [x] Filtrar `McpLocal`/`McpRemote` de la lista.

## Fase 5 — Asignación de tools al crear/editar Agente

- [x] `components/agents/AgentToolsSelector.tsx`: multi-selección (checkbox list con búsqueda) de tools activas disponibles (todas los tipos gestionables + muestra las Mcp existentes como asignables, ya que agent_tools las soporta — solo su GESTIÓN vive en Conectores).
- [x] `AgentForm`/página Agentes: al crear → `createAgent` y luego map de cada tool seleccionada; al editar → cargar mappings actuales (`GET /agents/{id}/tools` con user_id + business_account_id) y aplicar diff (map/unmap).

## Fase 6 — Verificación y calidad

- [x] `cargo check` en apex-ai.
- [x] `bunx tsc --noEmit` y `bun run build` en apex-ui (fix adicional: `isLoadingSession` faltante en AgentService.ts, error preexistente que rompía el build).
- [x] Code review (8 ángulos) y correcciones aplicadas: fechas ISO con format_iso en tool_to_response; mapping_exists en repo para dedup correcto de agent_tools (tools inactivas y errores ya no duplican); patch_tool aplica campos combinados (is_active + resto) y el form edita con un solo PATCH atómico; race guard + estado de carga en handleEdit de agentes; Promise.allSettled con conteo de fallos en map/unmap; error visible en AgentToolsSelector; reuso de toolTypes (i18n) e isMcpTool existentes; CodeEditor con next/dynamic (CodeMirror fuera del bundle inicial). Nota del usuario aplicada: las tools MCP SÍ son seleccionables al crear/editar agente; solo su gestión es exclusiva de Conectores..
