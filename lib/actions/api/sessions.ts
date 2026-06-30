'use server'

import { query, create, destroy } from './crud'
import type {
  SessionsListResponse,
  SessionDetailResponse,
} from '@/lib/services/agent/types'

export interface ListSessionsParams {
  userId: string
  appName: string
  limit?: number
  offset?: number
}

export interface GetSessionParams {
  sessionId: string
  userId: string
  appName: string
}

export interface DeleteSessionParams {
  sessionId: string
  userId: string
  appName: string
}

export async function listSessions(
  params: ListSessionsParams
): Promise<SessionsListResponse> {
  return query('/api/sessions', {
    user_id: params.userId,
    app_name: params.appName,
    limit: params.limit ?? 20,
    offset: params.offset ?? 0,
  })
}

export async function getSession(
  params: GetSessionParams
): Promise<SessionDetailResponse> {
  return query(`/api/sessions/${params.sessionId}`, {
    user_id: params.userId,
    app_name: params.appName,
  })
}

export async function deleteSession(
  params: DeleteSessionParams
): Promise<{ success: boolean }> {
  return destroy(
    `/api/sessions/${params.sessionId}?user_id=${params.userId}&app_name=${params.appName}`
  )
}
