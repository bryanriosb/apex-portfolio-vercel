import type {
  SessionsListResponse,
  SessionDetailResponse,
} from '@/lib/services/agent/types'

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
    const params = new URLSearchParams({
      user_id: userId,
      app_name: appName,
      limit: String(limit),
      offset: String(offset),
    })

    const response = await fetch(`${this.baseUrl}/sessions?${params}`)

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: 'Unknown error' }))
      throw new Error(
        error.error || `Failed to list sessions: ${response.status}`
      )
    }

    return response.json()
  }

  async getSession(
    sessionId: string,
    userId: string,
    appName: string
  ): Promise<SessionDetailResponse> {
    const params = new URLSearchParams({
      user_id: userId,
      app_name: appName,
    })

    const response = await fetch(
      `${this.baseUrl}/sessions/${sessionId}?${params}`
    )

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: 'Unknown error' }))
      throw new Error(
        error.error || `Failed to get session: ${response.status}`
      )
    }

    return response.json()
  }

  async deleteSession(
    sessionId: string,
    userId: string,
    appName: string
  ): Promise<boolean> {
    const params = new URLSearchParams({ user_id: userId, app_name: appName })

    const response = await fetch(
      `${this.baseUrl}/sessions/${sessionId}?${params}`,
      {
        method: 'DELETE',
      }
    )

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: 'Unknown error' }))
      throw new Error(
        error.error || `Failed to delete session: ${response.status}`
      )
    }

    const result = await response.json()
    return result.success
  }
}
