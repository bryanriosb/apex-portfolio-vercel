/**
 * Tipos para el protocolo de dual-stream de agentes con reasoning models
 */

export interface AgentRequest {
  query: string
  user_id: string // Required
  thread_id?: string
  session_path?: string
  context?: Record<string, unknown>
  max_steps?: number
  timeout?: number
  agent_name?: string
}

export interface AgentResponse {
  success: boolean
  result: string
  error: string
  thread_id?: string // ID del thread (nuevo o existente)
  metadata?: {
    duration_ms: number
    agent_used: string
    steps: number
    checkpoint_version?: number
  }
}

export interface StreamInfo {
  thinking_stream_id: number
  content_stream_id: number
  status: 'streams_ready'
}

export interface ThinkingMessage {
  type: 'thinking'
  content: string
  meta?: {
    timestamp?: number
  }
}

export interface ContentMessage {
  type: 'content'
  content: string
  meta?: {
    timestamp?: number
  }
}

export interface ControlMessage {
  type: 'control'
  content: string
  meta?: Record<string, unknown>
}

export type StreamMessage = ThinkingMessage | ContentMessage | ControlMessage

export interface StreamCallbacks {
  onThinking?: (content: string, meta?: Record<string, unknown>) => void
  onContent?: (content: string, meta?: Record<string, unknown>) => void
  onProgress?: (step: string, meta?: Record<string, unknown>) => void
  onError?: (error: Error) => void
  onComplete?: (response: AgentResponse) => void
}

// Tipos para gestión de threads

export interface ThreadInfo {
  id: string
  user_id: string
  session_path: string
  metadata: Metadata
  created_at: string
  updated_at: string
}

export interface Metadata {
  created_by: string
  title: string
  title_generated_at: string
  version: string
  message_count: number
}

export interface ThreadMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  agent_name?: string
  metadata?: Record<string, unknown>
  created_at: string
}

export interface ThreadCheckpoint {
  id: string
  version: number
  node_name: string
  created_at: string
}

export interface ThreadsRequest {
  user_id: string
  limit?: number
}

export interface ThreadsResponse {
  success: boolean
  threads: ThreadInfo[]
}

export interface MessagesRequest {
  thread_id: string
  get_messages: true
  limit?: number
}

export interface MessagesResponse {
  success: boolean
  thread_id: string
  messages: ThreadMessage[]
}

export interface CheckpointsRequest {
  thread_id: string
  limit?: number
}

export interface CheckpointsResponse {
  success: boolean
  thread_id: string
  checkpoints: ThreadCheckpoint[]
}
