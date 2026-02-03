import { NextRequest, NextResponse } from 'next/server'
import { startAgentSession } from '@/lib/services/ai-agent'

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token requerido' },
        { status: 400 }
      )
    }

    const result = await startAgentSession(token)

    if (!result.success || !result.session) {
      return NextResponse.json(
        { success: false, error: result.error || 'Error al iniciar sesión' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      session: {
        sessionId: result.session.sessionId,
        conversationId: result.session.conversationId,
        businessId: result.session.businessId,
        settings: result.session.settings,
      },
      welcomeMessage: result.message || '¡Hola! ¿En qué puedo ayudarte?',
    })
  } catch (error) {
    console.error('[API] Session error:', error)
    const message = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
