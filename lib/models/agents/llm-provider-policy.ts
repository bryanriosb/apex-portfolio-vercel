/**
 * Política de proveedores LLM por cuenta (tenant).
 *
 * El flag `block_apex_llm_providers` vive en `business_accounts.settings`
 * (JSONB en Supabase). Cuando está activo, los selectores solo ofrecen los
 * proveedores globales configurados por la cuenta en la sección de settings;
 * los defaults de plataforma ("Apex") quedan ocultos.
 */

/** Ruta de administración de proveedores LLM globales de la cuenta. */
export const LLM_PROVIDERS_ROUTE = '/admin/agentic/settings/llm-providers'

/** Clave dentro de `business_accounts.settings`. */
export const BLOCK_APEX_PROVIDERS_KEY = 'block_apex_llm_providers'

/**
 * Coacciona el valor almacenado a booleano. Acepta tanto `true` como la
 * cadena `"true"` (el JSON puede guardarse de cualquiera de las dos formas).
 */
export function isApexProvidersBlocked(
  settings: Record<string, unknown> | null | undefined
): boolean {
  const raw = settings?.[BLOCK_APEX_PROVIDERS_KEY]
  if (typeof raw === 'boolean') return raw
  if (typeof raw === 'string') return raw.trim().toLowerCase() === 'true'
  return false
}
