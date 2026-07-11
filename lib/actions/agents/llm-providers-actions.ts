'use server'

import type { AxiosError } from 'axios'
import apiApexAiAuth from '@/lib/actions/api/apex-ai'
import type {
  CreateLlmProviderRequest,
  LlmProvider,
  UpdateLlmProviderRequest,
} from '@/lib/models/agents/llm-provider'

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

export async function listLlmProvidersAction(): Promise<LlmProvider[]> {
  return handleApiCall(async () => {
    const response = await apiApexAiAuth.get('/agents/llm-providers')
    return response.data || []
  })
}

export async function getLlmProviderAction(id: string): Promise<LlmProvider> {
  return handleApiCall(async () => {
    const response = await apiApexAiAuth.get(`/agents/llm-providers/${id}`)
    return response.data
  })
}

export async function createLlmProviderAction(
  data: CreateLlmProviderRequest
): Promise<LlmProvider> {
  return handleApiCall(async () => {
    const response = await apiApexAiAuth.post('/agents/llm-providers', data)
    return response.data
  })
}

export async function updateLlmProviderAction(
  id: string,
  data: UpdateLlmProviderRequest
): Promise<LlmProvider> {
  return handleApiCall(async () => {
    const response = await apiApexAiAuth.put(
      `/agents/llm-providers/${id}`,
      data
    )
    return response.data
  })
}

export async function deleteLlmProviderAction(id: string): Promise<void> {
  return handleApiCall(async () => {
    await apiApexAiAuth.delete(`/agents/llm-providers/${id}`)
  })
}
