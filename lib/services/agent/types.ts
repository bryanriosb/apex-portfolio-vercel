export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  reasoning?: string;
  createdAt: Date;
}

export interface AgentState {
  messages: ChatMessage[];
  isStreaming: boolean;
  isConnected: boolean;
  error: string | null;
  currentContent: string;
  currentReasoning: string;
  sessionId: string | null;
}

export type ChatRole = "user" | "assistant" | "system";

export interface SendMessageOptions {
  content: string;
  userId: string;
  sessionId?: string;
  model?: string;
  baseUrl?: string;
  provider?: string;
}

export interface AgentCallbacks {
  onStateChange: (state: AgentState) => void;
  onSessionCreated?: (sessionId: string) => void;
}

export type WebSocketIncomingMessage =
  | { type: "done"; payload: { session_id: string } }
  | { type: "chunk"; payload: { content: string } }
  | { type: "reasoning_delta"; payload: { content: string } }
  | { type: "session"; payload: { session_id: string } };

export interface SessionSummary {
  session_id: string;
  app_name: string;
  updated_at: string;
  event_count: number;
  preview: string;
}

export interface SessionsListResponse {
  sessions: SessionSummary[];
  total: number;
  has_more: boolean;
}

export interface EventSummary {
  id: string;
  author: string;
  timestamp: string;
  content: string;
}

export interface SessionDetailResponse {
  session_id: string;
  app_name: string;
  user_id: string;
  state: Record<string, unknown>;
  events: EventSummary[];
  created_at: string;
  updated_at: string;
}
