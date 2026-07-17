# ADR-0006: Emisión de claims RBAC en el JWT y scopes para apex-ai

- **Estado**: propuesto
- **Fecha**: 2026-07-14
- **Decisores**: Bryan Rios
- **Historia técnica**: [docs/rbac-plan.md](../rbac-plan.md) — Fases 3 y 5

## Contexto y problema

Hoy los claims de autorización viajan en `user_metadata` (editable por el
propio usuario) y apex-ai otorga los mismos tres scopes (`agents:read`,
`agents:execute`, `tools:execute`) a **todo** JWT de Supabase válido
(`shared/src/auth/mod.rs`), y a toda API key. Con el modelo RBAC de
ADR-0004 materializado, falta el puente decidido en ADR-0002: que el token
lleve la autorización real del usuario y que apex-ai la respete sin conocer
roles.

## Decision drivers

- Los claims de autorización deben ser firmados y no editables por el
  usuario (hoy `user_metadata` lo es).
- apex-ai debe seguir siendo agnóstico del IdP (PaaS): solo scopes + tenant.
- El JWT no puede crecer sin límite: no incluir la lista completa de
  permisos finos.
- Cambios de permisos deben poder invalidar cachés (staleness acotada).

## Opciones consideradas

1. apex-ai consulta `rbac_authorize()` en Supabase por request.
2. Lista completa de permisos dentro del JWT.
3. **Custom Access Token Hook de Supabase**: al emitir el token se inyectan
   rol activo, `business_account_id`, `business_id`, los **scopes gruesos**
   derivados de los permisos RBAC y una `perm_version`; apex-ai lee el claim
   de scopes con fallback deny.

## Decisión (propuesta)

Opción elegida: **3 — token hook + scopes en claims**.

- **Fase 3 (apex-ui/Supabase)**: función Postgres registrada como Custom
  Access Token Hook; deriva los scopes desde `rbac_get_user_permissions()`
  (mapeo permiso→scope, p. ej. `agent.execute` → `agents:execute`); `GRANT
  EXECUTE` de las funciones RBAC a `supabase_auth_admin`; migrar la
  verificación de rol de sesión en apex-ui a estos claims y abandonar
  `user_metadata` como fuente de autorización.
- **Fase 5 (apex-ai)**: `authenticate_jwt` lee el claim `scopes` (sin claim
  → sin scopes → 403) en lugar de otorgar los tres fijos; API keys con
  columnas `scopes` y binding a `business_account_id`/`business_id`;
  granularizar scopes por router (`workflows:execute`, `sessions:read`,
  `memory:search`, `integrations:manage`); JWKS URL, issuer y nombres de
  claims (`tenant_claim`, `scopes_claim`) configurables por entorno para
  IdPs externos.

### Pros y contras de las opciones

#### Opción 1 — Lookup por request

- Bueno: consistencia inmediata.
- Malo: acopla apex-ai a Postgres de la plataforma (rompe ADR-0002) y añade
  latencia en el hot path de agentes.

#### Opción 2 — Permisos completos en el JWT

- Bueno: sin mapeo adicional.
- Malo: el token crece con el catálogo (~50 códigos y subiendo); expone el
  modelo interno a cualquier consumidor del token.

#### Opción 3 — Hook + scopes gruesos (elegida)

- Bueno: claims firmados, token acotado, apex-ai agnóstico; `perm_version`
  permite invalidar cachés al cambiar permisos.
- Malo: staleness hasta renovar el token (access tokens de Supabase ~1 h,
  con rotación server-side ya implementada en `const/auth.ts`); mapeo
  permiso→scope como pieza nueva a mantener.

## Consecuencias

- Positivas: se elimina `user_metadata` como fuente de autorización (cierre
  del hallazgo 4 del plan); un `business_monitor` deja de poder ejecutar
  agentes en apex-ai; historia PaaS completa (IdP externo = JWKS + mapeo).
- Negativas / deuda aceptada: ventana de staleness aceptada y documentada;
  coordinación de despliegue en dos servicios (hook primero con fallback,
  luego apex-ai en modo estricto).

## Referencias

- ADR-0002 (decisión de arquitectura que este ADR materializa)
- apex-ai: `shared/src/auth/mod.rs` (asignación de scopes),
  `shared/src/auth/supabase/verifier.rs` (JWKS),
  `shared/src/auth/supabase/business_resolver.rs` (contexto de tenant)
- Rotación de tokens en apex-ui: `const/auth.ts` (callback `jwt`)
