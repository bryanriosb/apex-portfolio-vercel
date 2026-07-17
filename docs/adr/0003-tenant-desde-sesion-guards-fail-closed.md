# ADR-0003: Tenant derivado de la sesión y guards fail-closed en server actions

- **Estado**: aceptado
- **Fecha**: 2026-07-14
- **Decisores**: Bryan Rios
- **Historia técnica**: [docs/rbac-plan.md](../rbac-plan.md) — Fase 1

## Contexto y problema

Las server actions de apex-ui operan con la service-role key de Supabase
(bypassa RLS) y, antes de esta decisión, muchas recibían `businessAccountId`
o `businessId` como parámetro del cliente y lo usaban como autoridad: un
usuario autenticado podía operar sobre datos de otro tenant pasando un ID
ajeno. Además, el middleware solo verificaba la existencia de sesión para
`/admin/*` — el chequeo de rol era client-side (`router.replace`), es decir,
UX y no control de acceso. Otros huecos: `getenv.ts` exponía cualquier
variable de entorno, `sql-migration.ts` ejecutaba SQL arbitrario sin guard, y
la creación de miembros permitía acuñar cualquier rol (escalación directa).

## Decision drivers

- AC-3: enforcement server-side, fail-closed, en cada punto de entrada.
- AC-6: mínimo privilegio; nadie opera fuera de su tenant ni acuña roles
  superiores al propio.
- No romper flujos legítimos sin sesión: webhooks (Meta, MercadoPago),
  rutas server-to-server con HMAC, schedulers y el registro de cuentas.
- Cambio incremental sin migración de datos (la Fase 2 llega después).

## Opciones consideradas

1. **Activar RLS de inmediato** y migrar las actions al token del usuario.
2. **Guards de aplicación centralizados** (`lib/auth/tenant-guard.ts`) que
   derivan el tenant de la sesión NextAuth y validan los IDs del cliente,
   más gating de rol por ruta en el middleware.
3. Validación ad-hoc en cada action (statu quo mejorado sin helper común).

## Decisión

Opción elegida: **2 — guards centralizados + gating de rol en middleware**,
con RLS diferido a la Fase 6.

Reglas del guard (`requireUser`, `requireRole`, `requireCompanyAdmin`,
`requireAccountAccess`, `requireBusinessAccess`, `resolveAccountScope`):

- El tenant efectivo SIEMPRE sale de la sesión del servidor; un ID recibido
  del cliente solo se acepta si coincide con ella. `company_admin` es el
  único rol cross-tenant.
- Igualdad estricta de rol (nunca coincidencia por subcadena).
- `requireBusinessAccess` valida contra la sesión con fallback a BD (soporta
  sucursales creadas después del login).
- La cookie `x-business-account-id` (business switcher) es solo UI, jamás
  autoridad.
- Middleware: mapa ruta → roles (`const/route-access.ts`, edge-safe) con
  coincidencia por prefijo más específico y **default deny** — toda página
  nueva bajo `/admin` debe registrarse.
- Recursos referenciados por ID opaco (p. ej. ejecuciones de cobranza) se
  validan por propiedad: se lee su `business_id` real antes de operar.
- Excepciones documentadas (sin guard de sesión): webhooks de Meta y
  MercadoPago, route HMAC de envío de WhatsApp, schedulers de recordatorios
  y el flujo de registro. Listadas en el plan, Fase 1.

### Pros y contras de las opciones

#### Opción 1 — RLS inmediato

- Bueno: defensa en la capa de datos, independiente del código.
- Malo: requiere migrar ~40 archivos de actions fuera de la service key y
  reescribir queries; riesgo de regresión masiva en un solo paso.

#### Opción 2 — Guards centralizados (elegida)

- Bueno: cierra los vectores explotables ya, con un patrón único auditable;
  compatible con la service key existente.
- Malo: la barrera vive en el código de aplicación — cada action nueva debe
  adoptarla (mitigado por convención documentada y revisión).

#### Opción 3 — Validación ad-hoc

- Bueno: sin abstracción nueva.
- Malo: es el statu quo que produjo el problema (3 de ~37 archivos
  validaban); inconsistencia garantizada.

## Consecuencias

- Positivas: aislamiento de tenant en ~30 archivos de actions; `/admin/*`
  con gating de rol server-side; `getenv.ts` con allowlist; `exec_sql` solo
  `company_admin` con anti path-traversal; creación de miembros sin
  escalación de rol.
- Negativas / deuda aceptada: hasta la Fase 6 la service key sigue
  bypassando RLS (el guard es la única barrera); las actions de envío de
  WhatsApp comparten implementación entre el route HMAC y la invocación
  desde cliente (separarlas: Fase 4); el default deny del middleware puede
  producir falsos denegados si se olvida registrar una ruta nueva.

## Referencias

- `lib/auth/tenant-guard.ts`, `const/route-access.ts`, `middleware.ts`
- Excepciones y deuda: [docs/rbac-plan.md](../rbac-plan.md) — Fase 1
- ADR-0002 (arquitectura general), ADR-0005 (anti-escalación)
