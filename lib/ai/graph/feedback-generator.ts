import { ChatOpenAI } from '@langchain/openai'

const FEEDBACK_CONTEXTS: Record<string, string> = {
  get_services: 'consultando los servicios disponibles',
  get_specialists: 'buscando los especialistas',
  get_available_slots: 'verificando la disponibilidad de horarios',
  get_appointments_by_phone: 'buscando tus citas anteriores',
  create_appointment: 'agendando tu cita',
  cancel_appointment: 'cancelando la cita',
  reschedule_appointment: 'reprogramando la cita',
}

const DELAY_MESSAGES = [
  { delay: 45000, type: 'working' },
  { delay: 60000, type: 'patience' },
  { delay: 90000, type: 'apology' },
]

let feedbackModel: ChatOpenAI | null = null

function getFeedbackModel(): ChatOpenAI {
  if (!feedbackModel) {
    const apiKey = process.env.DEEPINFRA_API_KEY
    if (!apiKey) {
      throw new Error('DEEPINFRA_API_KEY environment variable is not set')
    }

    feedbackModel = new ChatOpenAI({
      model: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
      temperature: 0.5,
      maxTokens: 60,
      apiKey: apiKey,
      configuration: {
        baseURL: 'https://api.deepinfra.com/v1/openai',
      },
    })
  }
  return feedbackModel
}

export interface FeedbackEvent {
  type: 'thinking' | 'progress' | 'waiting'
  message: string
  toolName?: string
  elapsedMs?: number
}

