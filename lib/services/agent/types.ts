import type { Component, UiResponse } from '@zavora-ai/adk-ui-react'
import type { DynamicToolUIPart } from 'ai'

export type ToolCallData = Omit<DynamicToolUIPart, 'state' | 'input'> & {
  state: DynamicToolUIPart['state']
  input: unknown
  attempts: number
  toolType: string
}

export interface SkillInfo {
  name: string
  version?: string | null
  priority?: number
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  reasoning?: string
  uiComponents?: Component[]
  uiTheme?: 'light' | 'dark' | 'system'
  uiToolName?: string
  toolCalls?: ToolCallData[]
  skills?: SkillInfo[]
  createdAt: Date
}

export interface AgentState {
  messages: ChatMessage[]
  isStreaming: boolean
  isConnected: boolean
  isLoadingSession: boolean
  error: string | null
  currentContent: string
  currentReasoning: string
  currentToolCalls: ToolCallData[]
  currentSkills: SkillInfo[]
  sessionId: string | null
  reconnectAttempt: number
  reconnectCountdown: number
  maxRetries: number
}

export type ChatRole = 'user' | 'assistant' | 'system'

export interface SendMessageOptions {
  content: string
  userId: string
  sessionId?: string
  model?: string
  baseUrl?: string
  provider?: string
  provider_options?: Record<string, any>
}

export interface AgentCallbacks {
  onStateChange: (state: AgentState) => void
  onSessionCreated?: (sessionId: string) => void
}

export type WebSocketIncomingMessage =
  | { type: 'done'; payload: { session_id: string } }
  | { type: 'chunk'; payload: { content: string } }
  | { type: 'reasoning_start'; payload?: Record<string, never> }
  | { type: 'reasoning_delta'; payload: { content: string } }
  | { type: 'reasoning_end'; payload?: Record<string, never> }
  | { type: 'session'; payload: { session_id: string } }
  | { type: 'session_created'; payload: { session_id: string } }
  | { type: 'error'; payload: { message: string } }
  | { type: 'tool_call'; payload: { name: string; arguments: string; tool_type: string } }
  | { type: 'skills_resolved'; payload: { skills: SkillInfo[] } }
  | { type: 'workflow_node_start'; payload: { node_id: string, thread_id: string } }
  | { type: 'workflow_node_end'; payload: { node_id: string, thread_id: string } }
  | { type: 'ui_response'; payload: { tool_name: string; payload: UiResponse } }
  | { type: 'ping'; payload?: Record<string, never> }
  | { type: 'pong'; payload?: Record<string, never> }

export interface SessionSummary {
  session_id: string
  app_name: string
  updated_at: string
  event_count: number
  preview: string
}

export interface SessionsListResponse {
  sessions: SessionSummary[]
  total: number
  has_more: boolean
}

export type ServerEvent =
  | { type: 'user'; content: string }
  | { type: 'assistant'; content: string }
  | { type: 'tool_call'; name: string; arguments: string; tool_type?: string }
  | { type: 'reasoning_start' }
  | { type: 'reasoning_delta'; content: string }
  | { type: 'reasoning_end' }
  | { type: 'ui_response'; tool_name: string; payload: { theme?: string; components: Component[] } }

export interface SessionDetailResponse {
  session_id: string
  app_name: string
  user_id: string
  state: Record<string, unknown>
  events: ServerEvent[]
  created_at: string
  updated_at: string
}
