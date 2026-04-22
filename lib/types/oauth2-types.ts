export type AuthStatus = "not_required" | "connected" | "expired" | "disconnected";
export type TokenScope = "shared" | "user";
export type OwnerType = "admin" | "user";

export interface AuthMeta {
  provider: string;
  scopes: string[];
  expires_at: string;
}

export interface ToolWithAuthStatus {
  id: string;
  name: string;
  tool_type: string;
  auth_type: string | null;
  token_scope: TokenScope | null;
  auth_status: AuthStatus;
  discovery_required: boolean;
  discovered: boolean;
  auth_meta: AuthMeta | null;
  is_active: boolean;
}

export interface ToolListResponse {
  tools: ToolWithAuthStatus[];
}

export interface OAuthAuthorizeResponse {
  authorization_url: string;
  state: string;
}

export interface OAuthStatusResponse {
  connected: boolean;
  provider: string;
  scopes: string[];
  expires_at: string;
  is_expired: boolean;
}

export interface OAuthRefreshResponse {
  success: boolean;
  expires_at: string;
}

export interface OAuthDisconnectResponse {
  success: boolean;
}

export interface OAuth2ExecutionAuth {
  type: "oauth2";
  client_id?: string;
  client_secret?: string;
  authorize_url?: string;
  token_url?: string;
  scopes?: string[];
  redirect_uri?: string;
  token_scope?: TokenScope;
  discovery?: boolean;
  discovered?: boolean;
}

export interface BearerExecutionAuth {
  type: "bearer";
  token: string;
}

export interface ApiKeyExecutionAuth {
  type: "api_key";
  header: string;
  key: string;
}

export type ToolExecutionAuth =
  | OAuth2ExecutionAuth
  | BearerExecutionAuth
  | ApiKeyExecutionAuth;

export interface ToolExecutionConfig {
  url: string;
  auth?: ToolExecutionAuth;
}

export interface ToolDefinitionPayload {
  name: string;
  url: string;
  tool_type: string;
  execution_config: ToolExecutionConfig;
}

export interface ToolDefinitionResponse extends ToolDefinitionPayload {
  id: string;
  created_at: string;
  updated_at: string;
}

export interface UseAgentToolsOptions {
  agentId: string;
  userId: string;
  businessAccountId: string;
  apiBaseUrl: string;
}

export interface OAuthActionOptions {
  toolId: string;
  ownerType: OwnerType;
  ownerId: string;
  apiBaseUrl: string;
}

const MCP_TOOL_TYPES = new Set(["McpRemote", "McpLocal"]);

export function isMcpTool(tool: ToolWithAuthStatus): boolean {
  return MCP_TOOL_TYPES.has(tool.tool_type);
}
