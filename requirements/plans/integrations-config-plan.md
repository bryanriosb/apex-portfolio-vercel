# Plan: Gestión de Integraciones y Conectores

Interfaz unificada para administrar configuraciones de integraciones y ejecutar operaciones CRUD sobre conectores externos (Odoo y futuros) consumiendo la API REST de APEX.

## Análisis de la Base de Código

1. **Ruta Objetivo**: `/admin/agentic/integrations` ya existe como placeholder vacío.
2. **Navegación**: Menú lateral en `const/sidebar-menu.ts` grupo `SIDE_AGENCY_MENU_ITEMS` (Agencia IA) con sub-ítems Conectores, Automatizaciones, Integraciones.
3. **Patrón de Comunicación**: `lib/actions/api/apex-ai.ts` provee instancia axios `apiApexAiAuth` con interceptor que resuelve `BASE_URL` desde entornos `environment/dev.ts` o `environment/pro.ts`.
4. **Autenticación**: se usará `accessToken` del usuario autenticado (NextAuth session) pasado desde el cliente al server action.
5. **Headers de Tenant**: `x-business-account-id` debe enviarse en cada request a `/api/integrations/**`.
6. **Business ID**: se extrae automáticamente del JWT en el backend; no se envía explícito.
7. **Estilo UI**: sin esquinas redondeadas (`--radius: 0rem`), tema verde esmeralda (`--primary: oklch(0.765 0.177 162.48)`), componentes shadcn, `DataTable` para listados, `FormField` con zod para formularios.

## Scope

**In:**
- Descubrimiento dinámico de conectores disponibles (`GET /api/integrations`).
- Health check visual por conector (`GET /api/integrations/{connector}/health`).
- Operaciones sobre conectores: leer (`POST`), crear (`PUT`), actualizar (`PATCH`), eliminar (`DELETE`).
- CRUD completo de configuraciones de integraciones (`/api/integrations/config`).
- Listado de configuraciones en `DataTable` con filtros por conector, scope y estado activo.
- Formulario de creación/edición con campos comunes + JSON dinámico de configuración.
- Estados de carga con componente `Loading`.
- Toasts de éxito/error con `sonner`.

**Out:**
- Autenticación OAuth de terceros.
- Conectores más allá de los que retorne el backend.
- Sincronización programada/automatizada.
- WebSockets para updates en tiempo real.
- Import/export masivo de configuraciones.

## User Stories

- Como administrador, quiero ver todas mis integraciones configuradas para saber qué sistemas externos están conectados.
- Como administrador, quiero crear una nueva configuración de integración conectando mi Odoo para que Apex AI pueda leer y escribir datos.
- Como administrador, quiero verificar el estado de salud de un conector para diagnosticar problemas de conectividad rápidamente.
- Como administrador, quiero ejecutar operaciones de lectura/escritura sobre un conector desde la UI para sincronizar datos sin usar curl.
- Como administrador, quiero activar/desactivar o eliminar una configuración para controlar qué integraciones están operativas.

## Requisitos

### P0 — Must Have
1. **Listado y descubrimiento**: descubrir conectores y listar configuraciones del tenant.
2. **Crear configuración**: formulario validado con zod, campos `name`, `description`, `connector_id`, `scope`, `config_json`.
3. **Editar configuración**: PATCH parcial, edición inline o modal.
4. **Eliminar configuración**: confirmación previa y manejo de error 404.
5. **Health check**: indicador visual por conector configurado.
6. **Operaciones de conector**: UI para fetch (POST), create (PUT), update (PATCH), delete (DELETE) con campos `table`, filtros, registros, ids y data.
7. **Autenticación correcta**: usar `accessToken` del usuario y header `x-business-account-id`.

### P1 — Should Have
1. Filtros en `DataTable` por `connector_id`, `scope`, `is_active`.
2. Vista de detalle de una configuración antes de editar.
3. Previsualización del JSON de respuesta de operaciones con syntax highlighting o `<pre>`.
4. Validación del JSON de `config_json` antes de enviar.

### P2 — Future Considerations
1. Historial de operaciones ejecutadas.
2. Reintentos automáticos de operaciones fallidas.
3. Permisos granulares por rol para operaciones destructivas.

## Arquitectura

```
app/admin/agentic/integrations/page.tsx
├── IntegrationsPage (Client Component)
    ├── IntegrationsHeader
    ├── ConnectorSelector
    ├── ConfigDataTable
    ├── ConfigFormDialog (create/edit)
    ├── OperationsPanel (health + CRUD operations)
    └── DeleteConfirmationDialog

lib/actions/integrations/
├── integrations-actions.ts          # Server Actions con 'use server'

lib/services/integrations/
├── integrations-service.ts          # Clase que consume actions
├── integrations-types.ts            # Tipos TypeScript

lib/models/integrations/
├── integration-config.ts            # Esquemas zod + tipos
```

## Action Items

### Fase 1: Tipos y Modelos

- [x] Crear `lib/models/integrations/integration-config.ts`
  - Interfaces: `IntegrationConfig`, `IntegrationConfigInsert`, `IntegrationConfigUpdate`
  - Esquemas zod para formularios
  - Tipo `ConnectorOperationRequest` para operaciones de conector
