'use server'

import type { AxiosError } from 'axios'
import apiApexAiAuth from '@/lib/actions/api/apex-ai'
import { requireUser, requireBusinessAccess } from '@/lib/auth/tenant-guard'
import type {
  CollectionSyncPayload,
  EnqueueJobRequest,
  SyncEnqueueResponse,
  SyncProgressResponse,
  JobRecord
} from '@/lib/models/collection/sync-jobs'

// Headers handled by interceptor

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

export async function listSyncJobsAction(
  businessId: string,
  accessToken: string
): Promise<JobRecord[]> {
  await requireBusinessAccess(businessId)

  return handleApiCall(async () => {
    // The endpoint uses query params: ?module=collection
    const response = await apiApexAiAuth.get('/jobs', {
      params: {
        module: 'collection',
      },
    })
    return response.data.jobs || []
  })
}

export async function createImmediateSyncAction(
  payload: CollectionSyncPayload,
  accessToken: string,
  businessAccountId: string
): Promise<SyncEnqueueResponse> {
  // `businessAccountId` puede ser un connector_id (ver SyncJobsService); el
  // backend resuelve el tenant desde el JWT de sesión, por lo que aquí solo
  // se exige sesión válida (evita el fallback a APEX_AI_SECRET sin usuario).
  await requireUser()

  return handleApiCall(async () => {
    const response = await apiApexAiAuth.post('/collections/sync', payload)
    return response.data
  })
}

export async function createScheduledSyncAction(
  payload: EnqueueJobRequest,
  accessToken: string
): Promise<SyncEnqueueResponse> {
  await requireBusinessAccess(payload.business_id)

  return handleApiCall(async () => {
    const response = await apiApexAiAuth.post('/jobs', payload)
    return response.data
  })
}

export async function getSyncProgressAction(
  jobId: string,
  accessToken: string
): Promise<SyncProgressResponse> {
  await requireUser()

  return handleApiCall(async () => {
    const response = await apiApexAiAuth.get(`/collections/sync/${jobId}`)
    return response.data
  })
}

export async function cancelSyncJobAction(
  jobId: string,
  accessToken: string
): Promise<void> {
  await requireUser()

  return handleApiCall(async () => {
    await apiApexAiAuth.delete(`/collections/sync/${jobId}`)
  })
}

export async function updateJobStatusAction(
  jobId: string,
  status: string,
  accessToken: string
): Promise<void> {
  await requireUser()

  return handleApiCall(async () => {
    await apiApexAiAuth.patch(`/jobs/${jobId}`, { status })
  })
}
