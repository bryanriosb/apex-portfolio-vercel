import { v4 as uuidv4 } from 'uuid'
import { invokeAgent } from '@/lib/ai/graph/appointment-graph'
import {
  validateAndConsumeLink,
  createConversationAction,
  addMessageAction,
  endConversationAction,
  fetchConversationMessagesAction,
  incrementLinkUsage,
} from '@/lib/actions/ai-agent'
import type { AIConfig } from '@/lib/ai/config'
import type { AgentLink, AgentMessage } from '@/lib/models/ai-conversation'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AgentSession {
  sessionId: string
  conversationId: string
  businessId: string
  linkId: string | null
  settings: AgentLink['settings']
}

export interface AgentResponse {
  success: boolean
  message?: string
  error?: string
  session?: AgentSession
}

export async function startAgentSession(
  token: string
): Promise<AgentResponse> {
  const validation = await validateAndConsumeLink(token)

  if (!validation.valid || !validation.link) {
    return { success: false, error: validation.error || 'Enlace no válido' }
  }

  const link = validation.link

  // Incrementar uso al iniciar sesión para todos los tipos
  await incrementLinkUsage(link.id, 0)

  const sessionId = uuidv4()

  const conversationResult = await createConversationAction({
    business_id: link.business_id,
    agent_link_id: link.id,
    session_id: sessionId,
  })

  if (!conversationResult.success || !conversationResult.data) {
    return { success: false, error: conversationResult.error || 'Error al crear conversación' }
  }

  const assistantName = link.settings?.assistant_name
  const defaultMessage = '¡Hola! Soy el asistente virtual. ¿En qué puedo ayudarte hoy? Puedo ayudarte a agendar, consultar, reprogramar o cancelar citas.'
  const welcomeMessage = link.settings?.welcome_message ||
    (assistantName ? `¡Hola! Soy ${assistantName}. ¿En qué puedo ayudarte hoy? Puedo ayudarte a agendar, consultar, reprogramar o cancelar citas.` : defaultMessage)

  await addMessageAction({
    conversation_id: conversationResult.data.id,
    role: 'assistant',
    content: welcomeMessage,
  })

  return {
    success: true,
    message: welcomeMessage,
    session: {
      sessionId,
      conversationId: conversationResult.data.id,
      businessId: link.business_id,
      linkId: link.id,
      settings: link.settings,
    },
  }
}

export async function sendMessage(
  session: AgentSession,
  userMessage: string
): Promise<AgentResponse> {
  try {
    await addMessageAction({
      conversation_id: session.conversationId,
      role: 'user',
      content: userMessage,
    })

    const messagesResult = await fetchConversationMessagesAction(session.conversationId)

    if (!messagesResult.success || !messagesResult.data) {
      return { success: false, error: 'Error al obtener historial' }
    }

    const chatHistory: ChatMessage[] = messagesResult.data
      .filter((m: AgentMessage) => m.role === 'user' || m.role === 'assistant')
      .map((m: AgentMessage) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }))

    const modelConfig: Partial<AIConfig> = {}
    if (session.settings?.model_provider) {
      modelConfig.provider = session.settings.model_provider
    }
    if (session.settings?.model) {
      modelConfig.model = session.settings.model as AIConfig['model']
    }
    if (session.settings?.temperature) {
      modelConfig.temperature = session.settings.temperature
    }

    const result = await invokeAgent(session.businessId, session.sessionId, chatHistory, modelConfig)

    await addMessageAction({
      conversation_id: session.conversationId,
      role: 'assistant',
      content: result.content,
    })

    return {
      success: true,
      message: result.content,
      session,
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    console.error('Error in sendMessage:', errorMessage)
    return { success: false, error: errorMessage }
  }
}

export async function endSession(session: AgentSession): Promise<{ success: boolean; error?: string }> {
  return endConversationAction(session.conversationId)
}

export async function getSessionHistory(
  conversationId: string
): Promise<{ success: boolean; messages?: ChatMessage[]; error?: string }> {
  const result = await fetchConversationMessagesAction(conversationId)

  if (!result.success || !result.data) {
    return { success: false, error: result.error }
  }

  const messages: ChatMessage[] = result.data
    .filter((m: AgentMessage) => m.role === 'user' || m.role === 'assistant')
    .map((m: AgentMessage) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

  return { success: true, messages }
}
