import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import {
  getSignatureRequestByTokenAction,
} from '@/lib/actions/signature-request'
import { getSupabaseAdminClient } from '@/lib/actions/supabase'
import { getMedicalRecordForSignatureByTokenAction } from '@/lib/actions/signature-request-simple'
import SignaturePageClient from './SignaturePageClient'

interface SignaturePageProps {
  params: Promise<{ token: string }>
}

export async function generateMetadata({
  params,
}: SignaturePageProps): Promise<Metadata> {
  const { token } = await params
  const request = await getSignatureRequestByTokenAction(token)

  if (!request) {
    return {
      title: 'Enlace no válido',
    }
  }

  return {
    title: `Firmar Historia Clínica - ${request.business_name}`,
    description: 'Firma digital de historia clínica',
  }
}

export default async function SignaturePage({ params }: SignaturePageProps) {
  const { token } = await params
  const request = await getSignatureRequestByTokenAction(token)

  if (!request) {
    notFound()
  }

  // Verificar si ya está firmado o expirado
  if (request.is_signed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-green-50 to-white p-4">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Documento Firmado</h1>
          <p className="text-gray-600">
            Este documento ya fue firmado exitosamente.
          </p>
          <p className="text-sm text-gray-500">{request.business_name}</p>
        </div>
      </div>
    )
  }

  if (request.is_expired || request.status === 'cancelled') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-red-50 to-white p-4">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Enlace Expirado</h1>
          <p className="text-gray-600">
            Este enlace de firma ha expirado o fue cancelado.
          </p>
          <p className="text-sm text-gray-500">
            Por favor contacta a {request.business_name} para solicitar un nuevo enlace.
          </p>
        </div>
      </div>
    )
  }

  // Obtener los datos del medical record
  const medicalRecord = await getMedicalRecordForSignatureByTokenAction(token)

  return (
    <SignaturePageClient
      token={token}
      request={request}
      medicalRecord={medicalRecord}
    />
  )
}