- [x] Crear `lib/services/integrations/integrations-types.ts`
  - Respuestas de API: `ListConnectorsResponse`, `HealthCheckResponse`, `ConnectorOperationResponse`, `ListIntegrationConfigsResponse`

### Fase 2: Server Actions

- [x] Crear `lib/actions/integrations/integrations-actions.ts` con `'use server'`
  - `listConnectors(accessToken: string)` → `GET /api/integrations`
  - `checkConnectorHealth(connectorName, accessToken, businessAccountId)` → `GET /api/integrations/{connector}/health`
  - `executeConnectorFetch(connectorName, body, accessToken, businessAccountId)` → `POST /api/integrations/{connector}`
  - `executeConnectorCreate(connectorName, body, accessToken, businessAccountId)` → `PUT /api/integrations/{connector}`
  - `executeConnectorUpdate(connectorName, body, accessToken, businessAccountId)` → `PATCH /api/integrations/{connector}`
  - `executeConnectorDelete(connectorName, body, accessToken, businessAccountId)` → `DELETE /api/integrations/{connector}`
  - `listIntegrationConfigs(accessToken, businessAccountId)` → `GET /api/integrations/config`
  - `getIntegrationConfig(id, accessToken, businessAccountId)` → `GET /api/integrations/config/{id}`
  - `createIntegrationConfig(data, accessToken, businessAccountId)` → `POST /api/integrations/config`
  - `updateIntegrationConfig(id, data, accessToken, businessAccountId)` → `PATCH /api/integrations/config/{id}`
  - `deleteIntegrationConfig(id, accessToken, businessAccountId)` → `DELETE /api/integrations/config/{id}`
  - Todas usan `apiApexAiAuth` con header `Authorization: Bearer {accessToken}` y `x-business-account-id: {businessAccountId}`

### Fase 3: Service

- [x] Crear `lib/services/integrations/integrations-service.ts`
  - Clase `IntegrationsService` que delega en las server actions.
  - Métodos: `listConnectors`, `checkHealth`, `fetchRecords`, `createRecords`, `updateRecords`, `deleteRecords`, `listConfigs`, `getConfig`, `createConfig`, `updateConfig`, `deleteConfig`.

### Fase 4: UI Principal

- [x] Reemplazar `app/admin/agentic/integrations/page.tsx`
  - Usar `useCurrentUser()` para `accessToken` y `businessAccountId`.
  - Usar pestañas (Tabs) para separar "Configuraciones" y "Operaciones".
  - Mostrar estado de carga con `Loading` si no hay usuario/cuenta.

### Fase 5: Tabla de Configuraciones

- [x] Crear `components/integrations/IntegrationsColumns.tsx`
  - Usar `DataTable` con columnas: nombre, conector, scope, estado, fechas, acciones.
  - Filtros por conector, scope y estado activo.
  - Botones: editar, eliminar, ver detalle/health check.

### Fase 6: Formulario de Configuración

- [x] Crear `components/integrations/IntegrationConfigForm.tsx`
  - Formulario con `FormField` de shadcn y validación zod.
  - Select de conectores dinámico desde `listConnectors`.
  - Select de scope: `Account` / `Business`.
  - Switch de `is_active` (en edición).
  - Textarea para `config_json` con validación de JSON.

### Fase 7: Panel de Operaciones

- [x] Crear `components/integrations/ConnectorOperationsPanel.tsx`
  - Select de conector configurado.
  - Botón "Verificar conexión" con indicador de salud.
  - Formulario para operaciones:
    - Campo `table` (obligatorio).
    - Según modo: filtros/offset/limit/order (fetch), registros JSON (create), ids + data (update), ids (delete).
  - Botones de acción: Leer, Crear, Actualizar, Eliminar.
  - Área de resultado con JSON pretty-print.

### Fase 8: Polish y Navegación

- [x] Verificar que el menú lateral en `const/sidebar-menu.ts` apunta correctamente a `/admin/agentic/integrations`.
- [x] Estados vacíos ilustrativos.
- [x] Toasts de éxito/error con `sonner`.
- [x] Manejo de errores 400/404/503 legibles.

### Fase 9: Validación

- [x] Ejecutar `bun run lint`.
- [x] Ejecutar `tsc --noEmit` en archivos del módulo (proyecto tiene errores pre-existentes en tests).
- [x] Verificar que no se rompe la navegación ni el layout existente.

## Decisiones de Diseño

- **Acceso a la API**: las server actions reciben el `accessToken` desde el cliente porque el interceptor de axios corre en el servidor y no tiene acceso directo a la sesión de NextAuth del cliente.
- **Separación por pestañas**: "Configuraciones" para CRUD de conexiones y "Operaciones" para ejecutar acciones contra conectores. Reduce la carga cognitiva.
- **JSON de configuración**: se edita como texto plano en textarea con validación zod. Se justifica por la naturaleza dinámica de credenciales por conector.
- **Sin esquinas redondeadas**: se respeta `--radius: 0rem` del tema actual.

## Open Questions

1. ¿El endpoint `GET /api/integrations` requiere autenticación? La guía indica sí (`Authorization: Bearer`).
2. ¿El header `x-business-account-id` es obligatorio también para `GET /api/integrations`? La guía lo muestra solo en ejemplos de health/operaciones/config; se enviará siempre por consistencia.
3. ¿El campo `config_json` se envía como string JSON o como objeto? La guía indica string JSON; el formulario lo manejará como string.
