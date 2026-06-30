import type {
  SessionsListResponse,
  SessionDetailResponse,
} from '@/lib/services/agent/types'
import {
  listSessions as listSessionsAction,
  getSession as getSessionAction,
  deleteSession as deleteSessionAction,
} from '@/lib/actions/api/sessions'

export interface SessionServiceOptions {
  baseUrl: string
}

export class SessionService {
  private readonly baseUrl: string

  constructor(options: SessionServiceOptions) {
    this.baseUrl = options.baseUrl?.replace(/\/$/, '')
  }

  async listSessions(
    userId: string,
    appName: string,
    limit = 20,
    offset = 0
  ): Promise<SessionsListResponse> {
    return listSessionsAction({ userId, appName, limit, offset })
  }

  async getSession(
    sessionId: string,
    userId: string,
    appName: string
  ): Promise<SessionDetailResponse> {
    return getSessionAction({ sessionId, userId, appName })
  }

  async deleteSession(
    sessionId: string,
    userId: string,
    appName: string
  ): Promise<boolean> {
    const result = await deleteSessionAction({ sessionId, userId, appName })
    return result.success
  }
}
