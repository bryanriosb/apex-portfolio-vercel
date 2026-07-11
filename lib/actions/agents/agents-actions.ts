'use server'

import type { AxiosError } from 'axios'
import apiApexAiAuth from '@/lib/actions/api/apex-ai'
import type {
  Agent,
  CreateAgentRequest,
  UpdateAgentRequest,
} from '@/lib/models/agents/agent'

function extractApiError(error: unknown): string {
  const axiosError = error as AxiosError<{ error?: string; message?: string }>
  if (axiosError.response?.data) {
    const data = axiosError.response.data
    if (typeof data.error === 'string') return data.error
    if (typeof data.message === 'string') return data.message
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

export async function listAgentsAction(
  params?: Record<string, any>
): Promise<Agent[]> {
  return handleApiCall(async () => {
    const response = await apiApexAiAuth.get('/agents', { params })
    return response.data.agents || response.data || []
  })
}

export async function getAgentAction(id: string): Promise<Agent> {
  return handleApiCall(async () => {
    const response = await apiApexAiAuth.get(`/agents/${id}`)
    return response.data
  })
}

export async function createAgentAction(
  data: CreateAgentRequest
): Promise<Agent> {
  return handleApiCall(async () => {
    const response = await apiApexAiAuth.post('/agents', data)
    return response.data
  })
}

export async function updateAgentAction(
  id: string,
  data: UpdateAgentRequest
): Promise<Agent> {
  return handleApiCall(async () => {
    const response = await apiApexAiAuth.patch(`/agents/${id}`, data)
    return response.data
  })
}

export async function deleteAgentAction(id: string): Promise<void> {
  return handleApiCall(async () => {
    await apiApexAiAuth.delete(`/agents/${id}`)
  })
}
