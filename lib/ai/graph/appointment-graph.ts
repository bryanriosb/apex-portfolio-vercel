import { StateGraph, END, START } from '@langchain/langgraph'
import {
  HumanMessage,
  AIMessage,
  BaseMessage,
  SystemMessage,
  ToolMessage,
} from '@langchain/core/messages'
import { ToolNode } from '@langchain/langgraph/prebuilt'
import { ChatOpenAI } from '@langchain/openai'
import { AgentState, type AgentStateType } from './state'
import {
  createGetAvailableSlotsTool,
  createGetServicesTool,
  createGetSpecialistsTool,
  createGetAppointmentsByPhoneTool,
  createCreateCustomerTool,
  createCreateAppointmentTool,
  createCancelAppointmentTool,
  createRescheduleAppointmentTool,
} from '../tools/appointment-tools'
import {
  handleGetAvailableSlots,
  handleGetServices,
  handleGetSpecialists,
  handleGetAppointmentsByPhone,
  handleCreateCustomer,
  handleCreateAppointment,
  handleCancelAppointment,
  handleRescheduleAppointment,
} from '../tools/handlers'
import { getSupabaseAdminClient } from '@/lib/actions/supabase'
import {
  createErrorInfo,
  shouldRetry,
  formatErrorForAgent,
} from './error-handler'
import { getThinkingIndicator, type FeedbackEvent, createProgressTracker } from './feedback-generator'
import { routeIntent, getConversationContext, type Intent } from './router'
import {
  createBookingPrompt,
  createInquiryPrompt,
  createAvailabilityPrompt,
  createReschedulePrompt,
  createCancelPrompt,
  createGeneralPrompt,
  type BusinessContext,
} from './prompts'
import type { ErrorInfo } from './state'

export type StreamEvent =
  | { type: 'chunk'; content: string }
  | { type: 'feedback'; event: FeedbackEvent }
  | { type: 'tool_start'; toolName: string }
  | { type: 'tool_end'; toolName: string; success: boolean }
  | { type: 'intent'; intent: Intent }
  | { type: 'session_end'; message: string; reason?: string }

export interface BusinessAgentConfig {
  businessId: string
  sessionId: string
}

function createMainModel() {
  const apiKey = process.env.DEEPINFRA_API_KEY
  if (!apiKey) {
    throw new Error('DEEPINFRA_API_KEY environment variable is not set')
  }

  return new ChatOpenAI({
    model: 'Qwen/Qwen3-Next-80B-A3B-Instruct', // Qwen/Qwen3-235B-A22B-Instruct-2507,
    temperature: 0.3,
    maxTokens: 1024,
    apiKey: apiKey,
    configuration: {
      baseURL: 'https://api.deepinfra.com/v1/openai',
    },
  })
}

