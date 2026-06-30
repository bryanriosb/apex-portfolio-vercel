export enum JobType {
  AgentJob = 'AgentJob',
  AgentWorkflowJob = 'AgentWorkflowJob',
  ApexJob = 'ApexJob',
}

export enum ToolType {
  Function = 'Function',
  McpLocal = 'McpLocal',
  McpRemote = 'McpRemote',
  Integration = 'Integration',
  IntegrationService = 'IntegrationService',
  Notification = 'Notification',
  Ontology = 'Ontology',
  Artifact = 'Artifact',
}

export enum WorkflowNodeType {
  Agent = 'Agent',
  HITL = 'HITL',
  Transform = 'Transform',
  Assembler = 'Assembler',
  Function = 'Function',
}

export enum ToolConnectionStatus {
  Connected = 'Connected',
  Disconnected = 'Disconnected',
  TokenRefreshed = 'TokenRefreshed',
  AuthFailed = 'AuthFailed',
}

export enum WorkflowLogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

export enum EventCategory {
  Tool = 'tool',
  Agent = 'agent',
  Workflow = 'workflow',
  Connection = 'connection',
  Scheduling = 'scheduling',
}

export interface SkillInfo {
  name: string;
  description?: string;
  version?: string;
}

export interface JobStateChangedEvent {
  type: 'JobStateChanged';
  job_type: JobType;
  job_id: string;
  job_name?: string;
  job_category?: string;
  old_status: string;
  new_status: string;
  timestamp: string;
  user_id?: string;
  origin?: string;
  module?: string;
  app_name?: string;
  category?: EventCategory;
}

export interface WorkflowLogEvent {
  type: 'WorkflowLog';
  job_id: string;
  job_type: JobType;
  level: WorkflowLogLevel;
  message: string;
  node_id?: string;
  timestamp: string;
  module?: string;
  category?: EventCategory;
}

export interface ToolCallStartedEvent {
  type: 'ToolCallStarted';
  job_id: string;
  job_type: JobType;
  tool_name: string;
  tool_type: ToolType;
  call_id: string;
  timestamp: string;
  module?: string;
  category?: EventCategory;
}

export interface ToolCallCompletedEvent {
  type: 'ToolCallCompleted';
  job_id: string;
  job_type: JobType;
  tool_name: string;
  tool_type: ToolType;
  call_id: string;
  success: boolean;
  duration_ms?: number;
  timestamp: string;
  module?: string;
  category?: EventCategory;
}

export interface AgentThinkingEvent {
  type: 'AgentThinking';
  job_id: string;
  job_type: JobType;
  agent_name: string;
  agent_id?: string;
  thought?: string;
  timestamp: string;
  module?: string;
  category?: EventCategory;
}

export interface AgentResolvedEvent {
  type: 'AgentResolved';
  job_id: string;
  job_type: JobType;
  agent_name: string;
  agent_id?: string;
  result?: string;
  timestamp: string;
  module?: string;
  category?: EventCategory;
}

export interface WorkflowNodeStartedEvent {
  type: 'WorkflowNodeStarted';
  job_id: string;
  job_type: JobType;
  node_id: string;
  node_type: WorkflowNodeType;
  node_name?: string;
  timestamp: string;
  module?: string;
  category?: EventCategory;
}

export interface WorkflowNodeCompletedEvent {
  type: 'WorkflowNodeCompleted';
  job_id: string;
  job_type: JobType;
  node_id: string;
  node_type: WorkflowNodeType;
  node_name?: string;
  success: boolean;
  timestamp: string;
  module?: string;
  category?: EventCategory;
}

export interface SkillsResolvedEvent {
  type: 'SkillsResolved';
  job_id: string;
  job_type: JobType;
  skills: SkillInfo[];
  timestamp: string;
  module?: string;
  category?: EventCategory;
}

export interface ToolConnectionChangedEvent {
  type: 'ToolConnectionChanged';
  tool_name: string;
  tool_type: ToolType;
  status: ToolConnectionStatus;
  message?: string;
  timestamp: string;
  category?: EventCategory;
}

export interface CronTriggeredEvent {
  type: 'CronTriggered';
  job_id: string;
  job_type: JobType;
  cron_expression?: string;
  timestamp: string;
  module?: string;
  category?: EventCategory;
}

export interface PongEvent {
  type: 'Pong';
  timestamp: string;
}

export type AutomationServerEvent =
  | JobStateChangedEvent
  | WorkflowLogEvent
  | ToolCallStartedEvent
  | ToolCallCompletedEvent
  | AgentThinkingEvent
  | AgentResolvedEvent
  | WorkflowNodeStartedEvent
  | WorkflowNodeCompletedEvent
  | SkillsResolvedEvent
  | ToolConnectionChangedEvent
  | CronTriggeredEvent
  | PongEvent;

export interface SubscribeMessage {
  type: 'Subscribe';
  filters: Record<string, unknown> | null;
}

export interface PingMessage {
  type: 'Ping';
}

export type AutomationClientMessage = SubscribeMessage | PingMessage;
