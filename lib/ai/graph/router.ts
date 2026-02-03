import { ChatOpenAI } from '@langchain/openai'

export type Intent =
  | 'BOOKING'
  | 'INQUIRY'
  | 'AVAILABILITY'
  | 'RESCHEDULE'
  | 'CANCEL'
  | 'GENERAL'
  | 'SESSION_END'

export interface RouterResult {
  intent: Intent
  confidence: number
  extractedInfo?: {
    serviceMentioned?: string
    dateMentioned?: string
    hasExistingAppointment?: boolean
  }
}

const ROUTER_SYSTEM_PROMPT = `You classify user intents for a beauty salon assistant.

INTENTS:
- BOOKING: User wants to CREATE a new appointment (agendar, reservar, hacer cita)
- INQUIRY: User asks about services, prices, or their existing appointments (cuánto cuesta, mis citas)
- AVAILABILITY: User checks available times without booking (disponibilidad, qué horarios)
- RESCHEDULE: User wants to CHANGE an existing appointment (cambiar cita, reprogramar)
- CANCEL: User wants to CANCEL an appointment (cancelar, anular)
- SESSION_END: User wants to END conversation (adiós, hasta luego, no quiero nada más, nada más, eso es todo, chao, ya está, me voy, listo, gracias adiós)
- GENERAL: Greetings, thanks, unclear, or other general conversation (hola, gracias, buenos días)

RULES:
- Greetings alone → GENERAL
- Saying goodbye, ending conversation → SESSION_END
- Asking about prices/services → INQUIRY
- Wants to book → BOOKING
- Change existing appointment → RESCHEDULE
- Cancel appointment → CANCEL
- Phrases like "no quiero nada más", "nada más", "eso es todo" → SESSION_END

OUTPUT: Return ONLY valid JSON, nothing else:
{"intent":"INTENT_NAME","confidence":0.9}`

function createRouterModel() {
  const apiKey = process.env.DEEPINFRA_API_KEY
  if (!apiKey) {
    throw new Error('DEEPINFRA_API_KEY environment variable is not set')
  }

  return new ChatOpenAI({
    model: 'openai/gpt-oss-20b',
    temperature: 0.1,
    maxTokens: 100,
    apiKey,
    configuration: {
      baseURL: 'https://api.deepinfra.com/v1/openai',
    },
  })
}

export async function routeIntent(
  userMessage: string,
  conversationContext?: string
): Promise<RouterResult> {
  const model = createRouterModel()

  const contextInfo = conversationContext
    ? `\n\nConversation context (previous messages summary): ${conversationContext}`
    : ''

  const prompt = `${ROUTER_SYSTEM_PROMPT}${contextInfo}

User message: "${userMessage}"`

  try {
    const response = await model.invoke(prompt)
    const content = typeof response.content === 'string'
      ? response.content
      : JSON.stringify(response.content)

    const jsonMatch = content.match(/\{[\s\S]*?\}/)
    if (!jsonMatch) {
      console.warn('[Router] Could not parse JSON, defaulting to GENERAL:', content)
      return { intent: 'GENERAL', confidence: 0.5 }
    }

    const parsed = JSON.parse(jsonMatch[0])
    const intent = validateIntent(parsed.intent)

    return {
      intent,
      confidence: parsed.confidence || 0.8,
      extractedInfo: parsed.extractedInfo,
    }
  } catch (error) {
    console.error('[Router] Error classifying intent:', error)
    return { intent: 'GENERAL', confidence: 0.3 }
  }
}

function validateIntent(intent: string): Intent {
  const validIntents: Intent[] = ['BOOKING', 'INQUIRY', 'AVAILABILITY', 'RESCHEDULE', 'CANCEL', 'GENERAL', 'SESSION_END']
  const normalized = intent?.toUpperCase() as Intent
  return validIntents.includes(normalized) ? normalized : 'GENERAL'
}

export function getConversationContext(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
): string {
  if (messages.length === 0) return ''

  const recentMessages = messages.slice(-4)
  return recentMessages
    .map(m => `${m.role === 'user' ? 'Cliente' : 'Asistente'}: ${m.content.substring(0, 100)}`)
    .join(' | ')
}
