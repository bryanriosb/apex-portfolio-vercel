import {
  listAgentsAction,
  getAgentAction,
  createAgentAction,
  updateAgentAction,
  deleteAgentAction,
} from '@/lib/actions/agents/agents-actions'
import type {
  Agent,
  CreateAgentRequest,
  UpdateAgentRequest,
} from '@/lib/models/agents/agent'

export class AgentsService {
  async listAgents(params?: Record<string, any>): Promise<Agent[]> {
    return listAgentsAction(params)
  }

  async getAgent(id: string): Promise<Agent> {
    return getAgentAction(id)
  }

  async createAgent(data: CreateAgentRequest): Promise<Agent> {
    return createAgentAction(data)
  }

  async updateAgent(id: string, data: UpdateAgentRequest): Promise<Agent> {
    return updateAgentAction(id, data)
  }

  async deleteAgent(id: string): Promise<void> {
    return deleteAgentAction(id)
  }
}
