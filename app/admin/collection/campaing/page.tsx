import { CreationWizard } from '@/components/collection/wizard'

export default function CrearPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">
                    Campaña de Cobro
                </h1>
                <p className="text-muted-foreground">
                    Sigue los pasos para configurar y enviar correos de cobro masivos
                </p>
            </div>

            <CreationWizard />
        </div>
    )
}
