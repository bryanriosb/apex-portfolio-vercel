import { NextRequest, NextResponse } from 'next/server'
import { endSession, type AgentSession } from '@/lib/services/ai-agent'

export async function POST(request: NextRequest) {
  try {
    const { session } = await request.json()

    if (!session?.conversationId) {
      return NextResponse.json(
        { success: false, error: 'Sesión requerida' },
        { status: 400 }
      )
    }

    const agentSession: AgentSession = {
      sessionId: session.sessionId,
      conversationId: session.conversationId,
      businessId: session.businessId,
      linkId: session.linkId || null,
      settings: session.settings || {},
    }

    const result = await endSession(agentSession)

    return NextResponse.json({
      success: result.success,
      error: result.error,
    })
  } catch (error) {
    console.error('Error ending agent session:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
