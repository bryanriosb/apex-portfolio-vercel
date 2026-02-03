import { NextRequest } from 'next/server'
import { createAgent } from '@/lib/ai/agent-factory'
import { AI_CONFIG } from '@/lib/ai/config-provider'
import {
  validateAndConsumeLink,
  addMessageAction,
  fetchConversationMessagesAction,
} from '@/lib/actions/ai-agent'
import { generateWaitingMessage } from '@/lib/ai/graph/feedback-generator'
import type { AgentMessage } from '@/lib/models/ai-conversation'
import { OptimizedTTSBuffer } from '@/lib/services/tts/optimized-buffer'

export const maxDuration = 60

/**
 * Clase para buffering de texto optimizado para TTS.
 * Acumula texto hasta encontrar un punto de corte natural (., !, ?, :, \n)
 * y lo envía como chunk completo para síntesis de voz más rápida.
 */
class TTSBuffer {
  private buffer = ''
  private readonly sentenceEnders = /([.!?:]\s*|\n)/

  /**
   * Agrega texto al buffer y retorna oraciones completas listas para TTS.
   * @returns Array de oraciones completas, o vacío si aún no hay oraciones completas
   */
  push(text: string): string[] {
    this.buffer += text
    const sentences: string[] = []

    // Buscar oraciones completas
    let match: RegExpExecArray | null
    while ((match = this.sentenceEnders.exec(this.buffer)) !== null) {
      const endIndex = match.index + match[0].length
      const sentence = this.buffer.slice(0, endIndex).trim()
      if (sentence) {
        sentences.push(sentence)
      }
      this.buffer = this.buffer.slice(endIndex)
    }

    return sentences
  }

  /**
   * Retorna cualquier texto restante en el buffer (para el final del stream)
   */
  flush(): string | null {
    const remaining = this.buffer.trim()
    this.buffer = ''
    return remaining || null
  }
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder()