export async function generateFeedbackMessage(
  toolName: string,
  elapsedMs: number,
  businessName: string
): Promise<string> {
  const context = FEEDBACK_CONTEXTS[toolName] || 'procesando tu solicitud'

  // For quick responses, use predefined messages
  if (elapsedMs < DELAY_MESSAGES[0].delay) {
    return getQuickFeedback(toolName)
  }

  // For longer waits, use the LLM to generate contextual message
  try {
    const model = getFeedbackModel()
    const messageType = getMessageType(elapsedMs)

    const prompt = buildFeedbackPrompt(
      context,
      messageType,
      businessName,
      elapsedMs
    )
    const response = await model.invoke(prompt)

    const content =
      typeof response.content === 'string'
        ? response.content
        : JSON.stringify(response.content)

    return content.trim().replace(/^["']|["']$/g, '')
  } catch (error) {
    console.error('[Feedback] Error generating message:', error)
    return getFallbackMessage(elapsedMs, context)
  }
}

function getQuickFeedback(toolName: string): string {
  const context = FEEDBACK_CONTEXTS[toolName] || 'procesando'
  const messages: Record<string, string[]> = {
    get_services: ['Revisando servicios...', 'Un momento...'],
    get_specialists: ['Buscando especialistas...', 'Consultando equipo...'],
    get_available_slots: ['Verificando horarios...', 'Consultando agenda...'],
    get_appointments_by_phone: [
      'Buscando tus citas...',
      'Revisando historial...',
    ],
    create_appointment: ['Agendando...', 'Confirmando cita...'],
    cancel_appointment: ['Procesando cancelación...'],
    reschedule_appointment: ['Reprogramando...'],
  }

  const toolMessages = messages[toolName] || [`Estoy ${context}...`]
  return toolMessages[Math.floor(Math.random() * toolMessages.length)]
}

function getMessageType(elapsedMs: number): 'working' | 'patience' | 'apology' {
  if (elapsedMs >= DELAY_MESSAGES[2].delay) return 'apology'
  if (elapsedMs >= DELAY_MESSAGES[1].delay) return 'patience'
  return 'working'
}

function buildFeedbackPrompt(
  context: string,
  messageType: 'working' | 'patience' | 'apology',
  businessName: string,
  elapsedMs: number
): string {
  const seconds = Math.round(elapsedMs / 1000)

  const typeInstructions = {
    working: `Genera un mensaje corto y amigable indicando que estás ${context}. Máximo 15 palabras.`,
    patience: `Han pasado ${seconds} segundos. Genera un mensaje pidiendo paciencia mientras ${context}. Sé cálido. Máximo 20 palabras.`,
    apology: `Han pasado ${seconds} segundos. Genera un mensaje disculpándote por la espera mientras ${context}. Sé muy amable. Máximo 25 palabras.`,
  }

  return `Eres el asistente virtual de ${businessName}.
${typeInstructions[messageType]}
Responde SOLO con el mensaje, sin comillas ni explicaciones.
Usa español colombiano casual y cálido.`
}

function getFallbackMessage(elapsedMs: number, context: string): string {
  if (elapsedMs >= DELAY_MESSAGES[2].delay) {
    return `Disculpa la espera, estoy ${context}. Ya casi termino...`
  }
  if (elapsedMs >= DELAY_MESSAGES[1].delay) {
    return `Gracias por tu paciencia, sigo ${context}...`
  }
  return `Estoy ${context}, un momento...`
}

export function createProgressTracker(
  toolName: string,
  onFeedback: (event: FeedbackEvent) => void
): { start: () => void; stop: () => void } {
  let startTime: number
  let intervals: NodeJS.Timeout[] = []
  let stopped = false

  const start = () => {
    startTime = Date.now()
    stopped = false

    // Emit initial thinking indicator
    onFeedback({
      type: 'thinking',
      message: getQuickFeedback(toolName),
      toolName,
      elapsedMs: 0,
    })

    // Schedule feedback messages at intervals
    DELAY_MESSAGES.forEach(({ delay }) => {
      const timeout = setTimeout(async () => {
        if (stopped) return

        const elapsedMs = Date.now() - startTime
        onFeedback({
          type: 'progress',
          message: getFallbackMessage(
            elapsedMs,
            FEEDBACK_CONTEXTS[toolName] || 'procesando'
          ),
          toolName,
          elapsedMs,
        })
      }, delay)

      intervals.push(timeout)
    })
  }

  const stop = () => {
    stopped = true
    intervals.forEach(clearTimeout)
    intervals = []
  }

  return { start, stop }
}

export function getThinkingIndicator(toolName: string): string[] {
  const indicators: Record<string, string[]> = {
    get_services: ['📋', 'Revisando catálogo...'],
    get_specialists: ['👥', 'Consultando equipo...'],
    get_available_slots: ['📅', 'Verificando agenda...'],
    get_appointments_by_phone: ['🔍', 'Buscando registros...'],
    create_appointment: ['✨', 'Creando tu cita...'],
    cancel_appointment: ['🗑️', 'Procesando...'],
    reschedule_appointment: ['🔄', 'Actualizando...'],
  }

  return indicators[toolName] || ['⏳', 'Procesando...']
}

export async function generateWaitingMessage(
  elapsedSeconds: number,
  businessName: string,
  currentTask?: string
): Promise<string> {
  try {
    const model = getFeedbackModel()

    const taskContext = currentTask
      ? `Estás ${currentTask}.`
      : 'Estás procesando una solicitud del cliente.'

    const prompt =
      elapsedSeconds <= 5
        ? `Eres el asistente virtual de ${businessName}. ${taskContext}
Genera un mensaje MUY corto (máximo 10 palabras) indicando que estás trabajando en ello.
Sé cálido y natural. Usa español casual.
Responde SOLO con el mensaje, sin comillas.`
        : `Eres el asistente virtual de ${businessName}. ${taskContext}
Han pasado ${elapsedSeconds} segundos. El cliente está esperando.
Genera un mensaje corto (máximo 15 palabras) pidiendo paciencia de forma cálida y amigable.
Puedes usar frases como "ya casi", "un momentito más", etc.
Responde SOLO con el mensaje, sin comillas.`

    const response = await model.invoke(prompt)
    const content =
      typeof response.content === 'string'
        ? response.content
        : JSON.stringify(response.content)

    return content.trim().replace(/^["']|["']$/g, '')
  } catch (error) {
    console.error('[Feedback] Error generating waiting message:', error)
    return elapsedSeconds <= 5
      ? 'Un momento, estoy en ello...'
      : 'Gracias por tu paciencia, ya casi termino...'
  }
}
