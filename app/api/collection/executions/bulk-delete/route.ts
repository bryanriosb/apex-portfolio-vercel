import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
    try {
        const { ids } = await request.json()

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json(
                { error: 'IDs de ejecuciones no proporcionados' },
                { status: 400 }
            )
        }

        // Importar dinámicamente para evitar problemas de TypeScript
        const { deleteExecutionAction } = await import('@/lib/actions/collection/execution')
        
        // Delete all executions
        const results = await Promise.allSettled(
            ids.map(id => deleteExecutionAction(id))
        )

        const successful = results.filter(r => r.status === 'fulfilled').length
        const failed = results.filter(r => r.status === 'rejected').length

        if (failed > 0) {
            return NextResponse.json({
                success: true,
                message: `${successful} ejecución(es) eliminada(s) correctamente. ${failed} fallaron.`,
                successful,
                failed
            })
        }

        return NextResponse.json({ 
            success: true,
            message: `${successful} ejecución(es) eliminada(s) correctamente.`,
            successful,
            failed: 0
        })

    } catch (error: any) {
        console.error('Error in POST /api/collection/executions/bulk-delete:', error)
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        )
    }
}