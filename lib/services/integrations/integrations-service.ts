import {
  listConnectorsAction,
  checkConnectorHealthAction,
  fetchConnectorRecordsAction,
  createConnectorRecordsAction,
  updateConnectorRecordsAction,
  deleteConnectorRecordsAction,
  listIntegrationConfigsAction,
  getIntegrationConfigAction,
  createIntegrationConfigAction,
  updateIntegrationConfigAction,
  deleteIntegrationConfigAction,
  type IntegrationActionResult,
} from '@/lib/actions/integrations/integrations-actions'
import type {
  IntegrationConfig,
  IntegrationConfigInsert,
  IntegrationConfigUpdate,
  ConnectorOperationRequest,
} from '@/lib/models/integrations/integration-config'
import type {
  ListConnectorsResponse,
  HealthCheckResponse,
  ConnectorOperationResponse,
} from '@/lib/services/integrations/integrations-types'

/**
 * Desempaqueta el result en el CLIENTE: aquí el throw sí conserva el mensaje
 * (la censura de producción de Next.js solo afecta a excepciones lanzadas
 * dentro de la server action).
 */
function unwrap<T>(result: IntegrationActionResult<T>): T {
  if (!result.ok) throw new Error(result.error)
  return result.data
}

export class IntegrationsService {
  private accessToken: string
  private businessAccountId: string

  constructor(accessToken: string, businessAccountId: string) {
    this.accessToken = accessToken
    this.businessAccountId = businessAccountId
  }

  async listConnectors(): Promise<ListConnectorsResponse> {
    return unwrap(await listConnectorsAction(this.accessToken, this.businessAccountId))
  }

  async checkHealth(connectorName: string): Promise<HealthCheckResponse> {
    return unwrap(await checkConnectorHealthAction(
      connectorName,
      this.accessToken,
      this.businessAccountId
    ))
  }

  async fetchRecords(
    connectorName: string,
    body: ConnectorOperationRequest
  ): Promise<ConnectorOperationResponse> {
    return unwrap(await fetchConnectorRecordsAction(
      connectorName,
      body,
      this.accessToken,
      this.businessAccountId
    ))
  }

  async createRecords(
    connectorName: string,
    body: ConnectorOperationRequest
  ): Promise<ConnectorOperationResponse> {
    return unwrap(await createConnectorRecordsAction(
      connectorName,
      body,
      this.accessToken,
      this.businessAccountId
    ))
  }

  async updateRecords(
    connectorName: string,
    body: ConnectorOperationRequest
  ): Promise<ConnectorOperationResponse> {
    return unwrap(await updateConnectorRecordsAction(
      connectorName,
      body,
      this.accessToken,
      this.businessAccountId
    ))
  }

  async deleteRecords(
    connectorName: string,
    body: ConnectorOperationRequest
  ): Promise<ConnectorOperationResponse> {
    return unwrap(await deleteConnectorRecordsAction(
      connectorName,
      body,
      this.accessToken,
      this.businessAccountId
    ))
  }

  async listConfigs(): Promise<IntegrationConfig[]> {
    return unwrap(await listIntegrationConfigsAction(this.accessToken, this.businessAccountId))
  }

  async getConfig(id: string): Promise<IntegrationConfig> {
    return unwrap(await getIntegrationConfigAction(
      id,
      this.accessToken,
      this.businessAccountId
    ))
  }

  async createConfig(data: IntegrationConfigInsert): Promise<IntegrationConfig> {
    return unwrap(await createIntegrationConfigAction(
      data,
      this.accessToken,
      this.businessAccountId
    ))
  }

  async updateConfig(
    id: string,
    data: IntegrationConfigUpdate
  ): Promise<IntegrationConfig> {
    return unwrap(await updateIntegrationConfigAction(
      id,
      data,
      this.accessToken,
      this.businessAccountId
    ))
  }

  async deleteConfig(id: string): Promise<void> {
    return unwrap(await deleteIntegrationConfigAction(
      id,
      this.accessToken,
      this.businessAccountId
    ))
  }
}
