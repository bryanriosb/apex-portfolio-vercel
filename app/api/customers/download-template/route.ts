import { createDefaultCustomersTemplateAction } from '@/lib/actions/customer-import-export'

export async function GET() {
  try {
    const result = await createDefaultCustomersTemplateAction()

    if (!result.success || !result.data) {
      console.error('Error generating template:', result.error)
      return Response.json(
        { error: result.error || 'Error al generar plantilla' },
        { status: 500 }
      )
    }

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
