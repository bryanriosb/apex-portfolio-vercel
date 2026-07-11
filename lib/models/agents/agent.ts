import { z } from 'zod'

export interface Agent {
  id: string
  business_account_id: string
  business_id: string
  name: string
  description: string | null
  model_provider: string
  model_name: string
  api_key_ref: string | null
  has_custom_api_key: boolean
  base_url: string | null
  system_prompt: string
  max_loops: number
  is_active: boolean
  skill_tags: string[]
  enable_ui: boolean
  created_at: string
  updated_at: string
}

export interface CreateAgentRequest {
  name: string
  description?: string | null
  model_provider?: string
  model_name?: string
  api_key_ref?: string | null
  api_key?: string
  base_url?: string | null
  system_prompt: string
  max_loops?: number
  skill_tags?: string[]
  business_account_id?: string
  business_id?: string
  enable_ui?: boolean
}

export interface UpdateAgentRequest {
  name?: string
  description?: string | null
  model_provider?: string
  model_name?: string
  api_key_ref?: string | null
  api_key?: string
  base_url?: string | null
  system_prompt?: string
  max_loops?: number
  is_active?: boolean
  skill_tags?: string[]
  enable_ui?: boolean
}

export type AgentResponse = Agent

export const agentFormSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(120, 'Máximo 120 caracteres'),
  description: z.string().max(500, 'Máximo 500 caracteres').optional().nullable(),
  model_provider: z.string().min(1, 'El proveedor es requerido'),
  model_name: z.string().min(1, 'El nombre del modelo es requerido'),
  api_key: z.string().optional().nullable(),
  base_url: z.string().url('Debe ser una URL válida').optional().nullable(),
  system_prompt: z.string().min(1, 'El system prompt es requerido'),
  max_loops: z.number().min(1, 'Mínimo 1').max(10, 'Máximo 10'),
  skill_tags: z.array(z.string()).optional().nullable(),
  enable_ui: z.boolean(),
  is_active: z.boolean(),
})

export type AgentFormValues = z.infer<typeof agentFormSchema>
