import {
  createLlmProviderAction,
  deleteLlmProviderAction,
  getLlmProviderAction,
  listLlmProvidersAction,
  updateLlmProviderAction,
} from '@/lib/actions/agents/llm-providers-actions'
import type {
  CreateLlmProviderRequest,
  LlmProvider,
  UpdateLlmProviderRequest,
} from '@/lib/models/agents/llm-provider'

export class LlmProvidersService {
  async listProviders(): Promise<LlmProvider[]> {
    return listLlmProvidersAction()
  }

  async getProvider(id: string): Promise<LlmProvider> {
    return getLlmProviderAction(id)
  }

  async createProvider(data: CreateLlmProviderRequest): Promise<LlmProvider> {
    return createLlmProviderAction(data)
  }

  async updateProvider(
    id: string,
    data: UpdateLlmProviderRequest
  ): Promise<LlmProvider> {
    return updateLlmProviderAction(id, data)
  }

  async deleteProvider(id: string): Promise<void> {
    return deleteLlmProviderAction(id)
  }
}
