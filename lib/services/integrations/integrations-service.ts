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

export class IntegrationsService {
  private accessToken: string
  private businessAccountId: string

  constructor(accessToken: string, businessAccountId: string) {
    this.accessToken = accessToken
    this.businessAccountId = businessAccountId
  }

  async listConnectors(): Promise<ListConnectorsResponse> {
    return listConnectorsAction(this.accessToken, this.businessAccountId)
  }

  async checkHealth(connectorName: string): Promise<HealthCheckResponse> {
    return checkConnectorHealthAction(
      connectorName,
      this.accessToken,
      this.businessAccountId
    )
  }

  async fetchRecords(
    connectorName: string,
    body: ConnectorOperationRequest
  ): Promise<ConnectorOperationResponse> {
    return fetchConnectorRecordsAction(
      connectorName,
      body,
      this.accessToken,
      this.businessAccountId
    )
  }

  async createRecords(
    connectorName: string,
    body: ConnectorOperationRequest
  ): Promise<ConnectorOperationResponse> {
    return createConnectorRecordsAction(
      connectorName,
      body,
      this.accessToken,
      this.businessAccountId
    )
  }

  async updateRecords(
    connectorName: string,
    body: ConnectorOperationRequest
  ): Promise<ConnectorOperationResponse> {
    return updateConnectorRecordsAction(
      connectorName,
      body,
      this.accessToken,
      this.businessAccountId
    )
  }

  async deleteRecords(
    connectorName: string,
    body: ConnectorOperationRequest
  ): Promise<ConnectorOperationResponse> {
    return deleteConnectorRecordsAction(
      connectorName,
      body,
      this.accessToken,
      this.businessAccountId
    )
  }

  async listConfigs(): Promise<IntegrationConfig[]> {
    return listIntegrationConfigsAction(this.accessToken, this.businessAccountId)
  }

  async getConfig(id: string): Promise<IntegrationConfig> {
    return getIntegrationConfigAction(
      id,
      this.accessToken,
      this.businessAccountId
    )
  }

  async createConfig(data: IntegrationConfigInsert): Promise<IntegrationConfig> {
    return createIntegrationConfigAction(
      data,
      this.accessToken,
      this.businessAccountId
    )
  }

  async updateConfig(
    id: string,
    data: IntegrationConfigUpdate
  ): Promise<IntegrationConfig> {
    return updateIntegrationConfigAction(
      id,
      data,
      this.accessToken,
      this.businessAccountId
    )
  }

  async deleteConfig(id: string): Promise<void> {
    return deleteIntegrationConfigAction(
      id,
      this.accessToken,
      this.businessAccountId
    )
  }
}
