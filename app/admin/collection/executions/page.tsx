import { ExecutionsList } from '@/components/collection/executions/ExecutionsList'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PlusCircle } from 'lucide-react'

export default function EjecucionesPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Ejecuciones</h1>
                    <p className="text-muted-foreground">
                        Historial de envíos masivos de correos de cobro
                    </p>
                </div>
                <Link href="/admin/collection/campaing">
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Nueva Ejecución
                    </Button>
                </Link>
            </div>

            <ExecutionsList />
        </div>
    )
}
