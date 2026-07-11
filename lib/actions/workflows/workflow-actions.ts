'use server'

import type { AxiosError } from 'axios'
import apiApexAiAuth from '@/lib/actions/api/apex-ai'
import type {
  WorkflowDefinition,
  CreateWorkflowDefinitionRequest,
  UpdateWorkflowDefinitionRequest,
} from '@/lib/models/workflows/workflow'

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

export async function listWorkflowsAction(
  params?: Record<string, any>
): Promise<WorkflowDefinition[]> {
  return handleApiCall(async () => {
    const response = await apiApexAiAuth.get('/agents/workflows', { params })
    return response.data.workflows || response.data || []
  })
}

export async function getWorkflowAction(
  id: string
): Promise<WorkflowDefinition> {
  return handleApiCall(async () => {
    const response = await apiApexAiAuth.get(`/agents/workflows/${id}`)
    return response.data
  })
}

export async function createWorkflowAction(
  data: CreateWorkflowDefinitionRequest
): Promise<WorkflowDefinition> {
  return handleApiCall(async () => {
    const response = await apiApexAiAuth.post('/agents/workflows', data)
    return response.data
  })
}

export async function updateWorkflowAction(
  id: string,
  data: UpdateWorkflowDefinitionRequest
): Promise<WorkflowDefinition> {
  return handleApiCall(async () => {
    const response = await apiApexAiAuth.patch(
      `/agents/workflows/${id}`,
      data
    )
    return response.data
  })
}

export async function deleteWorkflowAction(id: string): Promise<void> {
  return handleApiCall(async () => {
    await apiApexAiAuth.delete(`/agents/workflows/${id}`)
  })
}
