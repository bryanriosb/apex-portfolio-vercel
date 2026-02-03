import { NextRequest } from 'next/server'
import { getFishAudioApiKey, getFishAudioVoiceId } from '@/lib/services/tts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { text, referenceId } = await request.json()

    if (!text || typeof text !== 'string') {
      return Response.json({ error: 'Text is required' }, { status: 400 })
    }

    const apiKey = getFishAudioApiKey()
    const voiceId = referenceId || getFishAudioVoiceId()

    const response = await fetch('https://api.fish.audio/v1/tts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'model': 's1',
      },
      body: JSON.stringify({
        text,
        reference_id: voiceId,
        format: 'mp3',
        latency: 'balanced',
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[TTS] Fish Audio error:', response.status, errorText)
      return Response.json({ error: `TTS failed: ${response.status}` }, { status: response.status })
    }

    if (!response.body) {
      return Response.json({ error: 'No response body' }, { status: 500 })
    }

    return new Response(response.body, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('[TTS] Error:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
