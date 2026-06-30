import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import {
  sendWhatsAppTextMessageAction,
  sendWhatsAppTemplateMessageAction
} from '@/lib/actions/whatsapp'

const SECRET = process.env.API_SECRET || ''

// Derivar llave de 32 bytes para AES-256-GCM a partir del secreto
const ENCRYPTION_KEY = crypto.createHash('sha256').update(SECRET).digest()

export async function POST(req: NextRequest) {
  try {
    if (!SECRET) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const signature = req.headers.get('x-signature')
    const timestamp = req.headers.get('x-timestamp')

    if (!signature || !timestamp) {
      return NextResponse.json({ error: 'Faltan credenciales de seguridad (Headers)' }, { status: 401 })
    }

    // 1. Prevención Anti-Replay: Validar que el timestamp esté dentro de los 5 minutos (300s)
    const now = Math.floor(Date.now() / 1000)
    const reqTime = parseInt(timestamp, 10)
    
    if (isNaN(reqTime) || Math.abs(now - reqTime) > 300) {
      return NextResponse.json({ error: 'Petición expirada o timestamp inválido (Replay Attack Prevention)' }, { status: 401 })
    }

    const rawBody = await req.text()

    // 2. Validación de Firma HMAC
    const expectedSignature = crypto
      .createHmac('sha256', SECRET)
      .update(`${timestamp}.${rawBody}`)
      .digest('hex')

    // timingSafeEqual para prevenir ataques de timing
    if (
      signature.length !== expectedSignature.length ||
      !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
    ) {
      return NextResponse.json({ error: 'Firma inválida' }, { status: 401 })
    }

    // 3. Desencriptado del Payload (AES-256-GCM)
    let parsedBody;
    try {
      parsedBody = JSON.parse(rawBody)
    } catch (e) {
      return NextResponse.json({ error: 'El cuerpo de la petición no es JSON válido' }, { status: 400 })
    }

    const { iv, authTag, ciphertext } = parsedBody

    if (!iv || !authTag || !ciphertext) {
      return NextResponse.json({ error: 'Estructura de payload encriptado inválida' }, { status: 400 })
    }

    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      ENCRYPTION_KEY,
      Buffer.from(iv, 'hex')
    )
    decipher.setAuthTag(Buffer.from(authTag, 'hex'))

    let decrypted = decipher.update(ciphertext, 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    // Parsear el payload desencriptado
    const payload = JSON.parse(decrypted)
    
    // 4. Enrutamiento a la acción correspondiente
    if (payload.type === 'text') {
      const result = await sendWhatsAppTextMessageAction(payload.data)
      return NextResponse.json(result, { status: result.success ? 200 : 400 })
    } else if (payload.type === 'template') {
      const result = await sendWhatsAppTemplateMessageAction(payload.data)
      return NextResponse.json(result, { status: result.success ? 200 : 400 })
    } else {
      return NextResponse.json({ error: 'Tipo de mensaje inválido en el payload' }, { status: 400 })
    }

  } catch (error) {
    console.error('[WhatsApp Send API] Error:', error)
    return NextResponse.json({ error: 'Error interno del servidor al procesar envío de WhatsApp' }, { status: 500 })
  }
}
