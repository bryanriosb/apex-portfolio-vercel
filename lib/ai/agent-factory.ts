import { AgentProvider, AgentStreamEvent } from './types'

export interface AgentFactoryConfig {
  provider: 'langgraph' | 'vercel-ai'
  businessId: string
  sessionId: string
  model?: string
  temperature?: number
  maxTokens?: number
}

export class AgentFactory {
  private static instances = new Map<string, AgentProvider>()

  static async create(config: AgentFactoryConfig): Promise<AgentProvider> {
    const instanceKey = `${config.provider}_${config.businessId}_${config.sessionId}`
    
    if (this.instances.has(instanceKey)) {
      return this.instances.get(instanceKey)!
    }

    let agent: AgentProvider

    switch (config.provider) {
      case 'langgraph':
        const { LanggraphAgent } = await import('./langgraph-agent')
        agent = new LanggraphAgent(config)
        break
      
      case 'vercel-ai':
        const { VercelAIAgent } = await import('./vercel-ai-agent')
        agent = new VercelAIAgent(config)
        break
      
      default:
        throw new Error(`Unsupported provider: ${config.provider}`)
    }

    this.instances.set(instanceKey, agent)
    return agent
  }

  static clearInstance(businessId: string, sessionId: string, provider: 'langgraph' | 'vercel-ai') {
    const instanceKey = `${provider}_${businessId}_${sessionId}`
    this.instances.delete(instanceKey)
  }

  static clearAllInstances() {
    this.instances.clear()
  }
}

// Función helper para crear agentes fácilmente
export async function createAgent(
  provider: 'langgraph' | 'vercel-ai',
  businessId: string,
  sessionId: string,
  options?: {
    model?: string
    temperature?: number
    maxTokens?: number
  }
): Promise<AgentProvider> {
  return AgentFactory.create({
    provider,
    businessId,
    sessionId,
    ...options,
  })
}