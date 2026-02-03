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

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      session: {
        sessionId: result.session?.sessionId,
        conversationId: result.session?.conversationId,
        businessId: result.session?.businessId,
        settings: result.session?.settings,
      },
    })
  } catch (error) {
    console.error('Error starting agent session:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
