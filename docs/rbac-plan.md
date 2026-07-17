# Plan RBAC — Autorización y Control de Acceso

**Estándar de referencia:** NIST SP 800-53 — AC-2 (gestión de cuentas), AC-3 (enforcement de acceso), AC-6 (mínimo privilegio).

**Decisión de arquitectura:** un solo modelo RBAC con fuente de verdad en Supabase Postgres y dos puntos de enforcement:

- **apex-ui** (Next.js): permisos finos `entidad.acción` + permisos de campo, evaluados vía stored procedures (RPC) sin depender de apex-ai.
- **apex-ai** (Rust/Axum): servicio *claims-driven*. No conoce roles; autoriza por scopes que viajan en el token (JWT o API key). La traducción rol → permisos → scopes ocurre al emitir el token (Supabase Custom Access Token Hook). Esto mantiene apex-ai vendible como PaaS: un cliente externo trae su IdP (JWKS + mapeo de claims) o usa API keys con scopes.

**Principios transversales (AC-3/AC-6):**

- Fail-closed en todos los puntos: sin permiso explícito → denegado.
- El tenant (`business_account_id`/`business_id`) se deriva de la sesión del servidor, nunca se confía en IDs enviados por el cliente.
- Claims de autorización en `app_metadata`/claims firmados, nunca en `user_metadata` (editable por el usuario).
- Verificación de rol admin por igualdad estricta, nunca por subcadena.
- Comodines explícitos: permiso exacto `entidad.acción`, comodín `entidad.*`, superpermiso `*`.

---

## Fase 1 — Cierre de huecos explotables en apex-ui (✅ COMPLETADA 2026-07-14)

Objetivo: que ningún usuario autenticado pueda operar fuera de su tenant ni acceder a rutas de otro rol. Sin cambios de esquema todavía.

| # | Tarea | Estado |
| --- | --- | --- |
| 1.1 | Guard server-side `lib/auth/tenant-guard.ts`: `requireUser()`, `requireRole()`, `requireCompanyAdmin()`, `requireAccountAccess()`, `requireBusinessAccess()`, `resolveAccountScope()`. Fail-closed, tenant derivado de la sesión NextAuth. | ✅ |
| 1.2 | Mapa ruta → roles (`const/route-access.ts`, edge-safe) + gating de rol en `middleware.ts` para `/admin/*`. Default deny para rutas no mapeadas. | ✅ |
| 1.3 | Guard en actions críticas de nivel cuenta/sistema: `business-account.ts`, `business.ts`, `system-settings.ts`, `permissions.ts`, `plan.ts`, `subscription.ts`. | ✅ |
| 1.4 | Sweep del resto: `whatsapp.ts`, `business-customer.ts`, `customer-category.ts`, `customer-auth.ts`, `customer-import-export.ts`, `sidebar.ts`, `collection/*` (16 archivos), `integrations/integrations-actions.ts`, `api/tools.ts`. | ✅ |
| 1.5 | Actions peligrosas: `sql-migration.ts` (`requireCompanyAdmin` + anti path-traversal), `getenv.ts` (allowlist `WEBSOCKET_URL`/`WEBSOCKET_API_KEY` + sesión; antes exponía CUALQUIER env var), `dynamodb.ts` (`requireUser` en las 7). | ✅ |

**Funciones dejadas SIN guard de sesión a propósito (flujos server-to-server / webhooks):**

- `whatsapp.ts`: `sendWhatsAppTextMessageAction` / `sendWhatsAppTemplateMessageAction` (route HMAC `app/api/whatsapp/send`), `processIncomingWhatsAppMessageAction`, `updateWhatsAppMessageStatusAction`, `getWhatsAppConfigByPhoneNumberIdAction` (webhook Meta), `fetchPendingRemindersAction` / `markReminderAsSent|FailedAction` (scheduler).
- `subscription.ts`: `processPaymentNotificationAction`, `logSubscriptionEventAction` (webhook MercadoPago).
- `registration.ts` (flujo de alta, sin sesión por diseño) y los webhooks de email (`lib/webhooks/*`, no usan actions guardadas).

**Deuda registrada:** las actions de envío de WhatsApp también son invocables desde el cliente con `business_account_id` sin validar contra sesión (comparten implementación con el route HMAC); separar la variante interna de la server action pública queda para la fase 4.

**Notas de diseño del guard:**

- `company_admin` es el único rol cross-tenant: puede operar sobre cualquier cuenta.
- `business_admin` y roles menores: la cuenta efectiva es siempre la de su sesión; si pasan un ID distinto se lanza `AccessDeniedError`.
- `requireBusinessAccess` valida contra `session.business_id` y la lista `session.businesses[]` (soporta el business switcher).
- La cookie `x-business-account-id` (switcher) es solo UI; jamás se usa como fuente de autorización en apex-ui.

## Fase 2 — Esquema RBAC en Supabase Postgres (✅ COMPLETADA 2026-07-14 — pendiente aplicar migración)

