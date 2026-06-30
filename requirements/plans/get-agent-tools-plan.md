# Plan: Obtener herramientas del agente de manera dinámica y multitenant

Este plan detalla los ajustes necesarios para obtener las herramientas (tools) de un agente utilizando el identificador del usuario autenticado (`user_id`) y de la cuenta de negocio activa (`business_account_id`) de manera dinámica.

## Análisis de la base de código

1. **Endpoint del Backend**:
   - `GET /api/agents/:agentId/tools?user_id=TU_USER_ID&business_account_id=TU_BUSINESS_ACCOUNT_ID`
   - El Action `listTools` en `lib/actions/api/tools.ts` ya mapea correctamente `userId` y `businessAccountId` a los parámetros de consulta `user_id` y `business_account_id`.

2. **Componentes/Páginas Afectadas**:
   - `app/admin/agentic/chat/page.tsx`: Actualmente tiene valores hardcodeados para `userId` y `businessAccountId`.
   - `app/admin/agentic/connectors/page.tsx`: También tiene valores hardcodeados para `userId` y `businessAccountId`.
   - `components/ChatHistory.tsx`: El efecto de carga inicial de sesiones se ejecuta antes de que se resuelvan las credenciales reales del usuario autenticado, y debido a un `ref` de bandera de carga, no se actualiza cuando los parámetros reales llegan.

3. **Recuperación de Datos Reales**:
   - `useCurrentUser()` (`hooks/use-current-user.ts`) provee al usuario logueado (`user.id` como `userId`).
   - `useActiveBusinessStore()` (`lib/store/active-business-store.ts`) contiene el negocio activo (`activeBusiness.business_account_id` como `businessAccountId`).

## Plan de Acción

### [x] Fase 1: Creación del Plan

- [x] Crear el archivo del plan en `requirements/plans/get-agent-tools-plan.md`.

### [x] Fase 2: Actualización de la página de Chat

- [x] Importar `useCurrentUser` y `useActiveBusinessStore` en `app/admin/agentic/chat/page.tsx`.
- [x] Reemplazar las constantes de configuración estáticas de `userId`, `businessAccountId` y `appName` por valores dinámicos.
- [x] Mostrar un estado de carga (`Loading` de `@/components/ui/loading`) mientras se resuelven el usuario o la sesión de negocio.
- [x] Ajustar el hook `useEffect` de conexión al chat para que no inicie la conexión WebSocket si no hay un `userId` válido.

### [x] Fase 3: Actualización de la página de Conectores

- [x] Importar `useCurrentUser` y `useActiveBusinessStore` en `app/admin/agentic/connectors/page.tsx`.
- [x] Reemplazar `userId` y `businessAccountId` estáticos por valores dinámicos.
- [x] Mostrar el estado de carga (`Loading`) si el usuario o la cuenta de negocio se están resolviendo.
- [x] Modificar el `useEffect` para llamar a `loadTools` solo si se disponen de `userId` y `businessAccountId`.

### [x] Fase 4: Ajuste en ChatHistory para Datos Asíncronos

- [x] Modificar `components/ChatHistory.tsx` para eliminar la referencia estática de carga única (`hasLoadedRef`) y hacer que cargue el historial cada vez que `userId` o `appName` cambien a valores válidos.

### [x] Fase 5: Validación y Pruebas

- [x] Validar la compilación correcta y resolver problemas de tipado o linting mediante `bun run lint`.
- [ ] Monitorear que la consulta API envíe la petición HTTP con el formato esperado.
