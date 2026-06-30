import type { IntegrationConfig } from '@/lib/models/integrations/integration-config'

export interface ListConnectorsResponse {
  connectors: string[]
}

export interface HealthCheckResponse {
  connector: string
  healthy: boolean
  message: string
}

export interface ConnectorOperationResponse {
  connector?: string
  resource?: string
  records?: Record<string, unknown>[]
  count?: number
  status?: string
  affected_ids?: string[]
  errors?: string[]
  duration_ms?: number
}

export interface ListIntegrationConfigsResponse {
  integrations: IntegrationConfig[]
}
