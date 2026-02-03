export type AgentLinkType = 'single_use' | 'multi_use' | 'time_limited' | 'minute_limited'

export type AgentLinkStatus = 'active' | 'expired' | 'exhausted' | 'disabled'

export type ConversationStatus = 'active' | 'completed' | 'abandoned'

export interface AgentLink {
  id: string
  business_id: string
  name: string
  type: AgentLinkType
  status: AgentLinkStatus
  token: string
  max_uses: number | null
  current_uses: number
  max_minutes: number | null
  minutes_used: number
  expires_at: string | null
  settings: AgentLinkSettings
  created_at: string
  updated_at: string
}

export interface AgentLinkSettings {
  assistant_name?: string
  welcome_message?: string
  model_provider?: 'openai' | 'deepinfra'
  model?: string
  temperature?: number
  allowed_actions?: ('book' | 'reschedule' | 'cancel' | 'query')[]
  require_phone_verification?: boolean
  notify_on_booking?: boolean
  custom_instructions?: string
}

export interface AgentLinkInsert {
  business_id: string
  name: string
  type: AgentLinkType
  max_uses?: number | null
  max_minutes?: number | null
  expires_at?: string | null
  settings?: AgentLinkSettings
}

export interface AgentLinkUpdate {
  name?: string
  type?: AgentLinkType
  status?: AgentLinkStatus
  max_uses?: number | null
  max_minutes?: number | null
  expires_at?: string | null
  settings?: AgentLinkSettings
}

export interface AgentConversation {
  id: string
  business_id: string
  agent_link_id: string | null
  session_id: string
  customer_phone: string | null
  customer_name: string | null
  status: ConversationStatus
  started_at: string
  ended_at: string | null
  duration_seconds: number
  message_count: number
  actions_taken: ConversationAction[]
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface ConversationAction {
  type: 'book' | 'reschedule' | 'cancel' | 'query'
  timestamp: string
  details: Record<string, unknown>
  success: boolean
}

export interface AgentConversationInsert {
  business_id: string
  agent_link_id?: string | null
  session_id: string
  customer_phone?: string | null
  customer_name?: string | null
}

export interface AgentMessage {
  id: string
  conversation_id: string
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  tool_calls?: ToolCall[]
  tool_call_id?: string
  tokens_used: number
  created_at: string
}

export interface ToolCall {
  id: string
  name: string
  arguments: Record<string, unknown>
}

export interface AgentMessageInsert {
  conversation_id: string
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  tool_calls?: ToolCall[]
  tool_call_id?: string
  tokens_used?: number
}

export interface AgentUsageStats {
  business_id: string
  total_conversations: number
  total_messages: number
  total_minutes: number
  total_bookings: number
  total_cancellations: number
  total_reschedules: number
  period_start: string
  period_end: string
}
