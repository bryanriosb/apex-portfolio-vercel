# Plan de Integración: Sincronización de Colecciones

## Objetivos
Integrar la opción de "sync facturas pendientes" en el módulo de Cartera (`/admin/collection/sync-jobs`). Se deben consumir los servicios de sincronización definidos en las instrucciones del usuario.

## Fase 1: Modelos y Tipos
- [x] Crear el archivo `lib/models/collection/sync-jobs.ts`.
- [x] Definir los tipos: `SyncOperation`, `SyncStatus`, `CollectionSyncData`, `ApexJobPayload`, `CollectionSyncPayload`, `ScheduleParams`, `EnqueueJobRequest`, `SyncEnqueueResponse`, `SyncProgressResponse`, y la estructura de la respuesta para el listado de jobs (`JobStatusResponse` / `ScheduledJobsResponse`).

## Fase 2: Servicios y Server Actions
- [x] Crear `lib/actions/collection/sync-jobs-actions.ts`.
  - [x] Implementar la función `listSyncJobsAction(accessToken, businessId)` (Endpoint `GET /api/jobs?module=collection&business_id=...`).
  - [x] Implementar la función `createImmediateSyncAction(payload, accessToken, businessAccountId)` (Endpoint `POST /api/collections/sync`).
  - [x] Implementar la función `createScheduledSyncAction(payload, accessToken, businessAccountId)` (Endpoint `POST /api/jobs`).
  - [x] Implementar la función `getSyncProgressAction(jobId, accessToken, businessAccountId)` (Endpoint `GET /api/collections/sync/{job_id}`).
  - [x] Implementar la función `cancelSyncJobAction(jobId, accessToken, businessAccountId)` (Endpoint `DELETE /api/collections/sync/{job_id}`).
- [x] Crear `lib/services/collection/sync-jobs-service.ts` como wrapper para usar desde los hooks/componentes, pasando el `accessToken` y `businessAccountId`/`businessId`.

## Fase 3: Componentes de UI (Tablas y Columnas)
- [x] Crear `components/collection/sync-jobs/SyncJobsColumns.tsx`
  - [x] Definir las columnas para el `DataTable` (id, estado, tipo (Recurrente, Programada, Única), progreso, fechas, acciones).
- [x] Crear el componente `components/collection/sync-jobs/SyncJobsTable.tsx`
  - [x] Incluir el `DataTable` usando las columnas definidas.

## Fase 4: Página Principal y Tabs
- [x] Modificar `app/admin/collection/sync-jobs/page.tsx`
  - [x] Convertirlo a componente de cliente (`'use client'`).
  - [x] Integrar `Tabs` con una sola tab inicial: "Facturas Pendientes".
  - [x] Incluir un botón "Nueva Sincronización" (opcional o de acuerdo al mock, aunque la instrucción principal dice "integrar la opción de sync facturas pendientes en el modulo de Cartera").
  - [x] Implementar el fetching de jobs usando `SyncJobsService`.
  - [x] Implementar polling cada 10 segundos para los jobs en estado "Pending" o "in_progress".

## Fase 5: Revisión y Refinamiento
- [x] Validar que se use correctamente el `activeBusinessId` para los fetch.
- [x] Verificar manejo de errores y estados de carga.

## Fase 6: Botones de Acción y Formulario de Nueva Sincronización
- [x] Crear componente de formulario modal `SyncJobFormDialog` con validación Zod.
- [x] Implementar botones de acción en la tabla (Pausar, Reanudar, Editar).
- [x] Integrar servicio PATCH para actualizar el estado del trabajo.
- [x] Implementar la lógica de edición de cron/scheduled (eliminar el anterior y crear el nuevo).
- [x] Crear componente CronBuilder para tener una interfaz amigable de construcción de frecuencias cron.