  try {
    const body = await request.json()
    const { message, session, token } = body

    if (!message || !session) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Mensaje y sesión requeridos',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (token) {
      const validation = await validateAndConsumeLink(token)
      if (!validation.valid) {
        return new Response(
          JSON.stringify({
            success: false,
            error: validation.error,
            expired: true,
          }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        )
      }
    }

    await addMessageAction({
      conversation_id: session.conversationId,
      role: 'user',
      content: message,
    })

    const messagesResult = await fetchConversationMessagesAction(
      session.conversationId
    )
    if (!messagesResult.success || !messagesResult.data) {
      return new Response(
        JSON.stringify({ success: false, error: 'Error al obtener historial' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const chatHistory = messagesResult.data
      .filter((m: AgentMessage) => m.role === 'user' || m.role === 'assistant')
      .map((m: AgentMessage) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }))

    let fullResponse = ''
    const abortController = new AbortController()
    let isClosed = false
    const fallbackTimeouts: NodeJS.Timeout[] = []

    request.signal.addEventListener('abort', () => {
      abortController.abort()
      fallbackTimeouts.forEach(clearTimeout)
    })

    const stream = new ReadableStream({
      async start(controller) {
        let hasStartedResponse = false
        const businessName = session.settings?.assistant_name || 'el asistente'

        // Buffer optimizado ULTRA-BAJA LATENCIA (único buffer para evitar duplicación)
        const optimizedTTSBuffer = new OptimizedTTSBuffer(
          // Callback principal: enviar chunks optimizados al cliente
          (text: string) => {
            if (!isClosed && !abortController.signal.aborted) {
              console.log('[Optimized TTS] Sending chunk:', text)
              sendEvent('tts_chunk', {
                text,
                isFinal: false,
              })
            }
          },
          // Callback inmediato para flush forzado
          (text: string) => {
            console.log('[Optimized TTS] Forced flush:', text)
          }
        )

        const sendEvent = (event: string, data: unknown) => {
          if (isClosed || abortController.signal.aborted) return
          try {
            controller.enqueue(
              encoder.encode(
                `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
              )
            )
          } catch {
            // Controller may be closed
          }
        }

        const closeStream = () => {
          if (isClosed) return
          isClosed = true
          fallbackTimeouts.forEach(clearTimeout)
          try {
            controller.close()
          } catch {
            // Already closed
          }
        }

        // Fallback system: solo para respuesta inicial (sin conflicto con progress tracker)
        const fallbackDelays = [35000, 45000] // Aumentados para no interferir con progress tracking
        fallbackDelays.forEach((delay) => {
          const timeout = setTimeout(async () => {
            if (
              !hasStartedResponse &&
              !abortController.signal.aborted &&
              !isClosed
            ) {
              console.log(
                `[Fallback] Triggering fallback at ${delay}ms since no response started`
              )
              const waitingMessage = await generateWaitingMessage(
                delay / 1000,
                businessName
              )
              sendEvent('fallback', { message: waitingMessage, speak: true })
            }
          }, delay)
          fallbackTimeouts.push(timeout)
        })

        try {
          sendEvent('typing', { isTyping: true })

          const agent = await createAgent(
            AI_CONFIG.provider, // Usar configuración del archivo config-provider.ts
            session.businessId,
            session.sessionId
          )

          const responseStream = agent.streamResponse(chatHistory, {
            assistantName: session.settings?.assistant_name,
          })

          for await (const event of responseStream) {
            if (abortController.signal.aborted || isClosed) {
              sendEvent('interrupted', {})
              break
            }

            switch (event.type) {
              case 'chunk':
                if (!hasStartedResponse) {
                  hasStartedResponse = true
                  fallbackTimeouts.forEach(clearTimeout)
                }
                fullResponse += event.content

                // BUFFER ÚNICO OPTIMIZADO: Evita duplicación y loops
                // Estrategia: 3 tokens o 50ms, lo que ocurra primero
                optimizedTTSBuffer.pushText(event.content)

                // También enviar el chunk raw para UI
                sendEvent('message', {
                  chunk: event.content,
                  isComplete: false,
                })
                break

              case 'feedback':
                sendEvent('feedback', {
                  type: event.event.type,
                  message: event.event.message,
                  toolName: event.event.toolName,
                })
                break

              case 'tool_start':
                sendEvent('tool', { status: 'start', toolName: event.toolName })
                break

              case 'tool_end':
                sendEvent('tool', {
                  status: 'end',
                  toolName: event.toolName,
                  success: event.success,
                })
                break

              case 'intent':
                sendEvent('intent', { intent: event.intent })
                break

              case 'error':
                console.error('[Agent Error]', event.error)
                sendEvent('error', { error: event.error })
                break

              case 'feedback':
                console.log('[Feedback]', event.event.type, event.event.message)
                sendEvent('feedback', {
                  type: event.event.type,
                  message: event.event.message,
                  toolName: event.event.toolName,
                })
                break

              case 'session_end':
                sendEvent('session_end', {
                  message: event.message,
                  reason: event.reason,
                })
                break
            }
          }

          // Flush buffer optimizado (único)
          optimizedTTSBuffer.flush()

          // Destruir buffer optimizado INMEDIATAMENTE (no más timeout)
          optimizedTTSBuffer.destroy()

          // Marcar fin del TTS
          sendEvent('tts_chunk', { text: '', isFinal: true })

          // Si no hubo respuesta y no fue abortado, enviar un mensaje de fallback
          if (
            !hasStartedResponse &&
            !abortController.signal.aborted &&
            !isClosed
          ) {
            const fallbackMessage = `Lo siento, no pude generar una respuesta. Por favor, intenta reformular tu pregunta.`
            fullResponse = fallbackMessage
            sendEvent('message', {
              chunk: fallbackMessage,
              isComplete: false,
            })
          }

          if (!abortController.signal.aborted && fullResponse.trim()) {
            await addMessageAction({
              conversation_id: session.conversationId,
              role: 'assistant',
              content: fullResponse,
            })
          }

          sendEvent('message', { chunk: '', isComplete: true })
          sendEvent('typing', { isTyping: false })
          closeStream()
        } catch (error) {
          // Limpiar buffer optimizado en caso de error
          try {
            optimizedTTSBuffer.destroy()
          } catch (cleanupError) {
            console.error(
              '[SSE] Error cleaning up optimized buffer:',
              cleanupError
            )
          }

          fallbackTimeouts.forEach(clearTimeout)
          const errorMessage =
            error instanceof Error ? error.message : 'Error desconocido'
          console.error('[SSE] Stream error:', errorMessage)
          console.error(
            '[SSE] Stack:',
            error instanceof Error ? error.stack : 'No stack'
          )

          // Enviar error al cliente
          sendEvent('error', { error: errorMessage })

          // Si no hay contenido acumulado, enviar mensaje de error amigable
          if (!fullResponse.trim()) {
            const userFriendlyMessage =
              'Lo siento, estoy teniendo dificultades para responder. Por favor, intenta de nuevo en unos momentos.'
            fullResponse = userFriendlyMessage
            sendEvent('message', {
              chunk: userFriendlyMessage,
              isComplete: false,
            })
          }

          closeStream()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    console.error('[SSE] Error in agent chat:', errorMessage)
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
