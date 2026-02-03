import { TemplatesList } from '@/components/collection/templates/TemplatesList'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PlusCircle } from 'lucide-react'

export default function PlantillasPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Plantillas</h1>
                    <p className="text-muted-foreground">
                        Gestiona plantillas de email y SMS reutilizables
                    </p>
                </div>
                <Link href="/admin/collection/templates/create">
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Nueva Plantilla
                    </Button>
                </Link>
            </div>

            <TemplatesList />
        </div>
    )
}
