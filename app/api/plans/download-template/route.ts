import { createDefaultPlansTemplateAction } from '@/lib/actions/plan-import-export'

export async function GET() {
  try {
    // Generar la plantilla usando la función existente
    const result = await createDefaultPlansTemplateAction()

    if (!result.success || !result.data) {
      console.error('Error generating template:', result.error)
      return Response.json(
        { error: result.error || 'Error al generar plantilla' },
        { status: 500 }
      )
    }

    // Devolver el archivo Excel con headers apropiados
    return new Response(new Uint8Array(result.data), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${result.filename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })
  } catch (error: any) {
    console.error('Error in download template API route:', error)
    return Response.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}