- **Migración:** `supabase/migrations/20260714_rbac_access_control.sql` (idempotente). Tablas `rbac_roles` (globales `business_account_id NULL` + por tenant, unicidad por índices parciales), `rbac_permissions` (catálogo `entidad.acción` con CHECK de formato), `rbac_role_permissions`, `rbac_user_roles` (con `granted_by/granted_at/expires_at` — AC-2), `rbac_field_permissions` (Fase 4), `rbac_audit_log` + triggers de auditoría sobre roles/permisos/asignaciones.
- **RPC:** `rbac_authorize(user, permiso, cuenta, sucursal)` y `rbac_get_user_permissions(user, cuenta)` — `SECURITY DEFINER`, fail-closed (exacto / `entidad.*` / `*`; asignación acotada a sucursal NO aplica sin sucursal declarada), EXECUTE solo para `service_role` (en Fase 3 se otorga a `supabase_auth_admin` para el token hook).
- **Seeds:** catálogo de ~50 permisos + los 5 roles del sistema (`is_system`, espejo de `const/roles.ts`) con sus sets, y **backfill** de `rbac_user_roles` desde `user_metadata.role` de `auth.users`.
- **Server actions:** `lib/actions/access-control/{roles,permissions,assignments,audit}.ts` con guards de fase 1 + anti-escalación AC-6 en `lib/auth/rbac.ts` (`assertCanGrantPermissions`): jerarquía de super-usuarios — company_admin otorga todo; **business_admin es super-usuario de su cuenta** y otorga cualquier permiso de tenant salvo los reservados a plataforma (`*`, `plan.*`, `system.*`, `account.delete` — `isPlatformReservedPermission`); otorgantes menores quedan bajo regla de cobertura. Catálogo de permisos solo company_admin; roles del sistema inmutables; no auto-revocación. Ver ADR-0005.
- **UI:** sidebar sistema → "Control de Acceso" (Roles, Permisos, Asignaciones, Auditoría) en `/admin/access-control/*` (registrado en `route-access.ts`, solo admins). Páginas en `app/admin/access-control/`, componentes en `components/access-control/`.
- **⚠️ Para activar:** ejecutar la migración en Supabase (SQL Editor o CLI). Hasta entonces las páginas del módulo devolverán errores de tabla inexistente. `company_admin` no se backfillea a `rbac_user_roles` (sin cuenta propia); su acceso sigue vía rol de sesión hasta Fase 3.

## Fase 3 — Emisión de claims (puente apex-ui ↔ apex-ai)

- Supabase **Custom Access Token Hook**: inyecta en el JWT rol activo, `business_account_id`, `business_id`, scopes derivados (`agents:read`, `agents:execute`, `tools:execute`, …) y `perm_version` para invalidación de cachés.
- Migrar claims de autorización de `user_metadata` → claims del hook / `app_metadata`.
- No incluir la lista completa de permisos finos en el JWT (solo rol + scopes + versión).

## Fase 4 — Enforcement fino en apex-ui

- Wrapper `requirePermission(entidad, acción)` sobre el RPC `authorize()`, desplegado action por action (reemplaza el uso parcial de `validateModuleAccess`; el sistema de planes queda como capa ortogonal: el plan define qué módulos existen, el RBAC qué puede hacer cada usuario).
- `checkFieldPermission()`: filtra payloads de lectura y valida escrituras contra `field_permissions` (cache TTL). Sin configuración → denegado.

## Fase 5 — apex-ai claims-driven (preparación PaaS)

- `authenticate_jwt` lee scopes del claim del token en vez de otorgar los 3 scopes fijos (`shared/src/auth/mod.rs:205-211`). Sin claim → sin scopes → 403.
- Tabla `api_keys` (ClickHouse): añadir `scopes` y binding a `business_account_id`/`business_id`.
- Granularizar scopes por router: `workflows:execute`, `sessions:read`, `memory:search`, `integrations:manage`.
- Config de IdP externa por env: JWKS URL, issuer, `tenant_claim`, `scopes_claim`.
- Corregir interpolación SQL con `format!` en repos ClickHouse → binds (`agent_definition_repository.rs` y similares).

## Fase 6 — RLS progresivo (red final)

- Políticas RLS por `business_account_id` en tablas sensibles usando el claim del JWT.
- Migrar server actions de la service-role key a cliente con token de usuario (`@supabase/ssr`, ya instalado y sin uso).

---

## Hallazgos que motivaron la fase 1 (baseline de riesgo)

1. `middleware.ts` solo verificaba presencia de sesión para `/admin/*`, no rol; el chequeo de rol era client-side (`router.replace`).
2. Server actions operan con service-role key (bypassa RLS) y muchas reciben `businessAccountId` como parámetro del cliente → un usuario autenticado podía operar sobre otro tenant.
3. Guards existentes (`validateModuleAccess`, `feature-permission-guard`) usados solo en 3 de ~37 archivos de actions.
4. Rol en `user_metadata` (modificable por el propio usuario vía `updateUser`).
5. apex-ai otorga los mismos scopes a todo JWT válido y a toda API key.
