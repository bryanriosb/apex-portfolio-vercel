import { AgentProvider, AgentStreamEvent } from './types'
import {
  streamAgentResponseWithFeedback,
  invokeAgent,
} from './graph/appointment-graph'

interface LanggraphAgentConfig {
  businessId: string
  sessionId: string
  model?: string
  temperature?: number
  maxTokens?: number
}

export class LanggraphAgent implements AgentProvider {
  private config: LanggraphAgentConfig

  constructor(config: LanggraphAgentConfig) {
    this.config = config
  }

  async *streamResponse(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    options?: { businessId?: string; sessionId?: string; assistantName?: string }
  ): AsyncGenerator<AgentStreamEvent> {
    try {
      const businessId = options?.businessId || this.config.businessId
      const sessionId = options?.sessionId || this.config.sessionId
      const assistantName = options?.assistantName

      const stream = streamAgentResponseWithFeedback(
        businessId,
        sessionId,
        messages,
        assistantName
      )

      for await (const event of stream) {
        switch (event.type) {
          case 'chunk':
            yield { type: 'chunk', content: event.content }
            break
          case 'feedback':
            yield { 
              type: 'feedback', 
              event: {
                type: event.event.type,
                message: event.event.message,
                toolName: event.event.toolName,
                elapsedMs: event.event.elapsedMs
              }
            }
            break
          case 'tool_start':
            yield { type: 'tool_start', toolName: event.toolName }
            break
          case 'tool_end':
            yield { type: 'tool_end', toolName: event.toolName, success: event.success }
            break
          case 'intent':
            yield { type: 'intent', intent: event.intent }
            break
          default:
            console.warn('[LanggraphAgent] Unknown event type:', event)
        }
      }
    } catch (error) {
      console.error('[LanggraphAgent] Error:', error)
      yield { 
        type: 'error', 
        error: error instanceof Error ? error.message : 'Error desconocido' 
      }
    }
  }

  async invokeResponse(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    options?: { businessId?: string; sessionId?: string; assistantName?: string }
  ): Promise<{ content: string; messages?: any[] }> {
    try {
      const businessId = options?.businessId || this.config.businessId
      const sessionId = options?.sessionId || this.config.sessionId

      const result = await invokeAgent(businessId, sessionId, messages)
      
      return { 
        content: result.content,
        messages: result.messages
      }
    } catch (error) {
      console.error('[LanggraphAgent] Error:', error)
      return { 
        content: `Error: ${error instanceof Error ? error.message : 'Error desconocido'}` 
      }
    }
  }
}