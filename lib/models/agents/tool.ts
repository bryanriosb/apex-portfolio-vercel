import { z } from 'zod'

export interface ToolDefinition {
  id: string
  name: string
  description: string
  module: string
  tool_type: string
  url: string
  schema_json: Record<string, any>
  execution_config: Record<string, any>
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateToolDefinitionRequest {
  name: string
  tool_type: string
  execution_config: Record<string, any>
  description?: string
  schema_json?: Record<string, any>
  module?: string
  is_active?: boolean
}

export interface UpdateToolDefinitionRequest {
  name: string
  url: string
  tool_type: string
  execution_config: Record<string, any>
  description?: string
  schema_json?: Record<string, any>
}

export interface PatchToolDefinitionRequest {
  is_active?: boolean
  name?: string
  description?: string
  tool_type?: string
  execution_config?: Record<string, any>
  schema_json?: Record<string, any>
}

// McpLocal/McpRemote se gestionan en Conectores (/admin/agentic/connectors)
export const MANAGEABLE_TOOL_TYPES = [
  'Function',
  'Integration',
  'IntegrationService',
  'Notification',
  'Ontology',
  'Artifact',
] as const

export type ManageableToolType = (typeof MANAGEABLE_TOOL_TYPES)[number]

export const FUNCTION_LANGUAGES = ['JavaScript', 'Rust'] as const
export type FunctionLanguage = (typeof FUNCTION_LANGUAGES)[number]

export const DEFAULT_FUNCTION_TIMEOUT_MS = 5000
export const DEFAULT_SCHEMA_JSON = `{
  "type": "object",
  "properties": {},
  "required": []
}`

function isJsonObject(text: string): boolean {
  try {
    const parsed = JSON.parse(text)
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
  } catch {
    return false
  }
}

export const toolFormSchema = z
  .object({
    name: z
      .string()
      .min(1, 'El nombre es requerido')
      .max(120, 'Máximo 120 caracteres'),
    description: z.string().max(500, 'Máximo 500 caracteres').optional(),
    tool_type: z.enum(MANAGEABLE_TOOL_TYPES, {
      message: 'El tipo es requerido',
    }),
    is_active: z.boolean(),
    language: z.enum(FUNCTION_LANGUAGES),
    timeout_ms: z.number().min(100, 'Mínimo 100 ms').max(300000, 'Máximo 300000 ms'),
    source_code: z.string(),
    execution_config_json: z.string(),
    schema_json: z.string(),
  })
  .superRefine((values, ctx) => {
    if (values.tool_type === 'Function') {
      if (!values.source_code.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['source_code'],
          message: 'El código fuente es requerido',
        })
      }
    } else if (!isJsonObject(values.execution_config_json)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['execution_config_json'],
        message: 'Debe ser un objeto JSON válido',
      })
    }

    if (values.schema_json.trim() && !isJsonObject(values.schema_json)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['schema_json'],
        message: 'Debe ser un objeto JSON Schema válido',
      })
    }
  })

export type ToolFormValues = z.infer<typeof toolFormSchema>

export function buildExecutionConfig(
  values: ToolFormValues
): Record<string, any> {
  if (values.tool_type === 'Function') {
    return {
      backend: 'ProcessBackend',
      language: values.language,
      source_code: values.source_code,
      timeout_ms: values.timeout_ms,
    }
  }
  return JSON.parse(values.execution_config_json)
}

export function parseSchemaJson(values: ToolFormValues): Record<string, any> {
  return values.schema_json.trim() ? JSON.parse(values.schema_json) : {}
}

export function toolToFormValues(tool: ToolDefinition): ToolFormValues {
  const config = tool.execution_config || {}
  const isFunction = tool.tool_type === 'Function'
  return {
    name: tool.name,
    description: tool.description || '',
    tool_type: (MANAGEABLE_TOOL_TYPES.includes(tool.tool_type as ManageableToolType)
      ? tool.tool_type
      : 'Function') as ManageableToolType,
    is_active: tool.is_active,
    // El backend interpreta cualquier valor distinto de JavaScript (o vacío) como Rust
    language: /^javascript$/i.test(config.language || '')
      ? 'JavaScript'
      : 'Rust',
    timeout_ms:
      typeof config.timeout_ms === 'number'
        ? config.timeout_ms
        : DEFAULT_FUNCTION_TIMEOUT_MS,
    source_code: isFunction ? config.source_code || '' : '',
    execution_config_json: isFunction
      ? '{}'
      : JSON.stringify(config, null, 2),
    schema_json: JSON.stringify(tool.schema_json || {}, null, 2),
  }
}

export function emptyToolFormValues(): ToolFormValues {
  return {
    name: '',
    description: '',
    tool_type: 'Function',
    is_active: true,
    language: 'JavaScript',
    timeout_ms: DEFAULT_FUNCTION_TIMEOUT_MS,
    source_code: '',
    execution_config_json: '{}',
    schema_json: DEFAULT_SCHEMA_JSON,
  }
}
