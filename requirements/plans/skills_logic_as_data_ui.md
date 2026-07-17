# Plan UI: Skills Logic-as-Data (allowed-tools, references, tags)

Integra en la creación/edición de habilidades la metadata Logic-as-Data que
el backend ya expone (apex-ai `requirements/plans/skills_logic_as_data.md`):
`allowed-tools` (RBAC del toolset), `references` (recursos inyectables) y
`tags` (scoring de selección +2.0).

## Contrato backend (ya desplegable)

- `GET /skills/{name}` → `{ name, content, metadata }`
- `POST /skills` / `PUT /skills/{name}` → `{ name, metadata }`
- `metadata = { description, version, tags, allowed_tools, references,
  trigger, hint }` — derivada del frontmatter; el markdown `content` sigue
  siendo la única fuente de verdad persistida.

## Diseño

- El formulario mantiene una sola fuente de verdad: `content`. El nuevo panel
  "Logic-as-Data" parsea el frontmatter (js-yaml) y reescribe solo las claves
  `tags` / `allowed-tools` / `references` sobre el mismo `content` — sin
  estado duplicado ni desincronización con el editor markdown.
- `allowed-tools` se selecciona del catálogo real de tools
  (`ToolsService.listTools()`), reduciendo la alucinación de nombres.
- Si el frontmatter es inválido, el panel se deshabilita con aviso y el
  editor manual sigue funcionando (el backend valida en el submit).

## Fases

### Fase 1 — Modelos y helpers

- `lib/models/agents/skill.ts`: `SkillMetadata`, `Skill.metadata?`,
  `SkillWriteResponse`.
- `lib/models/agents/skill-frontmatter.ts`: `parseSkillLogicFields` /
  `updateSkillLogicFields` (js-yaml, preserva claves desconocidas; claves
  con lista vacía se eliminan del frontmatter).
- Dependencia `js-yaml` (+`@types/js-yaml`).

### Fase 2 — Componente y formulario

- `components/agents/skills/SkillLogicFields.tsx`: panel con chips para
  tags/references (patrón de `AgentFormFields`) y selector de tools con el
  `Combobox` existente (seleccionar → chip).
- `SkillForm.tsx`: panel integrado entre nombre y contenido; carga de tools
  al abrir el diálogo.

### Fase 3 — Tipado de actions/services + tests

- `skills-actions.ts` / `skills-service.ts`: create/update devuelven
  `SkillWriteResponse`; `getSkill` tipa `metadata`.
- Tests vitest de los helpers de frontmatter
  (`__tests__/agentic/skills/skill-frontmatter.test.ts`).

## Estado de ejecución

- [x] **Fase 1 — Modelos y helpers** (2026-07-13): `SkillMetadata` /
  `SkillWriteResponse` en `skill.ts`; `skill-frontmatter.ts` con
  `parseSkillLogicFields`, `updateSkillLogicFields` y
  `updateSkillFrontmatterName`. Dependencia `js-yaml@^4.1.1` (fijada a v4
  para alinear con `@types/js-yaml`).
- [x] **Fase 2 — Componente y formulario** (2026-07-13):
  `SkillLogicFields.tsx` reutiliza `TagsSelector` (allowed-tools desde el
  catálogo con `existingTags` + `createNew=false`; tags/references
  creatables); `SkillForm` integra el panel con `useWatch` acotado a
  `content` y sincroniza `name` del frontmatter de forma quirúrgica.
- [x] **Fase 3 — Tipado + tests** (2026-07-13): actions/service devuelven
  `SkillWriteResponse`; 10 tests vitest de frontmatter en verde; eslint y
  tsc limpios (los errores restantes de tsc son preexistentes en
  `useAgentChat.test.ts`, ajenos a este cambio).
- [x] **Iteración 2 — Observaciones del usuario** (2026-07-13):
  - DataTable de habilidades con columnas Descripción, Tags (badges con
    overflow +N), Herramientas (conteo con tooltip), References (conteo) y
    Versión — alimentadas por la metadata que ahora expone `GET /skills`.
  - References rediseñadas como ARCHIVOS reales (`SkillReferencesEditor`):
    nombre + extensión (md/json/sql/js/ts/py/rs/txt/csv/yaml) + editor
    CodeMirror con lenguaje por tipo; se suben al bucket R2 privado tras
    guardar la skill (`PUT /skills/{name}/references/{filename}`, borrados
    idempotentes) y el frontmatter `references` se sincroniza solo cuando
    cambia el conjunto de archivos. Carga perezosa del contenido al editar.
  - Diagnóstico del catálogo de tools (401): probado empíricamente que
    staging/local responden 200 en `/agents/tools` con token válido y que el
    backend aplanaba todo fallo de auth a "missing authorization header".
    Diagnóstico probable: el JWT de Supabase embebido en la sesión NextAuth
    expira (~1h) y nada lo refresca → TODAS las llamadas autenticadas 401
    (el listado de skills también falla: por eso la tabla se ve vacía).
    Fixes aplicados: el backend ahora distingue "token presente pero
    rechazado (expirado/malformado/sin contexto de negocio)" de "sin
    header", y `extractApiError` (skills y tools actions) entiende cuerpos
    de texto plano — el panel muestra la causa exacta. Confirmado por el
    usuario: re-login lo resolvió. Causa raíz: la rotación SSO
    (commit 091c1fb, 2026-07-12) era posterior a su sesión — el JWT legacy
    no tenía `expiresAt`/`refreshToken` y la callback servía un access
    token vencido para siempre.
  - **Fix durable de sesiones (2026-07-13)**: la callback `jwt` ahora (a)
    recupera la expiración del propio access token en sesiones legacy sin
    `expiresAt`, (b) nunca sirve un token vencido — si no puede refrescar
    marca `authError: SessionExpired` y anula el access token — y (c) el
    middleware detecta esa marca, limpia la cookie de sesión y fuerza
    re-login en la siguiente navegación. 7 unit tests de las ramas de
    rotación (`__tests__/agentic/auth/jwt-rotation.test.ts`).
  - Layout responsive del formulario (2026-07-13): diálogo más ancho
    (`w-[95vw] max-w-6xl`) con grid de dos columnas en desktop — izquierda:
    Nombre + Logic-as-Data; derecha: References + Contenido (editor a 380px)
    — apiladas en una columna en móvil. `SkillLogicFields` simplificado a
    stack vertical (su grid interno quedó muerto al vivir en media columna).
  - Fixes de review: CodeMirror bloqueado durante submit
    (`editable/readOnly`, fieldset no afecta contenteditable); sync de
    frontmatter solo ante cambios del set de archivos (no por tecla);
    `initialReferences` requerida con identidad estable.
- [x] **Code review aplicado** (2026-07-13): reescritura quirúrgica del
  frontmatter (un `version: 1.0` ya no se re-serializa como número), fix del
  sync de `name` en modo creación tras editar el panel, error visible cuando
  el catálogo de tools no carga, reuso de `TagsSelector` (−85 líneas
  duplicadas) y `useWatch` scoped. Limitación conocida (aceptada): si el
  usuario escribe YAML transitoriamente inválido en el editor, el panel se
  colapsa al aviso hasta que el frontmatter vuelva a ser parseable.
