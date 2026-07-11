import {
  createToolAction,
  deleteToolAction,
  getToolAction,
  listAgentToolsAction,
  listToolsAction,
  mapToolToAgentAction,
  patchToolAction,
  unmapToolFromAgentAction,
  updateToolAction,
} from '@/lib/actions/agents/tools-actions'
import type {
  CreateToolDefinitionRequest,
  PatchToolDefinitionRequest,
  ToolDefinition,
  UpdateToolDefinitionRequest,
} from '@/lib/models/agents/tool'
import type { ToolWithAuthStatus } from '@/lib/types/oauth2-types'

export class ToolsService {
  async listTools(): Promise<ToolDefinition[]> {
    return listToolsAction()
  }

  async getTool(id: string): Promise<ToolDefinition> {
    return getToolAction(id)
  }

  async createTool(data: CreateToolDefinitionRequest): Promise<ToolDefinition> {
    return createToolAction(data)
  }

  async updateTool(
    id: string,
    data: UpdateToolDefinitionRequest
  ): Promise<ToolDefinition> {
    return updateToolAction(id, data)
  }

  async patchTool(id: string, data: PatchToolDefinitionRequest): Promise<void> {
    return patchToolAction(id, data)
  }

  async deleteTool(id: string): Promise<void> {
    return deleteToolAction(id)
  }

  async listAgentTools(
    agentId: string,
    params: { user_id: string; business_account_id: string }
  ): Promise<ToolWithAuthStatus[]> {
    return listAgentToolsAction(agentId, params)
  }

  async mapToolToAgent(agentId: string, toolId: string): Promise<void> {
    return mapToolToAgentAction(agentId, toolId)
  }

  async unmapToolFromAgent(agentId: string, toolId: string): Promise<void> {
    return unmapToolFromAgentAction(agentId, toolId)
  }
}
