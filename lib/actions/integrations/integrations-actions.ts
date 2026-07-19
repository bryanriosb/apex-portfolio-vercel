'use server'

import type { AxiosError } from 'axios'
import apiApexAiAuth from '@/lib/actions/api/apex-ai'
import { requireAccountAccess } from '@/lib/auth/tenant-guard'
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

// Headers handled by interceptor

/**
 * Resultado serializable de una server action. Las actions NUNCA lanzan:
 * Next.js censura en producción el mensaje de toda excepción lanzada desde
 * una server action (queda solo el digest genérico "An error occurred in the
 * Server Components render..."). El servicio desempaqueta en el cliente,
 * donde el throw sí conserva el mensaje hasta el toast.
 */
export type IntegrationActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string }

function extractApiError(error: unknown): string {
  const axiosError = error as AxiosError<{ error?: string; message?: string } | string>
  if (axiosError.response?.data) {
    const data = axiosError.response.data
    // Los 4xx de apex-ai pueden llegar como JSON {error|message} o texto plano.
    if (typeof data === 'string' && data) return data
    if (typeof data === 'object') {
      if (typeof data.error === 'string') return data.error
      if (typeof data.message === 'string') return data.message
    }
  }
  if (error instanceof Error) return error.message
  return 'Error inesperado en la operación'
}

async function handleApiCall<T>(
  call: () => Promise<T>
): Promise<IntegrationActionResult<T>> {
  try {
    return { ok: true, data: await call() }
  } catch (error) {
    return { ok: false, error: extractApiError(error) }
  }
}

export async function listConnectorsAction(
  accessToken: string,
  businessAccountId: string
): Promise<IntegrationActionResult<ListConnectorsResponse>> {
  return handleApiCall(async () => {
    // Defensa en profundidad: aunque apex-ai valida el JWT, sin sesión el
    // interceptor usaría el fallback APEX_AI_SECRET; se exige sesión y que
    // la cuenta solicitada pertenezca al tenant del usuario.
    await requireAccountAccess(businessAccountId)
    const response = await apiApexAiAuth.get('/integrations')
    return response.data
  })
}

export async function checkConnectorHealthAction(
  connectorName: string,
  accessToken: string,
  businessAccountId: string
): Promise<IntegrationActionResult<HealthCheckResponse>> {
  return handleApiCall(async () => {
    await requireAccountAccess(businessAccountId)
    const response = await apiApexAiAuth.get(
      `/integrations/${connectorName}/health`
    )
    return response.data
  })
}

export async function fetchConnectorRecordsAction(
  connectorName: string,
  body: ConnectorOperationRequest,
  accessToken: string,
  businessAccountId: string
): Promise<IntegrationActionResult<ConnectorOperationResponse>> {
  return handleApiCall(async () => {
    await requireAccountAccess(businessAccountId)
    const response = await apiApexAiAuth.post(
      `/integrations/${connectorName}`,
      body
    )
    return response.data
  })
}

export async function createConnectorRecordsAction(
  connectorName: string,
  body: ConnectorOperationRequest,
  accessToken: string,
  businessAccountId: string
): Promise<IntegrationActionResult<ConnectorOperationResponse>> {
  return handleApiCall(async () => {
    await requireAccountAccess(businessAccountId)
    const response = await apiApexAiAuth.put(
      `/integrations/${connectorName}`,
      body
    )
    return response.data
  })
}

export async function updateConnectorRecordsAction(
  connectorName: string,
  body: ConnectorOperationRequest,
  accessToken: string,
  businessAccountId: string
): Promise<IntegrationActionResult<ConnectorOperationResponse>> {
  return handleApiCall(async () => {
    await requireAccountAccess(businessAccountId)
    const response = await apiApexAiAuth.patch(
      `/integrations/${connectorName}`,
      body
    )
    return response.data
  })
}

export async function deleteConnectorRecordsAction(
  connectorName: string,
  body: ConnectorOperationRequest,
  accessToken: string,
  businessAccountId: string
): Promise<IntegrationActionResult<ConnectorOperationResponse>> {
  return handleApiCall(async () => {
    await requireAccountAccess(businessAccountId)
    const response = await apiApexAiAuth.delete(
      `/integrations/${connectorName}`,
      {
        data: body,
      }
    )
    return response.data
  })
}

export async function listIntegrationConfigsAction(
  accessToken: string,
  businessAccountId: string
): Promise<IntegrationActionResult<IntegrationConfig[]>> {
  return handleApiCall(async () => {
    await requireAccountAccess(businessAccountId)
    const response = await apiApexAiAuth.get('/integrations/config')
    return response.data.integrations || []
  })
}

export async function getIntegrationConfigAction(
  id: string,
  accessToken: string,
  businessAccountId: string
): Promise<IntegrationActionResult<IntegrationConfig>> {
  return handleApiCall(async () => {
    await requireAccountAccess(businessAccountId)
    const response = await apiApexAiAuth.get(`/integrations/config/${id}`)
    return response.data
  })
}

export async function createIntegrationConfigAction(
  data: IntegrationConfigInsert,
  accessToken: string,
  businessAccountId: string
): Promise<IntegrationActionResult<IntegrationConfig>> {
  return handleApiCall(async () => {
    await requireAccountAccess(businessAccountId)
    const response = await apiApexAiAuth.post('/integrations/config', data)
    return response.data
  })
}

export async function updateIntegrationConfigAction(
  id: string,
  data: IntegrationConfigUpdate,
  accessToken: string,
  businessAccountId: string
): Promise<IntegrationActionResult<IntegrationConfig>> {
  return handleApiCall(async () => {
    await requireAccountAccess(businessAccountId)
    const response = await apiApexAiAuth.patch(
      `/integrations/config/${id}`,
      data
    )
    return response.data
  })
}

export async function deleteIntegrationConfigAction(
  id: string,
  accessToken: string,
  businessAccountId: string
): Promise<IntegrationActionResult<void>> {
  return handleApiCall(async () => {
    await requireAccountAccess(businessAccountId)
    await apiApexAiAuth.delete(`/integrations/config/${id}`)
  })
}
