import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/actions/supabase'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const clientId = searchParams.get('client_id')
  const executionId = searchParams.get('execution_id')
  const messageId = searchParams.get('message_id')

  if (!clientId) {
    return new NextResponse(trackPixelResponse(), {
      headers: {
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })
  }

  try {
    const supabase = await getSupabaseAdminClient()

    const { error: updateError } = await supabase
      .from('collection_clients')
      .update({
        status: 'opened',
        custom_data: {
          opened_at: new Date().toISOString(),
          message_id: messageId,
        },
      })
      .eq('id', clientId)

    if (updateError) {
      console.error('Error updating client status:', updateError)
    } else {
      console.log(`Client ${clientId} marked as opened`)

      if (executionId) {
        const { error: counterError } = await supabase.rpc('increment_execution_counter', {
          p_execution_id: executionId,
          p_column: 'emails_opened',
        })

        if (counterError) {
          console.error('Error incrementing counter:', counterError)
        }
      }

      await supabase.from('collection_events').insert({
        client_id: clientId,
        execution_id: executionId,
        event_type: 'email_opened',
        event_data: {
          message_id: messageId,
          timestamp: new Date().toISOString(),
          user_agent: request.headers.get('user-agent'),
        },
      })
    }
  } catch (error) {
    console.error('Error tracking open:', error)
  }

  return new NextResponse(trackPixelResponse(), {
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  })
}

function trackPixelResponse(): string {
  const width = 1
  const height = 1
  const transparent = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
  return Buffer.from(transparent, 'base64').toString('binary')
}
