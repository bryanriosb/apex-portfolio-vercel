'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { Loader2, FileText, Calendar, User, CheckCircle } from 'lucide-react'
import SignaturePad from '@/components/signature/SignaturePad'
import { processSignatureAction } from '@/lib/actions/signature-request'
import type {
  SignatureRequestPublicData,
  SignatureRequestMedicalRecordView,
} from '@/lib/models/signature-request/signature-request'

interface SignaturePageClientProps {
  token: string
  request: SignatureRequestPublicData
  medicalRecord: SignatureRequestMedicalRecordView | null
}

const RECORD_TYPE_LABELS: Record<string, string> = {
  initial_assessment: 'Evaluación Inicial',
  follow_up: 'Seguimiento',
  procedure: 'Procedimiento',
  consultation: 'Consulta',
  pre_operative: 'Pre-operatorio',
  post_operative: 'Post-operatorio',
}

export default function SignaturePageClient({
  token,
  request,
  medicalRecord,
}: SignaturePageClientProps) {
  const router = useRouter()
  const [signatureData, setSignatureData] = useState<string | null>(null)
  const [signedByName, setSignedByName] = useState(request.customer_name)
  const [signedByDocument, setSignedByDocument] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!signatureData) {
      toast.error('Por favor dibuje su firma')
      return
    }

    if (!signedByName.trim()) {
      toast.error('Por favor ingrese su nombre completo')
      return
    }

    setIsSubmitting(true)

    try {
      const result = await processSignatureAction(
        token,
        signatureData,
        signedByName.trim(),
        signedByDocument.trim() || undefined
      )

      if (result.success) {
        setIsSuccess(true)
        toast.success('Documento firmado exitosamente')
      } else {
        toast.error(result.error || 'Error al procesar la firma')
      }
    } catch {
      toast.error('Error al procesar la firma')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-green-50 to-white p-4">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            ¡Firma Completada!
          </h1>
          <p className="text-gray-600">
            Tu historia clínica ha sido firmada exitosamente.
          </p>
          <p className="text-sm text-gray-500">
            Puedes cerrar esta ventana.
          </p>
          <div className="pt-4">
            <p className="text-xs text-gray-400">{request.business_name}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          {request.business_logo && (
            <img
              src={request.business_logo}
              alt={request.business_name}
              className="h-16 mx-auto object-contain"
            />
          )}
          <h1 className="text-2xl font-bold text-gray-900">
            {request.business_name}
          </h1>
          <p className="text-gray-600">Firma Digital de Historia Clínica</p>
        </div>

        {/* Info del documento */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Información del Documento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Paciente:</span>
              <span className="font-medium">{request.customer_name}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Fecha:</span>
              <span className="font-medium">
                {new Date(request.record_date).toLocaleDateString('es-CO', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Tipo:</span>
              <span className="font-medium">
                {RECORD_TYPE_LABELS[request.record_type] || request.record_type}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Resumen del contenido */}
        {medicalRecord && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Resumen del Documento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {medicalRecord.chief_complaint && (
                <div>
                  <p className="font-medium text-muted-foreground">
                    Motivo de consulta:
                  </p>
                  <p>{medicalRecord.chief_complaint}</p>
                </div>
              )}
              {medicalRecord.clinical_notes && (
                <div>
                  <p className="font-medium text-muted-foreground">
                    Notas clínicas:
                  </p>
                  <p className="whitespace-pre-wrap">
                    {medicalRecord.clinical_notes}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Formulario de firma */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Firma del Paciente</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre completo *</Label>
                <Input
                  id="name"
                  value={signedByName}
                  onChange={(e) => setSignedByName(e.target.value)}
                  placeholder="Ingrese su nombre completo"
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="document">
                  Número de documento (opcional)
                </Label>
                <Input
                  id="document"
                  value={signedByDocument}
                  onChange={(e) => setSignedByDocument(e.target.value)}
                  placeholder="Cédula de ciudadanía"
                  disabled={isSubmitting}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Firma *</Label>
                <SignaturePad
                  onSignatureChange={setSignatureData}
                  disabled={isSubmitting}
                  height={180}
                />
                <p className="text-xs text-muted-foreground">
                  Dibuje su firma en el recuadro usando el dedo o mouse
                </p>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
                <p>
                  Al firmar este documento, confirmo que he leído y entiendo la
                  información contenida en mi historia clínica, y que los datos
                  proporcionados son correctos.
                </p>
              </div>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isSubmitting || !signatureData}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  'Firmar Documento'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-xs text-gray-400 space-y-1">
          <p>Este enlace es personal e intransferible.</p>
          <p>
            Expira el{' '}
            {new Date(request.expires_at).toLocaleDateString('es-CO', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
      </div>
    </div>
  )
}
