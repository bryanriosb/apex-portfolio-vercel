# ADR-0005: Anti-escalación de privilegios y gobernanza de roles/permisos

- **Estado**: aceptado
- **Fecha**: 2026-07-14
- **Decisores**: Bryan Rios
- **Historia técnica**: [docs/rbac-plan.md](../rbac-plan.md) — Fase 2;
  `lib/auth/rbac.ts`, `lib/actions/access-control/*`

## Contexto y problema

Con el módulo "Control de Acceso", los `business_admin` gestionan roles y
asignaciones de su tenant. Eso abre el vector clásico de RBAC delegado: un
administrador de tenant que crea un rol con `*`, se lo asigna, y escala a
privilegios de plataforma. También hay que definir quién gobierna cada pieza
del modelo (catálogo de permisos, roles del sistema, roles globales) para
cumplir AC-6 sin bloquear la operación diaria de los tenants.

## Decision drivers

- AC-6: mínimo privilegio; ninguna operación de gestión puede resultar en
  más permisos de los que posee quien la ejecuta.
- Los tenants deben poder crear y asignar roles propios sin tickets a la
  plataforma.
- El catálogo de permisos debe coincidir con el enforcement en código: si
  cualquiera crea códigos, el catálogo y la realidad divergen.
- Evitar lockouts accidentales (un admin quedándose sin acceso).

## Opciones consideradas

1. Solo `company_admin` gestiona roles/asignaciones (centralización total).
2. Tenants gestionan libremente sus roles, incluida la selección de
   cualquier permiso del catálogo.
3. **Regla de cobertura pura**: nadie puede otorgar (a un rol o vía
   asignación) permisos que él mismo no posee.
4. **Jerarquía de super-usuarios con denylist de plataforma**:
   `business_admin` es super-usuario dentro de su cuenta y otorga cualquier
   permiso de tenant; los permisos de plataforma quedan reservados por
   denylist; la cobertura aplica solo a otorgantes menores.

## Decisión

Opción elegida: **4 — jerarquía de super-usuarios**, implementada en
`assertCanGrantPermissions()` (`lib/auth/rbac.ts`):

- `company_admin`: super-usuario de plataforma; otorga cualquier permiso.
- `business_admin`: super-usuario de SU `business_account` — otorga
  cualquier permiso de tenant a los roles/asignaciones de su cuenta, sin
  requerir permisos materializados propios. **Denylist de plataforma**
  (`isPlatformReservedPermission`, en
  `lib/models/access-control/access-control.ts`): jamás puede otorgar `*`,
  `account.delete` ni códigos de las entidades `plan` y `system`. Esto le
  impide, entre otras cosas, asignar el rol de sistema `company_admin`
  (contiene `*`).
- Otorgantes menores (roles futuros con `access_control.manage`): regla de
  cobertura — solo otorgan permisos cubiertos por los suyos (exacto,
  `entidad.*` o `*`), obtenidos vía `rbac_get_user_permissions`. Fail-closed
  si no tienen permisos materializados.
- La UI marca los permisos reservados con badge "Plataforma" y los
  deshabilita para tenants; el servidor es la autoridad en cualquier caso.

Reglas de gobernanza complementarias:

- **Roles del sistema** (`is_system`): inmutables para todos; son el espejo
  de los 5 roles legacy y la red de seguridad de la migración.
- **Roles globales** (`business_account_id NULL`): solo `company_admin` los
  crea/edita; los tenants los ven en solo lectura.
- **Catálogo de permisos**: solo `company_admin` (los códigos deben existir
  en el enforcement); del código solo es editable la descripción.
- **Asignaciones**: el rol debe ser global o del tenant; el usuario destino
  debe pertenecer al tenant; nadie (salvo `company_admin`) revoca sus
  propios roles — anti-lockout.
- **Eliminación protegida**: un rol con asignaciones activas o un permiso en
  uso por roles no se puede borrar sin retirar primero las referencias.

### Pros y contras de las opciones

#### Opción 1 — Centralización total

- Bueno: superficie de escalación mínima.
- Malo: la plataforma se vuelve cuello de botella de cada tenant; no escala
  operativamente.

#### Opción 2 — Libertad total del tenant

- Bueno: autonomía máxima.
- Malo: escalación trivial (`*` autoasignado); incumple AC-6.

#### Opción 3 — Regla de cobertura pura

- Bueno: invariante simple ("no puedes dar lo que no tienes") sin listas
  mantenidas a mano.
- Malo: degrada al `business_admin` a operador limitado por su propio set —
  contradice su papel de super-usuario del tenant; depende del backfill de
  `rbac_user_roles` (un admin sin filas materializadas queda bloqueado para
  gestionar su cuenta).

#### Opción 4 — Jerarquía + denylist (elegida)

- Bueno: refleja el modelo real de la plataforma (`company_admin` global,
  `business_admin` soberano en su cuenta); no depende del backfill para la
  operación del tenant; la denylist es corta, explícita y client-safe (se
  reutiliza en la UI).
- Malo: la denylist debe mantenerse al crecer el catálogo — todo permiso
  nuevo de alcance plataforma debe añadirse a las entidades/códigos
  reservados o quedará otorgable por tenants.

## Consecuencias

- Positivas: los tenants operan solos sin poder escalar a plataforma;
  `business_admin` gestiona permisos de su cuenta sin fricción; cadena de
  custodia completa en `rbac_audit_log` (quién otorgó qué, cuándo).
- Negativas / deuda aceptada: **convención de nombrado obligatoria** — los
  permisos de alcance plataforma deben vivir en entidades reservadas
  (`plan`, `system`) o añadirse a `PLATFORM_RESERVED_CODES`; la regla de
  cobertura para otorgantes menores queda latente hasta que exista
  delegación a roles no-admin.

## Referencias

- `lib/auth/rbac.ts` (`permissionCovers`, `assertCanGrantPermissions`),
  `lib/models/access-control/access-control.ts`
  (`isPlatformReservedPermission`, `PLATFORM_RESERVED_ENTITIES/CODES`)
- `lib/actions/access-control/roles.ts` (`setRolePermissionsAction`),
  `lib/actions/access-control/assignments.ts` (`assignRoleAction`,
  `revokeRoleAction`)
- ADR-0004 (esquema y auditoría)
