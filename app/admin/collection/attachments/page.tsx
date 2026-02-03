import { AttachmentManager } from '@/components/collection/attachments/AttachmentManager'

export default function AdjuntosPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Adjuntos</h1>
                    <p className="text-muted-foreground">
                        Biblioteca de documentos adjuntos para emails
                    </p>
                </div>
            </div>

            <AttachmentManager mode="manage" />
        </div>
    )
}
