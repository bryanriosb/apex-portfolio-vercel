# ADR-0004: Esquema RBAC en Supabase Postgres con RPC SECURITY DEFINER

- **Estado**: aceptado
- **Fecha**: 2026-07-14
- **Decisores**: Bryan Rios
- **Historia técnica**: [docs/rbac-plan.md](../rbac-plan.md) — Fase 2;
  migración `supabase/migrations/20260714_rbac_access_control.sql`

## Contexto y problema

Los roles vivían como un enum en código (`const/roles.ts`) y en
`user_metadata.role` de Supabase Auth — editable por el propio usuario vía
`updateUser`, sin granularidad de permisos, sin trazabilidad de quién otorgó
qué (AC-2) y sin posibilidad de que un tenant defina roles propios. Se
necesita el modelo RBAC de tres niveles (roles → permisos `entidad.acción` →
permisos de campo) multi-tenant, con auditoría, consultable desde apex-ui
por stored procedures sin depender de apex-ai.

## Decision drivers

- AC-2: ciclo de vida de asignaciones (quién/cuándo/expiración) y auditoría.
- AC-3: función central de autorización fail-closed con comodines
  (`exacto` / `entidad.*` / `*`).
- Multi-tenancy: roles globales de solo lectura + roles por tenant con
  unicidad `(tenant, nombre)`.
- Adopción sin big-bang: los 5 roles actuales deben seguir funcionando
  idéntico el día uno.
- No exponer datos de autorización a usuarios finales por RPC directo.

## Opciones consideradas

1. Continuar con roles en `user_metadata` + matriz de permisos en código.
2. **Tablas `rbac_*` en Postgres + RPC `SECURITY DEFINER`** con seeds que
   espejan los roles actuales y backfill desde `auth.users`.
3. Servicio de autorización externo (OPA/Cerbos/SpiceDB).

## Decisión

Opción elegida: **2 — esquema nativo en Postgres**.

Componentes (todo en una migración idempotente):

- **Tablas**: `rbac_roles` (globales `business_account_id NULL` + por
  tenant; `is_system` para los roles semilla inmutables; unicidad por
  índices parciales), `rbac_permissions` (catálogo `entidad.acción` con
  CHECK de formato), `rbac_role_permissions`, `rbac_user_roles` (PK
  `usuario+rol+cuenta`, `business_id` opcional para acotar a sucursal,
  `granted_by/granted_at/expires_at`), `rbac_field_permissions` (Fase 4) y
  `rbac_audit_log` alimentada por triggers sobre las tres tablas mutables.
- **RPC**: `rbac_authorize(user, permiso, cuenta, sucursal)` y
  `rbac_get_user_permissions(user, cuenta)` — `SECURITY DEFINER`,
  fail-closed. Dos decisiones de seguridad deliberadas: (a) una asignación
  acotada a sucursal NO concede nada cuando la operación no declara
  sucursal; (b) `EXECUTE` solo para `service_role` — exponerlas a
  `authenticated` permitiría enumerar permisos ajenos (reciben `p_user_id`
  arbitrario). En Fase 3 se otorga a `supabase_auth_admin` para el token
  hook.
- **Seeds + backfill**: ~50 permisos, los 5 roles del sistema con sets
  equivalentes a `ROLE_PERMISSIONS`, y materialización de `rbac_user_roles`
  desde `user_metadata.role` de `auth.users` (idempotente). `company_admin`
  no se backfillea (no tiene cuenta propia); su acceso sigue por rol de
  sesión hasta la Fase 3.
- **RLS habilitado sin políticas** para `anon`/`authenticated` (deny-all):
  el acceso pasa por las server actions o las funciones DEFINER.

### Pros y contras de las opciones

#### Opción 1 — Statu quo

- Bueno: cero trabajo.
- Malo: el usuario puede editar su propio rol; sin granularidad, sin
  auditoría, sin roles por tenant. Incumple AC-2/AC-6.

#### Opción 2 — Postgres nativo (elegida)

- Bueno: transaccional junto a los datos que protege; RPC utilizable desde
  Next.js sin servicios nuevos; auditoría por triggers sin código adicional;
  migración reversible e idempotente.
- Malo: lógica de autorización en SQL (menos testeable que código de app);
  el catálogo de permisos debe mantenerse sincronizado con el enforcement.

#### Opción 3 — Motor externo

- Bueno: expresividad (ReBAC, policies como código).
- Malo: una pieza operativa más, sobredimensionada para el modelo actual
  (5 roles + permisos por entidad), y contraria al driver de "el frontend
  autoriza solo con Supabase".

## Consecuencias

- Positivas: roles por tenant y asignaciones temporales disponibles;
  trazabilidad completa de cambios RBAC; base lista para claims (Fase 3),
  permisos de campo (Fase 4) y RLS por claim (Fase 6).
- Negativas / deuda aceptada: doble sistema transitorio (rol legacy en
  metadata + RBAC materializado) hasta la Fase 3; la migración debe
  ejecutarse manualmente en Supabase; los usuarios creados después de la
  migración requieren asignación explícita (o re-ejecutar el backfill).

## Referencias

- `supabase/migrations/20260714_rbac_access_control.sql`
- Server actions: `lib/actions/access-control/*`; tipos:
  `lib/models/access-control/access-control.ts`
- UI: `app/admin/access-control/*` (sidebar sistema → "Control de Acceso")
- ADR-0002, ADR-0005
