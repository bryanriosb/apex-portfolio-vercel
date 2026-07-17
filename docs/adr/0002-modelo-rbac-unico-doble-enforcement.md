# ADR-0002: Modelo RBAC único con doble punto de enforcement (apex-ui / apex-ai)

- **Estado**: aceptado
- **Fecha**: 2026-07-14
- **Decisores**: Bryan Rios
- **Historia técnica**: [docs/rbac-plan.md](../rbac-plan.md)

## Contexto y problema

La plataforma tiene dos servicios con superficies de autorización distintas:
**apex-ui** (Next.js, server actions contra Supabase Postgres con service-role
key) y **apex-ai** (microservicio Rust/Axum especializado en workflows de
agentes IA, con datos en ClickHouse/Neo4j/Redis y verificación de JWT de
Supabase vía JWKS). Se requiere un sistema de autorización alineado a NIST SP
800-53 AC-2/AC-3/AC-6, y existe un objetivo de negocio adicional: apex-ai debe
poder venderse como infraestructura sin frontend (PaaS), donde el cliente trae
su propio proveedor de identidad.

La pregunta central: ¿debe existir un RBAC en cada servicio, uno solo
compartido, o un modelo híbrido? Duplicar el modelo de roles en apex-ai lo
acoplaría a las tablas de apex-ui y rompería la historia PaaS; no tener nada
en apex-ai dejaría su API sin control de acceso granular.

## Decision drivers

- AC-3/AC-6: enforcement fail-closed y mínimo privilegio en ambos servicios.
- apex-ai vendible como PaaS: cero acoplamiento a las tablas de roles de la
  plataforma; el cliente enchufa su IdP (JWKS + claims) o usa API keys.
- El frontend debe poder autorizar sin llamar a apex-ai (stored procedures
  vía RPC de Supabase).
- apex-ai ya autoriza por scopes (`agents:read`, `agents:execute`,
  `tools:execute`, `admin:all`) — formato `entidad:acción` compatible.
- Una sola fuente de verdad para gestionar roles/permisos (evitar deriva
  entre dos modelos).

## Opciones consideradas

1. **RBAC completo duplicado en cada servicio** (tablas de roles propias en
   apex-ai sobre ClickHouse).
2. **Un solo RBAC en Supabase consultado por ambos servicios en runtime**
   (apex-ai consulta las tablas de roles por request).
3. **Modelo RBAC único en Supabase + apex-ai claims-driven**: la traducción
   rol → permisos → scopes ocurre al emitir el token; apex-ai solo entiende
   scopes y aislamiento de tenant, sin conocer roles.

## Decisión

Opción elegida: **3 — modelo único + apex-ai claims-driven**.

La fuente de verdad (roles, permisos `entidad.acción`, permisos de campo,
asignaciones) vive en Supabase Postgres. apex-ui hace enforcement fino vía
guards de sesión y la RPC `rbac_authorize()`. apex-ai autoriza exclusivamente
por los scopes que viajan en el token (JWT con claims emitidos por un Custom
Access Token Hook, o API keys con scopes); nunca consulta tablas de roles.

### Pros y contras de las opciones

#### Opción 1 — RBAC duplicado

- Bueno: autonomía total de apex-ai.
- Malo: dos modelos que derivan; gestión doble para el operador; ClickHouse
  no es un buen almacén transaccional para asignaciones de roles.

#### Opción 2 — RBAC compartido consultado en runtime

- Bueno: una sola fuente de verdad, consistencia inmediata.
- Malo: acopla apex-ai al esquema Postgres de la plataforma (mata el PaaS);
  añade una dependencia dura y latencia por request.

#### Opción 3 — Único + claims-driven (elegida)

- Bueno: una fuente de verdad; apex-ai queda agnóstico del IdP (solo necesita
  JWKS configurable + mapeo de claims + API keys con scopes); sin latencia de
  lookup en apex-ai.
- Malo: los cambios de permisos tardan en propagarse hasta la renovación del
  token (mitigable con `perm_version` y TTL cortos); requiere el token hook
  (Fase 3).

## Consecuencias

- Positivas: apex-ai vendible standalone; enforcement coherente con un solo
  panel de administración ("Control de Acceso" en apex-ui); los scopes de
  apex-ai ya existentes se reutilizan sin refactor mayor.
- Negativas / deuda aceptada: ventana de staleness entre cambio de permisos y
  re-emisión de token; hasta la Fase 3, apex-ai sigue otorgando scopes fijos
  a todo JWT válido (ver plan, Fase 5).

## Referencias

- Plan maestro y fases: [docs/rbac-plan.md](../rbac-plan.md)
- Enforcement apex-ai actual: `apex-ai/shared/src/auth/mod.rs` (scopes),
  `apex-ai/shared/src/auth/supabase/verifier.rs` (JWKS)
- ADR-0003 (guards de tenant), ADR-0004 (esquema Postgres), ADR-0006 (claims)
