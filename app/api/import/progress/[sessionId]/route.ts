import { NextRequest } from 'next/server'
import importService from '@/lib/services/data-templates/generic-import-service'

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params

    if (!sessionId) {
      return Response.json({ error: 'Session ID requerido' }, { status: 400 })
    }

    // Obtener progreso actual
    const progress = importService.getProgress(sessionId)

    if (!progress) {
      return Response.json({ error: 'Sesión no encontrada' }, { status: 404 })
    }

    // Sanitizar y devolver progreso actual
    const sanitizedProgress = importService.sanitizeProgress(progress)
    return Response.json(sanitizedProgress)
  } catch (error) {
    console.error('Error in progress GET route:', error)
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// Endpoint POST como respaldo (opcional)
export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  // Reutilizar la lógica del GET
  return GET(request, { params })
}