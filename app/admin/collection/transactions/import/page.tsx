import { ImportWizard } from '@/components/bank-transactions/import/ImportWizard'

export default function ImportPage() {
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Importar Transacciones</h1>
      <p className="text-muted-foreground mb-8">
        Sube un archivo Excel con múltiples hojas (una por banco) para detectar
        automáticamente transacciones de clientes.
      </p>
      <div className="mt-6">
        <ImportWizard />
      </div>
    </div>
  )
}
