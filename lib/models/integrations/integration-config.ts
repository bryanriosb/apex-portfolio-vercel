import { z } from 'zod'

export interface IntegrationConfig {
  id: string
  business_account_id: string
  business_id: string
  name: string
  description: string | null
  connector_id: string
  scope: 'Account' | 'Business'
  is_active: boolean
  config_json: string
  created_at: string
  updated_at: string
}

export interface IntegrationConfigInsert {
  name: string
  description?: string | null
  connector_id: string
  scope: 'Account' | 'Business'
  config_json: string
}

export interface IntegrationConfigUpdate {
  name?: string
  description?: string | null
  connector_id?: string
  scope?: 'Account' | 'Business'
  is_active?: boolean
  config_json?: string
}

export const integrationConfigFormSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(120, 'Máximo 120 caracteres'),
  description: z.string().max(500, 'Máximo 500 caracteres').optional().nullable(),
  connector_id: z.string().min(1, 'Selecciona un conector'),
  scope: z.enum(['Account', 'Business']),
  is_active: z.boolean(),
  config_json: z
    .string()
    .min(1, 'La configuración JSON es requerida')
    .refine(
      (value) => {
        try {
          JSON.parse(value)
          return true
        } catch {
          return false
        }
      },
      { message: 'Debe ser un JSON válido' }
    ),
  config_data: z.any().optional(),
})

export type IntegrationConfigFormValues = z.infer<typeof integrationConfigFormSchema>

export interface ConnectorOperationBase {
  table: string
}

export interface ConnectorFetchRequest extends ConnectorOperationBase {
  batch_size?: number
  limit?: number
  order?: string
  offset?: number
  filters?: Record<string, unknown>
}

export interface ConnectorCreateRequest extends ConnectorOperationBase {
  records: Record<string, unknown>[]
  batch_size?: number
}

export interface ConnectorUpdateRequest extends ConnectorOperationBase {
  ids: string[]
  data: Record<string, unknown>
}

export interface ConnectorDeleteRequest extends ConnectorOperationBase {
  ids: string[]
}

export type ConnectorOperationRequest =
  | ConnectorFetchRequest
  | ConnectorCreateRequest
  | ConnectorUpdateRequest
  | ConnectorDeleteRequest
