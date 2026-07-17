'use server'

import type { AxiosError } from 'axios'
import apiApexAiAuth from '@/lib/actions/api/apex-ai'
import type {
  CreateToolDefinitionRequest,
  PatchToolDefinitionRequest,
  ToolDefinition,
  UpdateToolDefinitionRequest,
} from '@/lib/models/agents/tool'
import type { ToolWithAuthStatus } from '@/lib/types/oauth2-types'

function extractApiError(error: unknown): string {
  const axiosError = error as AxiosError<
    { error?: string; message?: string } | string
  >
  if (axiosError.response?.data) {
    const data = axiosError.response.data
    // Los 401 del middleware de apex-ai llegan como texto plano
    // ("Authentication failed: ..."), no como JSON.
    if (typeof data === 'string' && data) return data
    if (typeof data === 'object') {
      if (typeof data.error === 'string') return data.error
      if (typeof data.message === 'string') return data.message
    }
  }
  if (error instanceof Error) return error.message
  return 'Error inesperado en la operación'
}

async function handleApiCall<T>(call: () => Promise<T>): Promise<T> {
  try {
    return await call()
  } catch (error) {
    throw new Error(extractApiError(error))
  }
}

export async function listToolsAction(): Promise<ToolDefinition[]> {
  return handleApiCall(async () => {
    const response = await apiApexAiAuth.get('/agents/tools')
    return response.data || []
  })
}

export async function getToolAction(id: string): Promise<ToolDefinition> {
  return handleApiCall(async () => {
    const response = await apiApexAiAuth.get(`/agents/tools/${id}`)
    return response.data
  })
}

export async function createToolAction(
  data: CreateToolDefinitionRequest
): Promise<ToolDefinition> {
  return handleApiCall(async () => {
    const response = await apiApexAiAuth.post('/agents/tools', data)
    return response.data
  })
}

export async function updateToolAction(
  id: string,
  data: UpdateToolDefinitionRequest
): Promise<ToolDefinition> {
  return handleApiCall(async () => {
    const response = await apiApexAiAuth.put(`/agents/tools/${id}`, data)
    return response.data
  })
}

export async function patchToolAction(
  id: string,
  data: PatchToolDefinitionRequest
): Promise<void> {
  return handleApiCall(async () => {
    await apiApexAiAuth.patch(`/agents/tools/${id}`, data)
  })
}

export async function deleteToolAction(id: string): Promise<void> {
  return handleApiCall(async () => {
    await apiApexAiAuth.delete(`/agents/tools/${id}`)
  })
}

export async function listAgentToolsAction(
  agentId: string,
  params: { user_id: string; business_account_id: string }
): Promise<ToolWithAuthStatus[]> {
  return handleApiCall(async () => {
    const response = await apiApexAiAuth.get(`/agents/${agentId}/tools`, {
      params,
    })
    return response.data.tools || []
  })
}

export async function mapToolToAgentAction(
  agentId: string,
  toolId: string
): Promise<void> {
  return handleApiCall(async () => {
    await apiApexAiAuth.post(`/agents/${agentId}/tools/${toolId}`)
  })
}

export async function unmapToolFromAgentAction(
  agentId: string,
  toolId: string
): Promise<void> {
  return handleApiCall(async () => {
    await apiApexAiAuth.delete(`/agents/${agentId}/tools/${toolId}`)
  })
}
