import { NextRequest, NextResponse } from 'next/server'
import { generateSignatureLinkAction } from '@/lib/actions/signature-request'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { medicalRecordId, expiresDays = 7 } = body

    if (!medicalRecordId) {
      return NextResponse.json(
        { success: false, error: 'medicalRecordId es requerido' },
        { status: 400 }
      )
    }

    const result = await generateSignatureLinkAction(medicalRecordId, undefined, expiresDays)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error en generate-signature-link API:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}