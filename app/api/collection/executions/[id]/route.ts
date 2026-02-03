import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params

        if (!id) {
            return NextResponse.json(
                { error: 'ID de ejecución no proporcionado' },
                { status: 400 }
            )
        }

        // Importar dinámicamente para evitar problemas de TypeScript
        const { deleteExecutionAction } = await import('@/lib/actions/collection/execution')
        const result = await deleteExecutionAction(id)

        if (result.success) {
            return NextResponse.json({ success: true })
        } else {
            return NextResponse.json(
                { error: result.error || 'Error al eliminar la ejecución' },
                { status: 500 }
            )
        }
    } catch (error: any) {
        console.error('Error in DELETE /api/collection/executions/[id]:', error)
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        )
    }
}