export async function getBusinessContext(
  businessId: string,
  assistantName?: string
): Promise<BusinessContext> {
  const supabase = await getSupabaseAdminClient()

  const { data: business } = await supabase
    .from('businesses')
    .select('name, type, phone_number')
    .eq('id', businessId)
    .single()

  const { data: services } = await supabase
    .from('services')
    .select('id, name, duration_minutes, price_cents')
    .eq('business_id', businessId)
    .limit(20)

  const { data: specialists } = await supabase
    .from('specialists')
    .select('id, first_name, last_name, specialty')
    .eq('business_id', businessId)
    .limit(10)

  const { data: hours } = await supabase
    .from('business_operating_hours')
    .select('day, open_time, close_time, is_closed')
    .eq('business_id', businessId)
    .order('day')

  const daysMap: Record<string, string> = {
    '0': 'Domingo',
    '1': 'Lunes',
    '2': 'Martes',
    '3': 'Miércoles',
    '4': 'Jueves',
    '5': 'Viernes',
    '6': 'Sábado',
  }

  const operatingHours =
    hours
      ?.filter((h) => !h.is_closed)
      .map((h) => `${daysMap[h.day]}: ${h.open_time} - ${h.close_time}`)
      .join('\n') || 'No especificado'

  const bogotaDate = new Date().toLocaleString('es-CO', {
    timeZone: 'America/Bogota',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return {
    businessName: business?.name || 'Negocio',
    businessType: business?.type || 'Salón de belleza',
    phone: business?.phone_number,
    services:
      services?.map((s) => ({
        id: s.id,
        name: s.name,
        duration: s.duration_minutes,
        price: s.price_cents,
      })) || [],
    specialists:
      specialists?.map((s) => ({
        id: s.id,
        name: `${s.first_name} ${s.last_name || ''}`.trim(),
        specialty: s.specialty || 'General',
      })) || [],
    operatingHours,
    currentDateTime: bogotaDate,
    assistantName,
  }
}

function getPromptForIntent(intent: Intent, context: BusinessContext): string {
  switch (intent) {
    case 'BOOKING':
      return createBookingPrompt(context)
    case 'INQUIRY':
      return createInquiryPrompt(context)
    case 'AVAILABILITY':
      return createAvailabilityPrompt(context)
    case 'RESCHEDULE':
      return createReschedulePrompt(context)
    case 'CANCEL':
      return createCancelPrompt(context)
    case 'SESSION_END':
      // Para SESSION_END no usamos LLM, solo enviamos mensaje predefinido
      return '' // No se usará ya que manejamos directamente
    case 'GENERAL':
    default:
      return createGeneralPrompt(context)
  }
}

function getToolsForIntent(
  intent: Intent,
  businessId: string,
  sessionId: string
) {
  const ctx = { businessId, sessionId }

  const allTools = [
    createGetServicesTool(ctx, handleGetServices),
    createGetSpecialistsTool(ctx, handleGetSpecialists),
    createGetAvailableSlotsTool(ctx, handleGetAvailableSlots),
    createGetAppointmentsByPhoneTool(ctx, handleGetAppointmentsByPhone),
    createCreateCustomerTool(ctx, handleCreateCustomer),
    createCreateAppointmentTool(ctx, handleCreateAppointment),
    createCancelAppointmentTool(ctx, handleCancelAppointment),
    createRescheduleAppointmentTool(ctx, handleRescheduleAppointment),
  ]

  // Todos los intents tienen acceso a todos los tools para evitar problemas
  // cuando el router clasifica incorrectamente
  return allTools
}

export async function createAppointmentAgent(config: BusinessAgentConfig) {
  const context = await getBusinessContext(config.businessId)
  const ctx = { businessId: config.businessId, sessionId: config.sessionId }

  const tools = [
    createGetServicesTool(ctx, handleGetServices),
    createGetSpecialistsTool(ctx, handleGetSpecialists),
    createGetAvailableSlotsTool(ctx, handleGetAvailableSlots),
    createGetAppointmentsByPhoneTool(ctx, handleGetAppointmentsByPhone),
    createCreateCustomerTool(ctx, handleCreateCustomer),
    createCreateAppointmentTool(ctx, handleCreateAppointment),
    createCancelAppointmentTool(ctx, handleCancelAppointment),
    createRescheduleAppointmentTool(ctx, handleRescheduleAppointment),
  ]

  const model = createMainModel().bindTools(tools)
  const toolNode = new ToolNode(tools)

  async function agentNode(state: AgentStateType) {
    const systemMessage = new SystemMessage(createBookingPrompt(context))
    const messages = [systemMessage, ...state.messages]
    const response = await model.invoke(messages)
    return { messages: [response] }
  }

  function shouldContinue(state: AgentStateType): 'tools' | typeof END {
    const lastMessage = state.messages[state.messages.length - 1]
    if (
      lastMessage &&
      'tool_calls' in lastMessage &&
      Array.isArray(lastMessage.tool_calls) &&
      lastMessage.tool_calls.length > 0
    ) {
      return 'tools'
    }
    return END
  }

  const workflow = new StateGraph(AgentState)
    .addNode('agent', agentNode)
    .addNode('tools', toolNode)
    .addEdge(START, 'agent')
    .addConditionalEdges('agent', shouldContinue)
    .addEdge('tools', 'agent')

  return workflow.compile()
}

async function detectIntent(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<Intent> {
  if (messages.length === 0) return 'GENERAL'

  const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user')
  if (!lastUserMessage) return 'GENERAL'

  const conversationContext = getConversationContext(messages.slice(0, -1))
  const result = await routeIntent(lastUserMessage.content, conversationContext)

  console.log(
    `[Router] Intent: ${result.intent} (confidence: ${result.confidence})`
  )
  return result.intent
}

async function processWithTools(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  model: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tools: any[],
  formattedMessages: BaseMessage[],
  maxLoops: number = 5
): Promise<{ response: AIMessage; toolResults: ToolMessage[] }> {
  const retryState: Map<
    string,
    { count: number; lastError: ErrorInfo | null }
  > = new Map()
  let response = (await model.invoke(formattedMessages)) as AIMessage
  let loopCount = 0
  const allToolResults: ToolMessage[] = []

  while (
    'tool_calls' in response &&
    Array.isArray(response.tool_calls) &&
    response.tool_calls.length > 0 &&
    loopCount < maxLoops
  ) {
    loopCount++
    console.log(`[AI Agent] Tool loop iteration ${loopCount}`)

    const toolResults: BaseMessage[] = []

    for (const toolCall of response.tool_calls) {
      console.log(
        '[AI Agent] Tool call:',
        toolCall.name,
        'args:',
        JSON.stringify(toolCall.args)
      )
      const tool = tools.find((t) => t.name === toolCall.name)

      if (tool) {
        const toolRetryKey = `${toolCall.name}_${JSON.stringify(toolCall.args)}`
        let retryInfo = retryState.get(toolRetryKey) || {
          count: 0,
          lastError: null,
        }
        let result: string | null = null
        let lastError: ErrorInfo | null = null

        const maxRetries = 2
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const rawResult = await (tool as any).invoke(toolCall.args)
            result =
              typeof rawResult === 'string'
                ? rawResult
                : JSON.stringify(rawResult)

            if (result.toLowerCase().includes('error')) {
              const errorInfo = createErrorInfo(
                toolCall.name,
                result,
                toolCall.args
              )
              console.log(
                '[AI Agent] Tool returned error:',
                errorInfo.errorType
              )

              if (errorInfo.errorType === 'temporary' && attempt < maxRetries) {
                console.log(
                  `[AI Agent] Retrying ${toolCall.name} (attempt ${
                    attempt + 1
                  }/${maxRetries})`
                )
                await new Promise((resolve) =>
                  setTimeout(resolve, 1000 * (attempt + 1))
                )
                continue
              }

              lastError = errorInfo
              result = formatErrorForAgent(errorInfo)
            }
            break
          } catch (toolError) {
            const errorMessage =
              toolError instanceof Error
                ? toolError.message
                : 'Error desconocido'
            const errorInfo = createErrorInfo(
              toolCall.name,
              errorMessage,
              toolCall.args
            )
            console.error(
              '[AI Agent] Tool exception:',
              toolCall.name,
              errorInfo.errorType
            )

            if (shouldRetry(errorInfo, attempt) && attempt < maxRetries) {
              await new Promise((resolve) =>
                setTimeout(resolve, 1000 * (attempt + 1))
              )
              continue
            }

            lastError = errorInfo
            result = formatErrorForAgent(errorInfo)
            break
          }
        }

        if (lastError) {
          retryInfo = { count: retryInfo.count + 1, lastError }
          retryState.set(toolRetryKey, retryInfo)
        }

        const toolMessage = new ToolMessage({
          content: result || 'Error: No se obtuvo resultado',
          tool_call_id: toolCall.id || `call_${toolCall.name}_${Date.now()}`,
          name: toolCall.name,
        })
        toolResults.push(toolMessage)
        allToolResults.push(toolMessage)
      }
    }

    formattedMessages.push(response)
    formattedMessages.push(...toolResults)
    response = (await model.invoke(formattedMessages)) as AIMessage
  }

  return { response, toolResults: allToolResults }
}

function cleanResponseContent(content: string): string {
  let cleaned = content
    .replace(/\[.*?esperando.*?\]/gi, '')
    .replace(/\[.*?waiting.*?\]/gi, '')
    .replace(/\[.*?respuesta.*?\]/gi, '')
    .replace(/\[.*?response.*?\]/gi, '')
    .replace(/\[.*?proceso.*?\]/gi, '')
    .replace(/\[.*?processing.*?\]/gi, '')
    .replace(/\(.*?waiting.*?\)/gi, '')
    .replace(/\(.*?esperando.*?\)/gi, '')
    .trim()

  if (!cleaned) {
    cleaned = '¿En qué más puedo ayudarte?'
  }

  return cleaned
}

export async function* streamAgentResponse(
  businessId: string,
  sessionId: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
): AsyncGenerator<string> {
  console.log(
    '[AI Agent] streamAgentResponse started, messages:',
    messages.length,
    'sessionId:',
    sessionId
  )

  const context = await getBusinessContext(businessId)
  const intent = await detectIntent(messages)
  console.log(`[AI Agent] Detected intent: ${intent}`)

  const tools = getToolsForIntent(intent, businessId, sessionId)
  const model = createMainModel().bindTools(tools)
  const systemPrompt = getPromptForIntent(intent, context)

  const formattedMessages: BaseMessage[] = [
    new SystemMessage(systemPrompt),
    ...messages.map((msg) =>
      msg.role === 'user'
        ? new HumanMessage(msg.content)
        : new AIMessage(msg.content)
    ),
  ]

  const { response } = await processWithTools(model, tools, formattedMessages)

  let content =
    typeof response.content === 'string'
      ? response.content
      : JSON.stringify(response.content)

  content = cleanResponseContent(content)

  const words = content.split(' ')
  for (const word of words) {
    if (word.trim()) {
      yield word + ' '
      await new Promise((resolve) => setTimeout(resolve, 30))
    }
  }
}

export async function* streamAgentResponseWithFeedback(
  businessId: string,
  sessionId: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  assistantName?: string
): AsyncGenerator<StreamEvent> {
  console.log(
    '[AI Agent] streamAgentResponseWithFeedback started, messages:',
    messages.length,
    'sessionId:',
    sessionId
  )

  const context = await getBusinessContext(businessId, assistantName)
  const intent = await detectIntent(messages)
  console.log(`[AI Agent] Detected intent: ${intent}`)

  yield { type: 'intent', intent }

  // 🎯 NUEVO: Manejo de finalización de sesión
  if (intent === 'SESSION_END') {
    console.log('[AI Agent] Session end detected, sending goodbye')
    yield { 
      type: 'chunk', 
      content: '¡Gracias por visitarnos! Que tengas un excelente día. 😊' 
    }
    yield { 
      type: 'session_end', 
      message: 'Sesión finalizada por el usuario',
      reason: 'user_session_end' 
    }
    return // Terminar el stream inmediatamente
  }

  const tools = getToolsForIntent(intent, businessId, sessionId)
  const model = createMainModel().bindTools(tools)
  const systemPrompt = getPromptForIntent(intent, context)

  const formattedMessages: BaseMessage[] = [
    new SystemMessage(systemPrompt),
    ...messages.map((msg) =>
      msg.role === 'user'
        ? new HumanMessage(msg.content)
        : new AIMessage(msg.content)
    ),
  ]

  let response = (await model.invoke(formattedMessages)) as AIMessage
  let loopCount = 0
  const maxLoops = 5
  const retryState: Map<
    string,
    { count: number; lastError: ErrorInfo | null }
  > = new Map()

  // Debug: Log response structure
  console.log(
    '[AI Agent] Initial response tool_calls:',
    JSON.stringify(response.tool_calls, null, 2)
  )
  console.log(
    '[AI Agent] Response content preview:',
    typeof response.content === 'string'
      ? response.content.substring(0, 200)
      : 'non-string'
  )

  while (
    'tool_calls' in response &&
    Array.isArray(response.tool_calls) &&
    response.tool_calls.length > 0 &&
    loopCount < maxLoops
  ) {
    loopCount++
    console.log(`[AI Agent] Tool loop iteration ${loopCount}`)
    console.log(
      `[AI Agent] Tool calls in this iteration:`,
      JSON.stringify(response.tool_calls, null, 2)
    )

    const toolResults: BaseMessage[] = []

    for (const toolCall of response.tool_calls) {
      console.log(
        `[AI Agent] Processing tool call: ${toolCall.name}`,
        JSON.stringify(toolCall.args)
      )
      const [emoji, thinkingText] = getThinkingIndicator(toolCall.name)

      yield { type: 'tool_start', toolName: toolCall.name }
      yield {
        type: 'feedback',
        event: {
          type: 'thinking',
          message: `${emoji} ${thinkingText}`,
          toolName: toolCall.name,
          elapsedMs: 0,
        },
      }

      const tool = tools.find((t) => t.name === toolCall.name)
      console.log(
        `[AI Agent] Available tools:`,
        tools.map((t) => t.name)
      )
      console.log(
        `[AI Agent] Looking for tool: ${toolCall.name}, found: ${!!tool}`
      )
      if (tool) {
        const toolRetryKey = `${toolCall.name}_${JSON.stringify(toolCall.args)}`
        let retryInfo = retryState.get(toolRetryKey) || {
          count: 0,
          lastError: null,
        }
        let result: string | null = null
        let lastError: ErrorInfo | null = null
        let success = true

        const toolStartTime = Date.now()
        const maxRetries = 2

        // 🎯 Implementación simple de progress tracking con tiempos correctos
        console.log(`[Progress] Starting simple tracker for ${toolCall.name} at ${new Date().toISOString()}`)
        
        // Programar mensajes de progreso manuales
        const scheduleProgressMessage = (delayMs: number, type: string) => {
          setTimeout(() => {
            const elapsed = Date.now() - toolStartTime
            console.log(`[Progress] Emitting ${type} for ${toolCall.name} at ${elapsed}ms`)
            // Nota: No podemos hacer yield aquí directamente, necesitamos arquitectura diferente
          }, delayMs)
        }
        
        // Programar los delays según especificación
        scheduleProgressMessage(45000, 'working')   // 45s
        scheduleProgressMessage(60000, 'patience')  // 60s  
        scheduleProgressMessage(90000, 'apology')   // 90s
        
        console.log(`[Progress] Scheduled 3 progress messages for ${toolCall.name}: 45s, 60s, 90s`)

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          try {
            console.log(
              `[AI Agent] Invoking tool ${toolCall.name} with args:`,
              JSON.stringify(toolCall.args)
            )
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const rawResult = await (tool as any).invoke(toolCall.args)
            result =
              typeof rawResult === 'string'
                ? rawResult
                : JSON.stringify(rawResult)
            console.log(
              `[AI Agent] Tool ${toolCall.name} result:`,
              result.substring(0, 500)
            )

            // Removido: ahora el progress tracker maneja los tiempos
            //             const elapsed = Date.now() - toolStartTime
            // if (elapsed > 5000) {
            //   yield {
            //     type: 'feedback',
            //     event: {
            //       type: 'progress',
            //       message: 'Gracias por tu paciencia, ya casi termino...',
            //       toolName: toolCall.name,
            //       elapsedMs: elapsed,
            //     },
            //   }
            // }

            if (result.toLowerCase().includes('error')) {
              const errorInfo = createErrorInfo(
                toolCall.name,
                result,
                toolCall.args
              )

              if (errorInfo.errorType === 'temporary' && attempt < maxRetries) {
                yield {
                  type: 'feedback',
                  event: {
                    type: 'waiting',
                    message: 'Un momento, reintentando...',
                    toolName: toolCall.name,
                  elapsedMs: Date.now() - toolStartTime,
                  },
                }
                await new Promise((resolve) =>
                  setTimeout(resolve, 1000 * (attempt + 1))
                )
                continue
              }

              lastError = errorInfo
              result = formatErrorForAgent(errorInfo)
              success = false
            }
            break
          } catch (toolError) {
            const errorMessage =
              toolError instanceof Error
                ? toolError.message
                : 'Error desconocido'
            const errorInfo = createErrorInfo(
              toolCall.name,
              errorMessage,
              toolCall.args
            )

            if (shouldRetry(errorInfo, attempt) && attempt < maxRetries) {
              yield {
                type: 'feedback',
                event: {
                  type: 'waiting',
                  message: 'Hubo un pequeño problema, reintentando...',
                  toolName: toolCall.name,
                  elapsedMs: Date.now() - toolStartTime,
                },
              }
              await new Promise((resolve) =>
                setTimeout(resolve, 1000 * (attempt + 1))
              )
              continue
            }

            lastError = errorInfo
            result = formatErrorForAgent(errorInfo)
            success = false
            break
          }
        }

        if (lastError) {
          retryInfo = { count: retryInfo.count + 1, lastError }
          retryState.set(toolRetryKey, retryInfo)
        }

        yield { type: 'tool_end', toolName: toolCall.name, success }

        // No hay progress tracker activo que detener en esta implementación simple

        toolResults.push(
          new ToolMessage({
            content: result || 'Error: No se obtuvo resultado',
            tool_call_id: toolCall.id || `call_${toolCall.name}_${Date.now()}`,
            name: toolCall.name,
          })
        )
      }
    }

    formattedMessages.push(response)
    formattedMessages.push(...toolResults)

    try {
      response = (await model.invoke(formattedMessages)) as AIMessage
    } catch (modelError) {
      console.error('[AI Agent] Model invocation error:', modelError)
      throw modelError
    }
  }

  let content =
    typeof response.content === 'string'
      ? response.content
      : JSON.stringify(response.content)

  content = cleanResponseContent(content)

  const words = content.split(' ')
  for (const word of words) {
    if (word.trim()) {
      yield { type: 'chunk', content: word + ' ' }
      await new Promise((resolve) => setTimeout(resolve, 30))
    }
  }
}

export async function invokeAgent(
  businessId: string,
  sessionId: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  _modelConfig?: Record<string, unknown>
) {
  const agent = await createAppointmentAgent({ businessId, sessionId })

  const formattedMessages: BaseMessage[] = messages.map((msg) =>
    msg.role === 'user'
      ? new HumanMessage(msg.content)
      : new AIMessage(msg.content)
  )

  const result = await agent.invoke({
    messages: formattedMessages,
    businessId,
  })

  const lastMessage = result.messages[result.messages.length - 1]
  return {
    content:
      typeof lastMessage.content === 'string'
        ? lastMessage.content
        : JSON.stringify(lastMessage.content),
    messages: result.messages,
  }
}
