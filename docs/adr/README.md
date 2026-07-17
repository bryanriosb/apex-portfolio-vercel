# Architecture Decision Records — APEX UI

Registro de decisiones de arquitectura (ADR) de la plataforma APEX.

## Convención

- **Formato**: [MADR 4.0](https://adr.github.io/madr/) (Markdown Any Decision
  Records), en español.
- **Nombrado**: `NNNN-titulo-en-kebab-case.md`, numeración secuencial
  inmutable (un ADR nunca se renumera ni se borra).
- **Estados**: `propuesto` → `aceptado` | `rechazado`; un ADR aceptado solo
  cambia a `deprecado` o `sustituido por ADR-XXXX`. Las decisiones no se
  editan retroactivamente: se sustituyen con un ADR nuevo.
- **Alcance**: un ADR por decisión significativa. Cuando una iniciativa
  agrupa varias decisiones cohesionadas (como el ADR-0001), cada decisión
  interna se documenta con sus opciones consideradas y justificación propia.
- **Plantilla**: [adr-template.md](adr-template.md).

## Índice

| ADR | Título | Estado | Fecha |
| --- | --- | --- | --- |
| [0001](0001-dashboard-cartera-arquitectura.md) | Arquitectura del dashboard de cartera (Indicadores + Recaudo) | aceptado | 2026-07-14 |
| [0002](0002-modelo-rbac-unico-doble-enforcement.md) | Modelo RBAC único con doble punto de enforcement (apex-ui / apex-ai) | aceptado | 2026-07-14 |
| [0003](0003-tenant-desde-sesion-guards-fail-closed.md) | Tenant derivado de la sesión y guards fail-closed en server actions | aceptado | 2026-07-14 |
| [0004](0004-esquema-rbac-postgres.md) | Esquema RBAC en Supabase Postgres con RPC SECURITY DEFINER | aceptado | 2026-07-14 |
| [0005](0005-anti-escalacion-gobernanza-roles.md) | Anti-escalación de privilegios y gobernanza de roles/permisos | aceptado | 2026-07-14 |
| [0006](0006-claims-scopes-jwt-apex-ai.md) | Emisión de claims RBAC en el JWT y scopes para apex-ai | propuesto | 2026-07-14 |
