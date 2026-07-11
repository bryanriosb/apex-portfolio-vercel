import { z } from 'zod'

export interface LlmProvider {
  id: string
  business_account_id: string
  business_id: string
  provider: string
  has_api_key: boolean
  base_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateLlmProviderRequest {
  provider: string
  api_key: string
  base_url?: string
}

export interface UpdateLlmProviderRequest {
  api_key?: string
  base_url?: string
  is_active?: boolean
}

export interface LlmProviderOption {
  value: string
  label: string
  /** Base URL sugerido; se precarga en el formulario */
  baseUrl?: string
  /** true cuando el backend lo enruta por el cliente genérico OpenAI-compatible */
  requiresBaseUrl: boolean
}

// Providers con cliente nativo en el backend (agent_adk_runner_execution.rs);
// el base_url es opcional porque cada cliente tiene su URL por defecto
export const NATIVE_LLM_PROVIDERS: LlmProviderOption[] = [
  { value: 'openai', label: 'OpenAI', requiresBaseUrl: false },
  { value: 'anthropic', label: 'Anthropic', requiresBaseUrl: false },
  { value: 'gemini', label: 'Google Gemini', requiresBaseUrl: false },
  { value: 'groq', label: 'Groq', requiresBaseUrl: false },
  { value: 'deepseek', label: 'DeepSeek', requiresBaseUrl: false },
  { value: 'openrouter', label: 'OpenRouter', requiresBaseUrl: false },
  {
    value: 'ollama',
    label: 'Ollama',
    baseUrl: 'http://localhost:11434',
    requiresBaseUrl: false,
  },
]

// Providers con SDK propio en models.dev pero que el backend consume por su
// endpoint OpenAI-compatible (presets de adk-model/openai_compatible.rs)
const OPENAI_COMPATIBLE_EXTRAS: LlmProviderOption[] = [
  {
    value: 'deepinfra',
    label: 'DeepInfra',
    baseUrl: 'https://api.deepinfra.com/v1/openai',
    requiresBaseUrl: true,
  },
  {
    value: 'mistral',
    label: 'Mistral',
    baseUrl: 'https://api.mistral.ai/v1',
    requiresBaseUrl: true,
  },
  {
    value: 'xai',
    label: 'xAI',
    baseUrl: 'https://api.x.ai/v1',
    requiresBaseUrl: true,
  },
  {
    value: 'togetherai',
    label: 'Together AI',
    baseUrl: 'https://api.together.xyz/v1',
    requiresBaseUrl: true,
  },
  {
    value: 'perplexity',
    label: 'Perplexity',
    baseUrl: 'https://api.perplexity.ai',
    requiresBaseUrl: true,
  },
  {
    value: 'cerebras',
    label: 'Cerebras',
    baseUrl: 'https://api.cerebras.ai/v1',
    requiresBaseUrl: true,
  },
  {
    value: 'sambanova',
    label: 'SambaNova',
    baseUrl: 'https://api.sambanova.ai/v1',
    requiresBaseUrl: true,
  },
]

// Forma mínima de https://models.dev/api.json que necesitamos
export interface ModelsDevProviderIndex {
  [providerId: string]: {
    id: string
    name: string
    npm?: string
    api?: string
  }
}

/**
 * Combina los clientes nativos del backend con los providers de models.dev
 * cuya API es OpenAI-compatible (npm `@ai-sdk/openai-compatible` + base URL).
 */
export function buildLlmProviderOptions(
  modelsDevProviders?: ModelsDevProviderIndex
): { native: LlmProviderOption[]; compatible: LlmProviderOption[] } {
  const compatibleById = new Map<string, LlmProviderOption>(
    OPENAI_COMPATIBLE_EXTRAS.map((option) => [option.value, option])
  )

  const nativeIds = new Set(NATIVE_LLM_PROVIDERS.map((option) => option.value))

  for (const provider of Object.values(modelsDevProviders || {})) {
    if (nativeIds.has(provider.id) || compatibleById.has(provider.id)) continue
    if (provider.npm !== '@ai-sdk/openai-compatible' || !provider.api) continue

    compatibleById.set(provider.id, {
      value: provider.id,
      label: provider.name || provider.id,
      baseUrl: provider.api,
      requiresBaseUrl: true,
    })
  }

  const compatible = Array.from(compatibleById.values()).sort((a, b) =>
    a.label.localeCompare(b.label)
  )

  return { native: NATIVE_LLM_PROVIDERS, compatible }
}

export function findLlmProviderOption(
  options: { native: LlmProviderOption[]; compatible: LlmProviderOption[] },
  provider: string
): LlmProviderOption | undefined {
  return (
    options.native.find((option) => option.value === provider) ||
    options.compatible.find((option) => option.value === provider)
  )
}

export function getLlmProviderLabel(
  options: { native: LlmProviderOption[]; compatible: LlmProviderOption[] },
  provider: string
): string {
  return findLlmProviderOption(options, provider)?.label || provider
}

function isValidUrl(value: string): boolean {
  try {
    new URL(value)
    return true
  } catch {
    return false
  }
}

export function getLlmProviderFormSchema(params: {
  isEditing: boolean
  requiresBaseUrl: (provider: string) => boolean
}) {
  return z
    .object({
      provider: z.string().min(1, 'El proveedor es requerido'),
      api_key: params.isEditing
        ? z.string()
        : z.string().min(1, 'La API key es requerida'),
      base_url: z.string(),
      is_active: z.boolean(),
    })
    .superRefine((values, ctx) => {
      const baseUrl = values.base_url.trim()
      if (baseUrl && !isValidUrl(baseUrl)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['base_url'],
          message: 'Debe ser una URL válida',
        })
      }
      if (!baseUrl && values.provider && params.requiresBaseUrl(values.provider)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['base_url'],
          message: 'El base URL es requerido para providers OpenAI-compatible',
        })
      }
    })
}

export type LlmProviderFormValues = z.infer<
  ReturnType<typeof getLlmProviderFormSchema>
>

export function llmProviderToFormValues(
  provider: LlmProvider
): LlmProviderFormValues {
  return {
    provider: provider.provider,
    api_key: '',
    base_url: provider.base_url || '',
    is_active: provider.is_active,
  }
}

export function emptyLlmProviderFormValues(): LlmProviderFormValues {
  return {
    provider: '',
    api_key: '',
    base_url: '',
    is_active: true,
  }
}

export function buildCreateLlmProviderRequest(
  values: LlmProviderFormValues
): CreateLlmProviderRequest {
  return {
    provider: values.provider,
    api_key: values.api_key,
    base_url: values.base_url.trim() || undefined,
  }
}

export function buildUpdateLlmProviderRequest(
  values: LlmProviderFormValues
): UpdateLlmProviderRequest {
  return {
    // API key vacía conserva la clave actual encriptada
    api_key: values.api_key.trim() || undefined,
    base_url: values.base_url.trim() || undefined,
    is_active: values.is_active,
  }
}
