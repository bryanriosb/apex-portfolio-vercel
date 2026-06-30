export type JobStatus = 'Pending' | 'Running' | 'Interrupted' | 'Completed' | 'Failed';

export interface Job {
    job_id:                string;
    parent_id:             null;
    name:                  string;
    category:              string;
    agent_id:              string;
    business_id:           string;
    module:                string;
    kind:                  string;
    status:                string;
    input_content:         string;
    metadata:              string;
    result_content:        string;
    result_reasoning:      string;
    result_session_id:     string;
    error_message:         string;
    user_id:               string;
    session_id:            string;
    scheduled_at:          null;
    timezone:              string;
    cron:                  null;
    created_at:            string;
    updated_at:            string;
    customer_name:         string;
    customer_id:           string;
    business_account_id:   string;
    business_name:         string;
    business_account_name: string;
}

export interface AgentJob {
  id: string;
  parent_id: string | null;
  agent_id: string;
  name: string;
  category: string;
  module: string;
  kind: string;
  status: JobStatus;
  input_content: string;
  metadata: string;
  result_content: string;
  result_reasoning: string;
  result_session_id: string;
  error_message: string;
  user_id: string;
  session_id: string;
  scheduled_at: string | null;
  timezone: string | null;
  cron: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgentWorkflowJob {
  id: string;
  parent_id: string | null;
  agent_workflow_definition_id: string;
  module: string;
  name: string;
  category: string;
  kind: string;
  status: JobStatus;
  thread_id: string;
  input_state: string;
  result_state: string;
  error_message: string;
  interrupt_data: string;
  metadata: string;
  user_id: string;
  scheduled_at: string | null;
  timezone: string | null;
  cron: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApexJob {
  id: string;
  parent_id: string | null;
  status: JobStatus;
  job_type: string;
  kind: string;
  payload: string;
  metadata: string;
  result: string;
  error: string;
  scheduled_at: string | null;
  timezone: string | null;
  cron: string | null;
  created_at: string;
  updated_at: string;
  module: string;
  business_id: string;
  name: string;
  category: string;
}

export interface ModuleMetrics {
  module: string;
  total_agent_jobs: number;
  agent_jobs_by_status: Record<string, number>;
  total_workflow_jobs: number;
  workflow_jobs_by_status: Record<string, number>;
  total_apex_jobs: number;
  apex_jobs_by_status: Record<string, number>;
}

export interface AutomationMetricsResponse {
  modules: ModuleMetrics[];
}

import { type UiResponse } from '@zavora-ai/adk-ui-react';

export interface InterruptData {
  thread_id: string;
  checkpoint_id: string;
  step: number;
  interrupt: {
    type: 'Dynamic';
    message: string;
    data: {
      reason: string;
      gate_field: string;
      ui_form: UiResponse;
    };
  };
}

export interface ResumeWorkflowRequest {
  state_updates: Record<string, any>;
}

export type {
  AutomationServerEvent,
  JobStateChangedEvent,
  WorkflowLogEvent,
  ToolCallStartedEvent,
  ToolCallCompletedEvent,
  AgentThinkingEvent,
  AgentResolvedEvent,
  WorkflowNodeStartedEvent,
  WorkflowNodeCompletedEvent,
  SkillsResolvedEvent,
  ToolConnectionChangedEvent,
  CronTriggeredEvent,
  PongEvent,
  SubscribeMessage,
  PingMessage,
  AutomationClientMessage,
} from '@/lib/types/automation/automation-event-types';

export {
  JobType,
  ToolType,
  WorkflowNodeType,
  ToolConnectionStatus,
  WorkflowLogLevel,
  EventCategory,
} from '@/lib/types/automation/automation-event-types';

export type { SkillInfo } from '@/lib/types/automation/automation-event-types';

export interface AutomationLogEntry {
  id: string;
  job_id: string;
  module: string;
  event_type: string;
  message: string;
  timestamp: string;
}

export function safeParseJSON(value: string | object | null): any {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export interface JobObserver {
  session_id: string;
  job?: Job | AgentJob | AgentWorkflowJob | any;
  session: Session;
  events: Event[];
  memory_sessions: MemorySession[];
  contacts: Contact[];
  app_state: AppState;
  user_state: AppState;
  total_cost?: number;
}

export interface SessionObserver {
  session_id: string;
  session: Session;
  events: Event[];
  memory_sessions: MemorySession[];
  contacts: Contact[];
  app_state: AppState;
  user_state: AppState;
}

export interface AppState {
  [key: string]: any;
}

export interface Contact {
  id: string;
  channel: string;
  status: string | null;
  created_at: string | null;
}

export interface Event {
  id: string;
  author: string;
  timestamp: string | Date;
  branch: string;
  invocation_id: string;
  llm_response: LlmResponse;
  actions: Actions;
  long_running_tool_ids: any[];
  model?: string;
  cost?: number;
  tokens?: Tokens;
}

export interface Actions {
  state_delta?: AppState;
  artifact_delta?: AppState;
  skip_summarization?: boolean;
  transfer_to_agent?: any;
  escalate?: boolean;
  [key: string]: any;
}

export interface LlmResponse {
  content: Content | null;
  usage_metadata: UsageMetadata | null;
  finish_reason: null | string;
  partial: boolean;
  turn_complete: boolean;
  interrupted: boolean;
  error_code: any;
  error_message: any;
}

export interface Content {
  role: string;
  parts: Part[];
}

export interface Part {
  text?: string;
  name?: string;
  args?: Record<string, any>;
  id?: string;
  functionResponse?: FunctionResponse;
}

export interface FunctionResponse {
  name: string;
  response: any;
}

export interface UsageMetadata {
  prompt_token_count: number;
  candidates_token_count: number;
  total_token_count: number;
}

export interface Tokens {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  token_cost?: number;
}

export interface MemorySession {
  session_id: string;
  entries: Entry[];
}

export interface Entry {
  id: string;
  author: string;
  timestamp: string | Date;
  content_text: string;
  content: Content | any;
  real_session_id: string;
  follows: string[];
  followed_by: string[];
  similar_to: any[];
}

export interface Session {
  app_name: string;
  user_id: string;
  created_at: string | Date;
  updated_at: string | Date;
  state: AppState;
}
