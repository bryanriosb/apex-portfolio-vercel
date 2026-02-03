import { AgentProvider, AgentStreamEvent } from './types'
import { generateText, ToolLoopAgent, stepCountIs } from 'ai'
import { openai } from '@ai-sdk/openai'
import { createAppointmentTools } from './tools/ai-sdk-tools'
import { createVercelAIAgentPrompt } from './prompts/vercel-ai-agent-prompt'

interface VercelAIAgentConfig {
  businessId: string
  sessionId: string
  model?: string
  temperature?: number
}

export class VercelAIAgent implements AgentProvider {
  private config: VercelAIAgentConfig

  constructor(config: VercelAIAgentConfig) {
    this.config = {
      model: 'gpt-5-mini-2025-08-07',
      ...config,
    }
  }

  private async prepareAgentContext(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    options?: {
      businessId?: string
      sessionId?: string
      assistantName?: string
    }
  ) {
    const businessId = options?.businessId || this.config.businessId
    const sessionId = options?.sessionId || this.config.sessionId
    const businessContext = await this.getBusinessContext(
      businessId,
      options?.assistantName
    )
    const systemPrompt = this.createSystemPrompt(businessContext)
    const tools = createAppointmentTools({ businessId, sessionId })

    return {
      businessId,
      sessionId,
      tools,
      systemPrompt,
      fullMessages: [
        { role: 'system' as const, content: systemPrompt },
        ...messages,
      ],
    }
  }

  async *streamResponse(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    options?: {
      businessId?: string
      sessionId?: string
      assistantName?: string
    }
  ): AsyncGenerator<AgentStreamEvent> {
    try {
      const { tools, fullMessages, systemPrompt } =
        await this.prepareAgentContext(messages, options)
      const model = openai(this.config.model!)

      const agent = new ToolLoopAgent({
        model,
        instructions: systemPrompt,
        tools,
        toolChoice: 'auto',
        stopWhen: stepCountIs(10),
      })

      const result = await agent.stream({ messages: fullMessages })
      let hasContent = false
      let fullText = ''

      for await (const chunk of result.textStream) {
        if (chunk.trim()) hasContent = true
        fullText += chunk
        yield { type: 'chunk', content: chunk }
      }

      // Detectar si se llamó end_conversation (el modelo incluirá el mensaje de despedida)
      if (
        fullText.includes('END_CONVERSATION') ||
        fullText.toLowerCase().includes('sesión finalizada') ||
        fullText.toLowerCase().includes('gracias por contactarnos')
      ) {
        yield {
          type: 'session_end',
          message: 'Gracias por contactarnos. ¡Que tengas un excelente día!',
          reason: 'Cliente finalizó la conversación',
        }
      }

      if (!hasContent) {
        yield { type: 'error', error: 'Respuesta vacía. Intenta de nuevo.' }
      }
    } catch (error) {
      console.error('[AI Agent] Error:', error)
      yield {
        type: 'error',
        error: error instanceof Error ? error.message : 'Error desconocido',
      }
    }
  }

  async invokeResponse(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    options?: {
      businessId?: string
      sessionId?: string
      assistantName?: string
    }
  ): Promise<{ content: string; messages?: any[] }> {
    try {
      const { tools, fullMessages } = await this.prepareAgentContext(
        messages,
        options
      )
      const model = openai(this.config.model!)

      const result = await generateText({
        model,
        messages: fullMessages,
        tools,
        temperature: this.config.temperature,
      })

      return { content: result.text, messages: fullMessages }
    } catch (error) {
      console.error('[AI Agent] Error:', error)
      return {
        content: `Error: ${
          error instanceof Error ? error.message : 'Error desconocido'
        }`,
      }
    }
  }

  private async getBusinessContext(businessId: string, assistantName?: string) {
    const { getBusinessContext } = await import('./graph/appointment-graph')
    return getBusinessContext(businessId, assistantName)
  }

  private createSystemPrompt(context: any): string {
    return createVercelAIAgentPrompt(context)
  }
}
