import type {
  AgentRequest,
  AgentResponse,
  StreamCallbacks,
  ThreadInfo,
  ThreadsRequest,
  ThreadsResponse,
  MessagesRequest,
  MessagesResponse,
  CheckpointsRequest,
  CheckpointsResponse,
} from '@/lib/types/agent-stream'

export class AgentService {
  private baseUrl: string
  private connected: boolean = false

  constructor(url: string) {
    this.baseUrl = url
  }

  async initialize(): Promise<void> {
    this.connected = true
  }

  isConnected(): boolean {
    return this.connected
  }

  disconnect(): void {
    this.connected = false
  }

  async sendQuery(
    request: AgentRequest,
    callbacks: StreamCallbacks
  ): Promise<void> {
    if (!this.connected) {
      throw new Error('Service not connected')
    }

    try {
      const response = await fetch(`${this.baseUrl}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`)
      }

      const result: AgentResponse = await response.json()

      if (result.success) {
        callbacks.onContent?.(result.result)
        callbacks.onComplete?.(result)
      } else {
        callbacks.onError?.(new Error(result.error))
      }
    } catch (error) {
      callbacks.onError?.(error instanceof Error ? error : new Error('Unknown error'))
    }
  }

  async listThreads(request: ThreadsRequest): Promise<ThreadsResponse> {
    if (!this.connected) {
      throw new Error('Service not connected')
    }

    try {
      const params = new URLSearchParams({
        user_id: request.user_id,
        ...(request.limit && { limit: String(request.limit) }),
      })

      const response = await fetch(`${this.baseUrl}/threads?${params}`)

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`)
      }

      const result = await response.json()
      return { success: true, threads: result.threads || [] }
    } catch (error) {
      console.error('Error fetching threads:', error)
      return { success: false, threads: [] }
    }
  }

  async getMessages(request: MessagesRequest): Promise<MessagesResponse> {
    if (!this.connected) {
      throw new Error('Service not connected')
    }

    try {
      const params = new URLSearchParams({
        ...(request.limit && { limit: String(request.limit) }),
      })

      const response = await fetch(
        `${this.baseUrl}/threads/${request.thread_id}/messages?${params}`
      )

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`)
      }

      const result = await response.json()
      return {
        success: true,
        thread_id: request.thread_id,
        messages: result.messages || [],
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
      return { success: false, thread_id: request.thread_id, messages: [] }
    }
  }

  async getCheckpoints(request: CheckpointsRequest): Promise<CheckpointsResponse> {
    if (!this.connected) {
      throw new Error('Service not connected')
    }

    try {
      const params = new URLSearchParams({
        ...(request.limit && { limit: String(request.limit) }),
      })

      const response = await fetch(
        `${this.baseUrl}/threads/${request.thread_id}/checkpoints?${params}`
      )

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`)
      }

      const result = await response.json()
      return {
        success: true,
        thread_id: request.thread_id,
        checkpoints: result.checkpoints || [],
      }
    } catch (error) {
      console.error('Error fetching checkpoints:', error)
      return { success: false, thread_id: request.thread_id, checkpoints: [] }
    }
  }

  async getThreadById(threadId: string): Promise<ThreadInfo | null> {
    if (!this.connected) {
      throw new Error('Service not connected')
    }

    try {
      const response = await fetch(`${this.baseUrl}/threads/${threadId}`)

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching thread:', error)
      return null
    }
  }
}
