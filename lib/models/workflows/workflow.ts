import { z } from 'zod'

// --- Graph JSON Types ---

export interface InputMapperConfig {
  field: string
  template?: string
}

export interface OutputMapperConfig {
  field: string
  extract: string
}

export interface GraphNodeAgent {
  type: 'agent'
  id: string
  agent_id: string
  input_mapper?: InputMapperConfig
  output_mapper?: OutputMapperConfig
  interrupt_before?: boolean
  interrupt_after?: boolean
  enable_ui?: boolean
  stream?: boolean
}

export interface GraphNodeFunction {
  type: 'function'
  id: string
  logic: string
  config?: Record<string, unknown>
  interrupt_before?: boolean
  interrupt_after?: boolean
}

export type GraphNode = GraphNodeAgent | GraphNodeFunction

export interface GraphEdge {
  from: string
  to: string
}

export interface ConditionalEdge {
  from: string
  route_by_field: string
  routes: Record<string, string>
}

export interface GraphConfig {
  recursion_limit?: number
  checkpoint?: string | null
  positions?: Record<string, { x: number; y: number }>
}

export interface GraphDefinition {
  channels: string[]
  nodes: GraphNode[]
  edges: GraphEdge[]
  conditional_edges: ConditionalEdge[]
  config?: GraphConfig
}

// --- Workflow Definition ---

export interface WorkflowDefinition {
  id: string
  business_account_id: string
  business_id: string
  name: string
  description: string
  graph_json: GraphDefinition
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateWorkflowDefinitionRequest {
  name: string
  description: string
  graph_json: GraphDefinition
}

export interface UpdateWorkflowDefinitionRequest {
  name?: string
  description?: string
  graph_json?: GraphDefinition
  is_active?: boolean
}

// --- Zod Schema ---

const inputMapperSchema = z.object({
  field: z.string().min(1, 'El campo es requerido'),
  template: z.string().optional(),
})

const outputMapperSchema = z.object({
  field: z.string().min(1, 'El campo es requerido'),
  extract: z.string().min(1, 'La estrategia de extracción es requerida'),
})

const graphNodeSchema = z.union([
  z.object({
    type: z.literal('agent'),
    id: z.string().min(1),
    agent_id: z.string().min(1, 'El agente es requerido'),
    input_mapper: inputMapperSchema.optional(),
    output_mapper: outputMapperSchema.optional(),
    interrupt_before: z.boolean().optional(),
    interrupt_after: z.boolean().optional(),
    enable_ui: z.boolean().optional(),
    stream: z.boolean().optional(),
  }),
  z.object({
    type: z.literal('function'),
    id: z.string().min(1),
    logic: z.string().min(1, 'La lógica es requerida'),
    config: z.record(z.string(), z.unknown()).optional(),
    interrupt_before: z.boolean().optional(),
    interrupt_after: z.boolean().optional(),
  }),
])

const graphEdgeSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
})

const conditionalEdgeSchema = z.object({
  from: z.string().min(1),
  route_by_field: z.string().min(1),
  routes: z.record(z.string(), z.string()),
})

const graphConfigSchema = z.object({
  recursion_limit: z.number().min(1).max(100).optional(),
  checkpoint: z.string().nullable().optional(),
  positions: z.record(z.string(), z.object({ x: z.number(), y: z.number() })).optional(),
})

const graphDefinitionSchema = z.object({
  channels: z.array(z.string()),
  nodes: z.array(graphNodeSchema),
  edges: z.array(graphEdgeSchema),
  conditional_edges: z.array(conditionalEdgeSchema),
  config: graphConfigSchema.optional(),
})

export const workflowFormSchema = z.object({
  name: z
    .string()
    .min(1, 'El nombre es requerido')
    .max(120, 'Máximo 120 caracteres'),
  description: z
    .string()
    .min(1, 'La descripción es requerida')
    .max(500, 'Máximo 500 caracteres'),
  graph_json: graphDefinitionSchema,
})

export type WorkflowFormValues = z.infer<typeof workflowFormSchema>
